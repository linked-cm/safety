import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { migrateLegacySafetySnapshot } from '../src/migration.js';
import { ContentMuteShape, SafetyBlockShape, SafetyMuteShape, SafetyReportShape } from '../src/shapes.js';

// An in-memory stand-in for the RDF store: only the calls the migration makes.
type Row = Record<string, any> & { id: string };
const tables = new Map<unknown, Row[]>();
let seq = 0;

function fake(shape: any) {
  tables.set(shape, []);
  vi.spyOn(shape, 'select').mockImplementation((() =>
    Promise.resolve(tables.get(shape)!.map((row) => ({ ...row })))) as any);
  vi.spyOn(shape, 'create').mockImplementation(((props: any) => {
    const row = { id: `urn:test:${++seq}`, ...props };
    tables.get(shape)!.push(row);
    return Promise.resolve(row);
  }) as any);
}

const legacy = {
  reports: [
    { reportedBy: { id: 'a' }, target: { id: 'post:1' }, targetKind: 'post', reasonCode: 'nudity', createdAt: '2026-01-01T00:00:00.000Z', reportStatus: 'open' },
    { reportedBy: { id: 'a' }, target: { id: 'media:2' }, targetKind: 'media', reasonCode: 'csam', createdAt: '2026-01-02T00:00:00.000Z', reportStatus: 'reviewing' },
    { reportedBy: { id: 'b' }, target: { id: 'post:3' }, targetKind: 'post', reasonCode: 'spam', reportStatus: 'open' },
  ],
  blocks: [{ blockedBy: { id: 'a' }, blocked: { id: 'c' }, createdAt: '2026-02-01T00:00:00.000Z', active: true, avoidFuture: true }],
  mutes: [{ mutedBy: { id: 'a' }, muted: { id: 'd' }, createdAt: '2026-02-02T00:00:00.000Z', active: true, until: '2027-01-01T00:00:00.000Z' }],
  contentMutes: [{ mutedBy: { id: 'a' }, label: 'distressing' }],
};

beforeEach(() => {
  seq = 0;
  for (const shape of [SafetyReportShape, SafetyBlockShape, SafetyMuteShape, ContentMuteShape]) fake(shape);
});
afterEach(() => vi.restoreAllMocks());

describe('copy-only legacy migration', () => {
  it('maps legacy reason aliases to the shared vocabulary without changing their meaning', async () => {
    await migrateLegacySafetySnapshot(legacy);
    const reports = tables.get(SafetyReportShape)!;
    expect(reports.find((r) => r.target.id === 'post:1')?.reasonCode).toBe('sexualContent');
    const child = reports.find((r) => r.target.id === 'media:2')!;
    expect(child.reasonCode).toBe('childSafety');
    expect(child.legalHold).toBe(true);
    expect(child.reportStatus).toBe('reviewing');
    expect(reports.find((r) => r.target.id === 'post:3')?.reasonCode).toBe('spam');
  });

  it('carries block, mute and content-mute state across', async () => {
    await migrateLegacySafetySnapshot(legacy);
    expect(tables.get(SafetyBlockShape)![0]).toMatchObject({ blocked: { id: 'c' }, active: true, avoidFutureInteraction: true });
    expect(tables.get(SafetyMuteShape)![0]).toMatchObject({ muted: { id: 'd' }, until: '2027-01-01T00:00:00.000Z' });
    expect(tables.get(ContentMuteShape)![0]).toMatchObject({ label: 'distressing', active: true });
  });

  it('is idempotent: a second run copies nothing, including an undated row', async () => {
    const first = await migrateLegacySafetySnapshot(legacy);
    const second = await migrateLegacySafetySnapshot(legacy);
    expect(first).toEqual({ reports: 3, blocks: 1, mutes: 1, contentMutes: 1, skipped: 0 });
    expect(second).toEqual({ reports: 0, blocks: 0, mutes: 0, contentMutes: 0, skipped: 6 });
    expect(tables.get(SafetyReportShape)).toHaveLength(3);
  });

  it('dry run reports the counts a real run would copy and writes nothing', async () => {
    const planned = await migrateLegacySafetySnapshot(legacy, { dryRun: true });
    expect(planned).toEqual({ reports: 3, blocks: 1, mutes: 1, contentMutes: 1, skipped: 0 });
    for (const shape of [SafetyReportShape, SafetyBlockShape, SafetyMuteShape, ContentMuteShape]) {
      expect(tables.get(shape)).toHaveLength(0);
      expect(shape.create).not.toHaveBeenCalled();
    }
  });
});
