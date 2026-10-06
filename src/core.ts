import type { Shape } from '@_linked/core/shapes/Shape';
// JavaScript hosts and legacy adapters can still send old aliases, so the
// core enforces the canonical vocabulary instead of relying on TS alone.
import {
  ContentMuteShape,
  SafetyBlockShape,
  SafetyMuteShape,
  SafetyReportShape,
} from './shapes.js';
import {
  canonicalReportReason,
  type ReportReason,
  type ReportResolution,
  type ReportStatus,
  type ReportTargetKind,
} from './ontologies/safety.js';

export const idOf = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return idOf(value[0]);
  const record = value as Record<string, unknown>;
  return String(record.id ?? record.uri ?? record.value ?? '');
};

export interface SafetySets {
  /** Subjects hidden in both directions when either party initiated a block. */
  blocked: Set<string>;
  /** Subjects hidden only for this viewer. */
  mutedSubjects: Set<string>;
  /** Targets removed by moderation or held by an unresolved child-safety report. */
  removed: Set<string>;
  /** Targets the viewer reported, hidden immediately for that viewer. */
  reportedByViewer: Set<string>;
  /** Host-defined content labels the viewer chose not to see. */
  mutedLabels: Set<string>;
}

export interface SafetyRows {
  blocks: Array<{ blockedBy?: unknown; blocked?: unknown; active?: boolean }>;
  mutes: Array<{ mutedBy?: unknown; muted?: unknown; active?: boolean; until?: string }>;
  reports: Array<{
    reportedBy?: unknown;
    target?: unknown;
    reasonCode?: string;
    reportStatus?: string;
    resolution?: string;
  }>;
  contentMutes: Array<{ mutedBy?: unknown; label?: string; active?: boolean }>;
}

/** Pure resolver choke-point. Every host surface should use this same result. */
export function computeSafetySets(
  rows: SafetyRows,
  viewerId?: string | null,
  now = Date.now(),
): SafetySets {
  const blocked = new Set<string>();
  const mutedSubjects = new Set<string>();
  const removed = new Set<string>();
  const reportedByViewer = new Set<string>();
  const mutedLabels = new Set<string>();

  if (viewerId) {
    for (const block of rows.blocks) {
      if (block.active === false) continue;
      const by = idOf(block.blockedBy);
      const target = idOf(block.blocked);
      if (by === viewerId && target) blocked.add(target);
      if (target === viewerId && by) blocked.add(by);
    }
    for (const mute of rows.mutes) {
      if (mute.active === false || idOf(mute.mutedBy) !== viewerId) continue;
      if (mute.until && Date.parse(mute.until) <= now) continue;
      const target = idOf(mute.muted);
      if (target) mutedSubjects.add(target);
    }
    for (const mute of rows.contentMutes) {
      if (mute.active === false || idOf(mute.mutedBy) !== viewerId) continue;
      if (mute.label) mutedLabels.add(String(mute.label));
    }
  }

  for (const report of rows.reports) {
    const target = idOf(report.target);
    if (!target) continue;
    if (report.resolution === 'removed') removed.add(target);
    if (
      (report.reasonCode === 'childSafety' || report.reasonCode === 'csam') &&
      (report.reportStatus === 'open' || report.reportStatus === 'reviewing')
    ) {
      removed.add(target);
    }
    if (viewerId && idOf(report.reportedBy) === viewerId) {
      reportedByViewer.add(target);
    }
  }

  return { blocked, mutedSubjects, removed, reportedByViewer, mutedLabels };
}

/** Reads the generic RDF models and returns the visibility sets for a viewer. */
export async function selectSafetySets(
  viewerId?: string | null,
  now = Date.now(),
): Promise<SafetySets> {
  const [blocks, mutes, reports, contentMutes] = await Promise.all([
    SafetyBlockShape.select((block) => [block.blockedBy, block.blocked, block.active]) as Promise<SafetyRows['blocks']>,
    SafetyMuteShape.select((mute) => [mute.mutedBy, mute.muted, mute.active, mute.until]) as Promise<SafetyRows['mutes']>,
    SafetyReportShape.select((report) => [
      report.reportedBy,
      report.target,
      report.reasonCode,
      report.reportStatus,
      report.resolution,
    ]) as Promise<SafetyRows['reports']>,
    ContentMuteShape.select((mute) => [mute.mutedBy, mute.label, mute.active]) as Promise<SafetyRows['contentMutes']>,
  ]);
  return computeSafetySets({ blocks, mutes, reports, contentMutes }, viewerId, now);
}

