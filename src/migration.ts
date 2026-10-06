import { canonicalReportReason, type ReportResolution, type ReportStatus, type ReportTargetKind } from './ontologies/safety.js';
import { ContentMuteShape, SafetyBlockShape, SafetyMuteShape, SafetyReportShape } from './shapes.js';
import { idOf } from './core.js';

/** Plain-row input lets a host migrate from any legacy ontology without importing it here. */
export interface LegacySafetySnapshot {
  reports?: Array<{
    reportedBy: unknown;
    target: unknown;
    targetKind: string;
    reasonCode: string;
    inPersonIncident?: boolean;
    detail?: string;
    createdAt?: string;
    reportStatus?: string;
    resolvedBy?: unknown;
    resolvedAt?: string;
    resolution?: string;
    legalHold?: boolean;
  }>;
  blocks?: Array<{
    blockedBy: unknown;
    blocked: unknown;
    createdAt?: string;
    active?: boolean;
    avoidFuture?: boolean;
  }>;
  mutes?: Array<{
    mutedBy: unknown;
    muted: unknown;
    createdAt?: string;
    until?: string;
    active?: boolean;
  }>;
  contentMutes?: Array<{ mutedBy: unknown; label: string; createdAt?: string; active?: boolean }>;
}

export interface MigrationCounts {
  reports: number;
  blocks: number;
  mutes: number;
  contentMutes: number;
  skipped: number;
}

const key = (...parts: unknown[]) => parts.map((part) => idOf(part) || String(part ?? '')).join('\u0000');
const UNKNOWN_CREATED_AT = '1970-01-01T00:00:00.000Z';
const migrationCreatedAt = (value?: string): string => value || UNKNOWN_CREATED_AT;

/**
 * Idempotently copies legacy rows into the shared ontology. The legacy data is never
 * deleted; hosts can deploy dual-read, verify counts, then retire old shapes separately.
 */
export async function migrateLegacySafetySnapshot(snapshot: LegacySafetySnapshot): Promise<MigrationCounts> {
  const counts: MigrationCounts = { reports: 0, blocks: 0, mutes: 0, contentMutes: 0, skipped: 0 };
  const [reports, blocks, mutes, contentMutes] = await Promise.all([
    SafetyReportShape.select((row) => [row.reportedBy, row.target, row.createdAt]) as Promise<any[]>,
    SafetyBlockShape.select((row) => [row.blockedBy, row.blocked, row.createdAt]) as Promise<any[]>,
    SafetyMuteShape.select((row) => [row.mutedBy, row.muted, row.createdAt]) as Promise<any[]>,
    ContentMuteShape.select((row) => [row.mutedBy, row.label]) as Promise<any[]>,
  ]);
  const reportKeys = new Set(reports.map((row) => key(row.reportedBy, row.target, row.createdAt)));
  const blockKeys = new Set(blocks.map((row) => key(row.blockedBy, row.blocked, row.createdAt)));
  const muteKeys = new Set(mutes.map((row) => key(row.mutedBy, row.muted, row.createdAt)));
  const contentMuteKeys = new Set(contentMutes.map((row) => key(row.mutedBy, row.label)));

  for (const row of snapshot.reports ?? []) {
    const reporterId = idOf(row.reportedBy);
    const targetId = idOf(row.target);
    if (!reporterId || !targetId) { counts.skipped += 1; continue; }
    // A stable fallback is required for rerun safety. Using the current time here
    // would create a fresh record on every migration run for undated legacy rows.
    const createdAt = migrationCreatedAt(row.createdAt);
    const dedupe = key(reporterId, targetId, createdAt);
    if (reportKeys.has(dedupe)) { counts.skipped += 1; continue; }
    const reason = canonicalReportReason(row.reasonCode);
    await SafetyReportShape.create({
      reportedBy: { id: reporterId },
      target: { id: targetId },
      targetKind: (row.targetKind || 'other') as ReportTargetKind,
      reasonCode: reason,
      ...(row.inPersonIncident ? { inPersonIncident: true } : {}),
      ...(row.detail?.trim() ? { detail: row.detail.trim() } : {}),
      createdAt,
      reportStatus: (row.reportStatus || 'open') as ReportStatus,
      ...(row.resolvedBy ? { resolvedBy: { id: idOf(row.resolvedBy) } } : {}),
      ...(row.resolvedAt ? { resolvedAt: row.resolvedAt } : {}),
      ...(row.resolution ? { resolution: row.resolution as ReportResolution } : {}),
      ...(row.legalHold || reason === 'childSafety' ? { legalHold: true } : {}),
    } as any);
    reportKeys.add(dedupe);
    counts.reports += 1;
  }

  for (const row of snapshot.blocks ?? []) {
    const blockerId = idOf(row.blockedBy);
    const blockedId = idOf(row.blocked);
    if (!blockerId || !blockedId) { counts.skipped += 1; continue; }
    const createdAt = migrationCreatedAt(row.createdAt);
    const dedupe = key(blockerId, blockedId, createdAt);
    if (blockKeys.has(dedupe)) { counts.skipped += 1; continue; }
    await SafetyBlockShape.create({
      blockedBy: { id: blockerId }, blocked: { id: blockedId }, createdAt,
      active: row.active !== false,
      ...(row.avoidFuture ? { avoidFutureInteraction: true } : {}),
    } as any);
    blockKeys.add(dedupe);
    counts.blocks += 1;
  }

  for (const row of snapshot.mutes ?? []) {
    const viewerId = idOf(row.mutedBy);
    const subjectId = idOf(row.muted);
    if (!viewerId || !subjectId) { counts.skipped += 1; continue; }
    const createdAt = migrationCreatedAt(row.createdAt);
    const dedupe = key(viewerId, subjectId, createdAt);
    if (muteKeys.has(dedupe)) { counts.skipped += 1; continue; }
    await SafetyMuteShape.create({
      mutedBy: { id: viewerId }, muted: { id: subjectId }, createdAt,
      active: row.active !== false,
      ...(row.until ? { until: row.until } : {}),
    } as any);
    muteKeys.add(dedupe);
    counts.mutes += 1;
  }

  for (const row of snapshot.contentMutes ?? []) {
    const viewerId = idOf(row.mutedBy);
    if (!viewerId || !row.label) { counts.skipped += 1; continue; }
    const dedupe = key(viewerId, row.label);
    if (contentMuteKeys.has(dedupe)) { counts.skipped += 1; continue; }
    await ContentMuteShape.create({
      mutedBy: { id: viewerId }, label: row.label,
      createdAt: migrationCreatedAt(row.createdAt), active: row.active !== false,
    } as any);
    contentMuteKeys.add(dedupe);
    counts.contentMutes += 1;
  }

  return counts;
}
