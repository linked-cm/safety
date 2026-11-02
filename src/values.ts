/**
 * The closed value sets of safety's literal properties (`targetKind`, `reasonCode`,
 * `reportStatus`, `resolution`, `restrictionScope`, `restrictionStatus`, `restrictionSource`),
 * their types, and the mapping of known aliases onto them.
 */
export const REPORT_TARGET_KINDS = [
  'post',
  'comment',
  'person',
  'media',
  'story',
  'team',
  'message',
  'other',
] as const;
export const REPORT_REASONS = [
  'spam',
  'harassment',
  'hateSpeech',
  'violence',
  'sexualContent',
  'childSafety',
  'misinformation',
  'impersonation',
  'personalInformation',
  'other',
] as const;
export const REPORT_STATUSES = [
  'open',
  'reviewing',
  'actioned',
  'dismissed',
] as const;
export const REPORT_RESOLUTIONS = [
  'removed',
  'warned',
  'restricted',
  'banned',
  'noAction',
] as const;
export const RESTRICTION_SCOPES = ['messaging', 'account'] as const;
export const RESTRICTION_STATUSES = ['active', 'lifted'] as const;
export const RESTRICTION_SOURCES = [
  'automatedScan',
  'moderator',
  'userReport',
  'system',
] as const;

export type ReportTargetKind = (typeof REPORT_TARGET_KINDS)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportResolution = (typeof REPORT_RESOLUTIONS)[number];
export type RestrictionScope = (typeof RESTRICTION_SCOPES)[number];
export type RestrictionStatus = (typeof RESTRICTION_STATUSES)[number];
export type RestrictionSource = (typeof RESTRICTION_SOURCES)[number];

/** Convert known legacy/product aliases while preserving the closed canonical vocabulary. */
export function canonicalReportReason(value: string): ReportReason {
  if (value === 'nudity') return 'sexualContent';
  if (value === 'csam') return 'childSafety';
  return (REPORT_REASONS as readonly string[]).includes(value)
    ? (value as ReportReason)
    : 'other';
}
