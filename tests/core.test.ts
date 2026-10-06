import { describe, expect, it } from 'vitest';
import { computeSafetySets } from '../src/core.js';
import { canonicalReportReason } from '../src/ontologies/safety.js';

describe('portable safety visibility', () => {
  const rows = {
    blocks: [
      { blockedBy: { id: 'a' }, blocked: { id: 'b' }, active: true },
      { blockedBy: { id: 'c' }, blocked: { id: 'a' }, active: true },
      { blockedBy: { id: 'a' }, blocked: { id: 'old' }, active: false },
    ],
    mutes: [
      { mutedBy: { id: 'a' }, muted: { id: 'd' }, active: true },
      { mutedBy: { id: 'a' }, muted: { id: 'expired' }, active: true, until: '2026-01-01T00:00:00.000Z' },
      { mutedBy: { id: 'someone-else' }, muted: { id: 'a' }, active: true },
    ],
    reports: [
      { reportedBy: { id: 'a' }, target: { id: 'message:mine' }, reasonCode: 'spam', reportStatus: 'open' },
      { reportedBy: { id: 'z' }, target: { id: 'message:removed' }, reasonCode: 'spam', reportStatus: 'actioned', resolution: 'removed' },
      { reportedBy: { id: 'z' }, target: { id: 'message:child' }, reasonCode: 'childSafety', reportStatus: 'reviewing' },
      { reportedBy: { id: 'z' }, target: { id: 'message:legacy-child' }, reasonCode: 'csam', reportStatus: 'open' },
    ],
    contentMutes: [
      { mutedBy: { id: 'a' }, label: 'distressing', active: true },
      { mutedBy: { id: 'a' }, label: 'old', active: false },
    ],
  };

  it('applies bilateral blocks, one-way/expiring mutes, and report visibility in one choke point', () => {
    const sets = computeSafetySets(rows, 'a', Date.parse('2026-10-06T00:00:00.000Z'));
    expect([...sets.blocked].sort()).toEqual(['b', 'c']);
    expect([...sets.mutedSubjects]).toEqual(['d']);
    expect([...sets.reportedByViewer]).toEqual(['message:mine']);
    expect([...sets.removed].sort()).toEqual(['message:child', 'message:legacy-child', 'message:removed']);
    expect([...sets.mutedLabels]).toEqual(['distressing']);
  });

  it('does not leak viewer-specific block/mute state to a signed-out read', () => {
    const sets = computeSafetySets(rows, null);
    expect(sets.blocked.size).toBe(0);
    expect(sets.mutedSubjects.size).toBe(0);
    expect(sets.reportedByViewer.size).toBe(0);
    expect(sets.removed.has('message:removed')).toBe(true);
  });

  it('normalizes legacy Serve reason codes during migration', () => {
    expect(canonicalReportReason('nudity')).toBe('sexualContent');
    expect(canonicalReportReason('csam')).toBe('childSafety');
    expect(canonicalReportReason('unexpected')).toBe('other');
  });
});
