import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  computeSafetySets,
  activeSafetyRestrictions,
  normalizeSafetyReports,
  updateReportStatus,
} from '../src/core.js';
import { canonicalReportReason } from '../src/ontologies/safety.js';
import { SafetyReportShape } from '../src/shapes/SafetyReport.js';

describe('portable safety visibility', () => {
  afterEach(() => vi.restoreAllMocks());
  const rows = {
    blocks: [
      { blockedBy: { id: 'a' }, blocked: { id: 'b' }, active: true },
      { blockedBy: { id: 'c' }, blocked: { id: 'a' }, active: true },
      { blockedBy: { id: 'a' }, blocked: { id: 'old' }, active: false },
    ],
    mutes: [
      { mutedBy: { id: 'a' }, muted: { id: 'd' }, active: true },
      {
        mutedBy: { id: 'a' },
        muted: { id: 'expired' },
        active: true,
        until: '2026-01-01T00:00:00.000Z',
      },
      { mutedBy: { id: 'someone-else' }, muted: { id: 'a' }, active: true },
    ],
    reports: [
      {
        reportedBy: { id: 'a' },
        target: { id: 'message:mine' },
        reasonCode: 'spam',
        reportStatus: 'open',
      },
      {
        reportedBy: { id: 'z' },
        target: { id: 'message:removed' },
        reasonCode: 'spam',
        reportStatus: 'actioned',
        resolution: 'removed',
      },
      {
        reportedBy: { id: 'z' },
        target: { id: 'message:child' },
        reasonCode: 'childSafety',
        reportStatus: 'reviewing',
      },
      {
        reportedBy: { id: 'z' },
        target: { id: 'message:legacy-child' },
        reasonCode: 'csam',
        reportStatus: 'open',
      },
    ],
    contentMutes: [
      { mutedBy: { id: 'a' }, label: 'distressing', active: true },
      { mutedBy: { id: 'a' }, label: 'old', active: false },
    ],
  };

  it('applies bilateral blocks, one-way/expiring mutes, and report visibility in one choke point', () => {
    const sets = computeSafetySets(
      rows,
      'a',
      Date.parse('2026-10-06T00:00:00.000Z')
    );
    expect([...sets.blocked].sort()).toEqual(['b', 'c']);
    expect([...sets.mutedSubjects]).toEqual(['d']);
    expect([...sets.reportedByViewer]).toEqual(['message:mine']);
    expect([...sets.removed].sort()).toEqual([
      'message:child',
      'message:legacy-child',
      'message:removed',
    ]);
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

  it('projects a bounded, newest-first moderation queue without resolving host identities', () => {
    const reports = normalizeSafetyReports(
      [
        {
          id: 'report:older',
          reportedBy: { id: 'person:a' },
          target: { id: 'message:older' },
          targetKind: 'message',
          reasonCode: 'spam',
          reportStatus: 'open',
          createdAt: '2026-10-05T00:00:00.000Z',
        },
        {
          id: 'report:newer',
          reportedBy: { id: 'person:b' },
          target: { id: 'message:newer' },
          targetKind: 'message',
          reasonCode: 'childSafety',
          reportStatus: 'reviewing',
          legalHold: true,
          inPersonIncident: true,
          detail: 'Private reviewer context',
          createdAt: '2026-10-06T00:00:00.000Z',
        },
        {
          id: 'report:closed',
          reportedBy: { id: 'person:c' },
          target: { id: 'message:closed' },
          targetKind: 'message',
          reasonCode: 'other',
          reportStatus: 'dismissed',
          createdAt: '2026-10-07T00:00:00.000Z',
        },
      ],
      { statuses: ['open', 'reviewing'], limit: 2 }
    );

    expect(reports.map((report) => report.id)).toEqual([
      'report:newer',
      'report:older',
    ]);
    expect(reports[0]).toMatchObject({
      reporterId: 'person:b',
      targetId: 'message:newer',
      reason: 'childSafety',
      legalHold: true,
      inPersonIncident: true,
    });
  });

  it('never records a removed resolution before the host removal succeeds', async () => {
    vi.spyOn(SafetyReportShape, 'select').mockReturnValue({
      where: () => ({ one: async () => ({ target: { id: 'message:1' } }) }),
    } as any);
    const updateFor = vi.fn();
    vi.spyOn(SafetyReportShape, 'update').mockReturnValue({
      for: updateFor,
    } as any);

    await expect(
      updateReportStatus({
        reportId: 'report:1',
        status: 'actioned',
        resolution: 'removed',
      })
    ).rejects.toThrow('remove_target_not_configured');
    expect(updateFor).not.toHaveBeenCalled();

    const effects: string[] = [];
    updateFor.mockImplementation(async () => effects.push('status-updated'));
    await updateReportStatus(
      {
        reportId: 'report:1',
        status: 'actioned',
        resolution: 'removed',
      },
      {
        removeTarget: async () => {
          effects.push('target-removed');
        },
      }
    );
    expect(effects).toEqual(['target-removed', 'status-updated']);
  });

  it('returns only active, unexpired restrictions for the requested subject', () => {
    expect(
      activeSafetyRestrictions(
        [
          {
            id: 'restriction:1',
            restrictedSubject: { id: 'person:a' },
            scope: 'account',
            status: 'active',
            reasonCode: 'childSafety',
            restrictionSource: 'automatedScan',
          },
          {
            id: 'restriction:2',
            restrictedSubject: { id: 'person:a' },
            scope: 'messaging',
            status: 'lifted',
            reasonCode: 'spam',
            restrictionSource: 'moderator',
          },
          {
            id: 'restriction:3',
            restrictedSubject: { id: 'person:a' },
            scope: 'messaging',
            status: 'active',
            reasonCode: 'harassment',
            restrictionSource: 'moderator',
            expiresAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'restriction:4',
            restrictedSubject: { id: 'person:b' },
            scope: 'account',
            status: 'active',
            reasonCode: 'childSafety',
            restrictionSource: 'automatedScan',
          },
        ],
        'person:a',
        Date.parse('2026-10-07T00:00:00.000Z')
      )
    ).toEqual([
      expect.objectContaining({
        id: 'restriction:1',
        scope: 'account',
        reason: 'childSafety',
      }),
    ]);
  });
});
