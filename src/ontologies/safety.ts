import { createNameSpace } from '@_linked/core/utils/NameSpace';

export const ns = createNameSpace('https://id.linked.cm/safety/');
export const _self = ns('');

export const SafetyReport = ns('SafetyReport');
export const SafetyBlock = ns('SafetyBlock');
export const SafetyMute = ns('SafetyMute');
export const ContentMute = ns('ContentMute');

export const reportedBy = ns('reportedBy');
export const reportTarget = ns('reportTarget');
export const targetKind = ns('targetKind');
export const reasonCode = ns('reasonCode');
export const inPersonIncident = ns('inPersonIncident');
export const reportDetail = ns('reportDetail');
export const createdAt = ns('createdAt');
export const reportStatus = ns('reportStatus');
export const resolvedBy = ns('resolvedBy');
export const resolvedAt = ns('resolvedAt');
export const resolution = ns('resolution');
export const legalHold = ns('legalHold');

export const blockedBy = ns('blockedBy');
export const blockedSubject = ns('blockedSubject');
export const blockActive = ns('blockActive');
/** Private host matching/scheduling constraint; never disclosed to the blocked subject. */
export const avoidFutureInteraction = ns('avoidFutureInteraction');

export const mutedBy = ns('mutedBy');
export const mutedSubject = ns('mutedSubject');
export const muteUntil = ns('muteUntil');
export const muteActive = ns('muteActive');

export const mutedLabel = ns('mutedLabel');

export const REPORT_TARGET_KINDS = [
  'post', 'comment', 'person', 'media', 'story', 'team', 'message', 'other',
] as const;
export const REPORT_REASONS = [
  'spam', 'harassment', 'hateSpeech', 'violence', 'sexualContent', 'childSafety',
  'misinformation', 'impersonation', 'personalInformation', 'other',
] as const;
export const REPORT_STATUSES = ['open', 'reviewing', 'actioned', 'dismissed'] as const;
export const REPORT_RESOLUTIONS = ['removed', 'warned', 'restricted', 'banned', 'noAction'] as const;

export type ReportTargetKind = (typeof REPORT_TARGET_KINDS)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportResolution = (typeof REPORT_RESOLUTIONS)[number];

/** Convert known legacy/product aliases while preserving the closed canonical vocabulary. */
export function canonicalReportReason(value: string): ReportReason {
  if (value === 'nudity') return 'sexualContent';
  if (value === 'csam') return 'childSafety';
  return (REPORT_REASONS as readonly string[]).includes(value)
    ? (value as ReportReason)
    : 'other';
}