export const isMutedContent = (labels: unknown, sets: Pick<SafetySets, 'mutedLabels'>): boolean => {
  const values = Array.isArray(labels) ? labels : labels ? [labels] : [];
  return values.some((label) => sets.mutedLabels.has(String(label)));
};

export interface SafetyReportInput {
  reporterId: string;
  targetId: string;
  targetKind: ReportTargetKind;
  reason: ReportReason;
  inPersonIncident?: boolean;
  detail?: string;
}

export interface SafetyHooks {
  /** Immediately quarantine or unpublish the target. Required for a host to claim that behavior. */
  quarantineTarget?: (input: SafetyReportInput & { reportId: string }) => void | Promise<void>;
  /** Notify a private, authorized review lane. Never expose reporter identity to the target. */
  notifyReviewQueue?: (input: SafetyReportInput & { reportId: string }) => void | Promise<void>;
  /** End friendships, pending requests, or discovery links after the RDF block lands. */
  afterBlock?: (input: { blockerId: string; blockedId: string; blockId: string }) => void | Promise<void>;
  /** Repeated blocks can raise a host-owned account review signal. */
  repeatedBlockSignal?: (input: { blockedId: string; distinctBlockers: number }) => void | Promise<void>;
  repeatedBlockThreshold?: number;
  /** Apply the host's actual content deletion/tombstone operation after a moderation decision. */
  removeTarget?: (input: { targetId: string; reportId: string }) => void | Promise<void>;
}

export async function createReport(
  input: SafetyReportInput,
  hooks: SafetyHooks = {},
): Promise<string> {
  const normalizedInput = {
    ...input,
    reason: canonicalReportReason(input.reason),
  };
  const childSafety = normalizedInput.reason === 'childSafety';
  const report = await SafetyReportShape.create({
    reportedBy: { id: normalizedInput.reporterId },
    target: { id: normalizedInput.targetId },
    targetKind: normalizedInput.targetKind,
    reasonCode: normalizedInput.reason,
    ...(normalizedInput.inPersonIncident ? { inPersonIncident: true } : {}),
    ...(normalizedInput.detail?.trim() ? { detail: normalizedInput.detail.trim() } : {}),
    createdAt: new Date().toISOString(),
    reportStatus: 'open',
    ...(childSafety ? { legalHold: true } : {}),
  } as any);
  const reportId = report.id;
  if (childSafety) await hooks.quarantineTarget?.({ ...normalizedInput, reportId });
  await hooks.notifyReviewQueue?.({ ...normalizedInput, reportId });
  return reportId;
}

export async function updateReportStatus(input: {
  reportId: string;
  status: ReportStatus;
  resolvedById?: string;
  resolution?: ReportResolution;
}, hooks: Pick<SafetyHooks, 'removeTarget'> = {}): Promise<void> {
  const existing = await SafetyReportShape.select((report) => [report.target, report.legalHold])
    .where((report) => report.equals({ id: input.reportId }))
    .one();
  if (!existing) throw new Error('report_not_found');
  if (input.resolution === 'removed') {
    if (!hooks.removeTarget) throw new Error('remove_target_not_configured');
    await hooks.removeTarget({ targetId: idOf(existing.target), reportId: input.reportId });
  }
  await SafetyReportShape.update({
    reportStatus: input.status,
    ...(input.resolvedById ? { resolvedBy: { id: input.resolvedById } } : {}),
    ...(input.resolution ? { resolution: input.resolution } : {}),
    ...(['actioned', 'dismissed'].includes(input.status) ? { resolvedAt: new Date().toISOString() } : {}),
  } as any).for({ id: input.reportId });
}

async function activeBlock(blockerId: string, blockedId: string): Promise<any | undefined> {
  const blocks = await SafetyBlockShape.select((block) => [block.blockedBy, block.blocked, block.active]) as any[];
  return blocks.find(
    (block) => block.active !== false && idOf(block.blockedBy) === blockerId && idOf(block.blocked) === blockedId,
  );
}

