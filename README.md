# `@linked.cm/safety`

Portable RDF models and framework-neutral operations for user safety in LINKED apps.

The package provides:

- `SafetyReportShape`: reports over any IRI, a closed reason vocabulary, moderation status,
  resolution, timestamps, and legal hold.
- `SafetyBlockShape`: an immediate, silent block whose visibility effect is bilateral.
- `SafetyMuteShape`: a silent, one-way mute with optional automatic expiry.
- `ContentMuteShape`: a viewer preference over host-defined content labels.
- `SafetyRestrictionShape`: a durable messaging or account restriction with source,
  reason, lifecycle state, and optional expiry.
- core verbs (`createReport`, `createBlock`, `createRestriction`, `muteSubject`, status updates and reversals),
  one shared visibility resolver, bounded moderation and Settings-facing reads, and an
  idempotent legacy migration.

The package does **not** decide who is a moderator, scan content, notify police, delete host
content, end friendships, or alter schedules. Those are host policies. `SafetyHooks` makes
those effects explicit so an app cannot claim quarantine or enforcement it did not wire.
Likewise, a restriction record is not enforcement by itself: the host must check it at its
authentication and message-delivery boundaries.

```ts
import { createReport, createBlock, selectSafetySets } from '@linked.cm/safety';

await createReport(
  {
    reporterId: viewer.id,
    targetId: messageIri,
    targetKind: 'message',
    reason: 'harassment',
  },
  {
    notifyReviewQueue: enqueueForAuthorizedStaff,
    quarantineTarget: quarantineHighRiskTarget,
  }
);

await createBlock(viewer.id, other.id, {
  afterBlock: endContactRelationships,
  repeatedBlockSignal: flagAccountForReview,
});

const safety = await selectSafetySets(viewer.id);
const visible = posts.filter(
  (post) =>
    !safety.blocked.has(post.author.id) &&
    !safety.mutedSubjects.has(post.author.id) &&
    !safety.removed.has(post.id) &&
    !safety.reportedByViewer.has(post.id)
);
```

## Migration

`migrateLegacySafetySnapshot` accepts plain rows, so a host can select its legacy shapes,
copy them into the shared ontology, deploy a dual-read verification period, and only then
retire the old shapes. Known Serve aliases are normalized (`nudity` → `sexualContent`,
`csam` → `childSafety`). Legacy data is never deleted by the migration.

## Integration with messaging and Matrix

`@linked.cm/messaging` supplies generic report/mute/block controls and client filtering.
`@linked.cm/matrix` supplies homeserver reporting, one-way ignore, and a deny-by-default
moderation route. A host should wire both transport-native and durable safety actions:
Matrix reporting informs the homeserver operator; `@linked.cm/safety` drives the product's
own review queue, visibility rules, account action and legal-hold records.

A `removed` resolution requires a `removeTarget` hook. The core runs that host effect before
recording the report as actioned, so a failed deletion or redaction is never represented as
successful moderation.

`listSafetyReports({ statuses, limit })` is the portable moderation-queue read. It returns
generic IRIs and report metadata only; the host must authorize the caller before invoking it
and may resolve identities or content references inside its private admin layer.