export async function createBlock(
  blockerId: string,
  blockedId: string,
  hooks: SafetyHooks = {},
): Promise<string> {
  if (!blockerId || !blockedId || blockerId === blockedId) throw new Error('invalid_block');
  const existing = await activeBlock(blockerId, blockedId);
  if (existing) return idOf(existing);
  const block = await SafetyBlockShape.create({
    blockedBy: { id: blockerId },
    blocked: { id: blockedId },
    createdAt: new Date().toISOString(),
    active: true,
  } as any);
  await hooks.afterBlock?.({ blockerId, blockedId, blockId: block.id });

  if (hooks.repeatedBlockSignal) {
    const blocks = await SafetyBlockShape.select((entry) => [entry.blockedBy, entry.blocked]) as any[];
    const distinctBlockers = new Set(
      blocks.filter((entry) => idOf(entry.blocked) === blockedId).map((entry) => idOf(entry.blockedBy)).filter(Boolean),
    ).size;
    if (distinctBlockers >= (hooks.repeatedBlockThreshold ?? 3)) {
      await hooks.repeatedBlockSignal({ blockedId, distinctBlockers });
    }
  }
  return block.id;
}

export async function unblock(blockId: string): Promise<void> {
  await SafetyBlockShape.update({ active: false } as any).for({ id: blockId });
}

/** Host-private matching/scheduling preference stored with the block, but not acted on here. */
export async function setAvoidFutureInteraction(blockId: string, value: boolean): Promise<void> {
  await SafetyBlockShape.update({ avoidFutureInteraction: value } as any).for({ id: blockId });
}

export async function muteSubject(
  viewerId: string,
  subjectId: string,
  options: { days?: number; until?: Date } = {},
): Promise<string> {
  if (!viewerId || !subjectId || viewerId === subjectId) throw new Error('invalid_mute');
  const until = options.until ?? (options.days ? new Date(Date.now() + options.days * 86_400_000) : undefined);
  const mute = await SafetyMuteShape.create({
    mutedBy: { id: viewerId },
    muted: { id: subjectId },
    createdAt: new Date().toISOString(),
    ...(until ? { until: until.toISOString() } : {}),
    active: true,
  } as any);
  return mute.id;
}

export async function unmuteSubject(muteId: string): Promise<void> {
  await SafetyMuteShape.update({ active: false } as any).for({ id: muteId });
}

export async function muteContentLabel(viewerId: string, label: string): Promise<string> {
  if (!viewerId || !label.trim()) throw new Error('invalid_content_mute');
  const existing = await ContentMuteShape.select((mute) => [mute.mutedBy, mute.label, mute.active]) as any[];
  const active = existing.find(
    (mute) => mute.active !== false && idOf(mute.mutedBy) === viewerId && mute.label === label,
  );
  if (active) return idOf(active);
  const mute = await ContentMuteShape.create({
    mutedBy: { id: viewerId },
    label,
    createdAt: new Date().toISOString(),
    active: true,
  } as any);
  return mute.id;
}

export async function unmuteContentLabel(muteId: string): Promise<void> {
  await ContentMuteShape.update({ active: false } as any).for({ id: muteId });
}

export interface SafetyListItem {
  id: string;
  subjectId?: string;
  targetId?: string;
  targetKind?: string;
  reason?: string;
  status?: string;
  resolution?: string;
  label?: string;
  until?: string;
  createdAt?: string;
  avoidFutureInteraction?: boolean;
}

export interface SafetyModerationReport {
  id: string;
  reporterId: string;
  targetId: string;
  targetKind: ReportTargetKind;
  reason: ReportReason;
  status: ReportStatus;
  detail?: string;
  inPersonIncident?: boolean;
  legalHold?: boolean;
  createdAt?: string;
  resolvedAt?: string;
  resolvedById?: string;
  resolution?: ReportResolution;
}

export interface ListSafetyReportsOptions {
  statuses?: ReportStatus[];
  limit?: number;
}

type SafetyModerationRow = {
  id?: unknown;
  uri?: unknown;
  reportedBy?: unknown;
  target?: unknown;
  targetKind?: string;
  reasonCode?: string;
  reportStatus?: string;
  detail?: string;
  inPersonIncident?: boolean;
  legalHold?: boolean;
  createdAt?: string;
  resolvedAt?: string;
  resolvedBy?: unknown;
  resolution?: string;
};

/** Pure projection used by hosts and tests; it never resolves product identities. */
export function normalizeSafetyReports(
  rows: SafetyModerationRow[],
  options: ListSafetyReportsOptions = {},
): SafetyModerationReport[] {
  const statuses = options.statuses?.length ? new Set(options.statuses) : null;
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 100), 1), 500);

  return rows
    .map((row): SafetyModerationReport | null => {
      const id = idOf(row);
      const reporterId = idOf(row.reportedBy);
      const targetId = idOf(row.target);
      const status = row.reportStatus as ReportStatus;
      if (!id || !reporterId || !targetId || !status) return null;
      if (statuses && !statuses.has(status)) return null;
      return {
        id,
        reporterId,
        targetId,
        targetKind: row.targetKind as ReportTargetKind,
        reason: row.reasonCode as ReportReason,
        status,
        ...(row.detail ? { detail: row.detail } : {}),
        ...(row.inPersonIncident ? { inPersonIncident: true } : {}),
        ...(row.legalHold ? { legalHold: true } : {}),
        ...(row.createdAt ? { createdAt: row.createdAt } : {}),
        ...(row.resolvedAt ? { resolvedAt: row.resolvedAt } : {}),
        ...(idOf(row.resolvedBy) ? { resolvedById: idOf(row.resolvedBy) } : {}),
        ...(row.resolution ? { resolution: row.resolution as ReportResolution } : {}),
      };
    })
    .filter((report): report is SafetyModerationReport => Boolean(report))
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
    .slice(0, limit);
}

/**
 * Framework-neutral moderation read. Authorization remains the host's
 * responsibility; never expose this directly to an untrusted client.
 */
export async function listSafetyReports(
  options: ListSafetyReportsOptions = {},
): Promise<SafetyModerationReport[]> {
  const reports = await SafetyReportShape.select((report) => [
    report.reportedBy,
    report.target,
    report.targetKind,
    report.reasonCode,
    report.reportStatus,
    report.detail,
    report.inPersonIncident,
    report.legalHold,
    report.createdAt,
    report.resolvedAt,
    report.resolvedBy,
    report.resolution,
  ]) as unknown as SafetyModerationRow[];
  return normalizeSafetyReports(reports, options);
}

/** Framework-neutral Settings → Safety read; a host UI resolves names/images separately. */
export async function listViewerSafety(viewerId: string, now = Date.now()): Promise<{
  blocks: SafetyListItem[];
  mutes: SafetyListItem[];
  reports: SafetyListItem[];
  contentMutes: SafetyListItem[];
}> {
  const [blocks, mutes, reports, contentMutes] = await Promise.all([
    SafetyBlockShape.select((item) => [item.blockedBy, item.blocked, item.active, item.avoidFutureInteraction, item.createdAt]) as Promise<any[]>,
    SafetyMuteShape.select((item) => [item.mutedBy, item.muted, item.active, item.until, item.createdAt]) as Promise<any[]>,
    SafetyReportShape.select((item) => [item.reportedBy, item.target, item.targetKind, item.reasonCode, item.reportStatus, item.resolution, item.createdAt]) as Promise<any[]>,
    ContentMuteShape.select((item) => [item.mutedBy, item.label, item.active, item.createdAt]) as Promise<any[]>,
  ]);
  return {
    blocks: blocks.filter((item) => idOf(item.blockedBy) === viewerId && item.active !== false).map((item) => ({
      id: idOf(item), subjectId: idOf(item.blocked), createdAt: item.createdAt,
      ...(item.avoidFutureInteraction ? { avoidFutureInteraction: true } : {}),
    })),
    mutes: mutes.filter((item) => idOf(item.mutedBy) === viewerId && item.active !== false && !(item.until && Date.parse(item.until) <= now)).map((item) => ({
      id: idOf(item), subjectId: idOf(item.muted), until: item.until, createdAt: item.createdAt,
    })),
    reports: reports.filter((item) => idOf(item.reportedBy) === viewerId).map((item) => ({
      id: idOf(item), targetId: idOf(item.target), targetKind: item.targetKind,
      reason: item.reasonCode, status: item.reportStatus, resolution: item.resolution, createdAt: item.createdAt,
    })),
    contentMutes: contentMutes.filter((item) => idOf(item.mutedBy) === viewerId && item.active !== false).map((item) => ({
      id: idOf(item), label: item.label, createdAt: item.createdAt,
    })),
  };
}

/** Adapter for custom UI layers that already have subject/message objects. */
export function safetyControllerFor(input: {
  viewerId: string;
  targetId: (value: unknown) => string;
  hooks?: SafetyHooks;
}) {
  return {
    report: (value: unknown, report: Omit<SafetyReportInput, 'reporterId' | 'targetId'>) =>
      createReport({ ...report, reporterId: input.viewerId, targetId: input.targetId(value) }, input.hooks),
    block: (subject: unknown) => createBlock(input.viewerId, input.targetId(subject), input.hooks),
    mute: (subject: unknown, options?: { days?: number; until?: Date }) =>
      muteSubject(input.viewerId, input.targetId(subject), options),
  };
}

export type SafetySubject = Shape | string | { id: string };
