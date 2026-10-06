# AGENTS.md — @linked.cm/safety

Staged in the **linked-cm** org (npm scope `@linked.cm`) pending René's review. The `@_linked` npm scope is reserved for linked-fw.

Extracted from Serve's safety layer (`serve-earth/serve-community`) on 2026-10-06. Consumers: Serve; Peace Game planned.

## Do not change without a migration

- `linkedPackage('@linked.cm/safety', { baseUri: 'https://linked.cm/' })` in `src/package.ts` — it decides the package and shape IRIs (`https://linked.cm/pkg/safety`, `https://linked.cm/shape/safety/…`).
- The ontology namespace `https://id.linked.cm/safety/`. Stored reports, blocks and mutes are keyed to it.

## Package boundary

`@linked.cm/safety` owns host-neutral RDF safety records and core operations.

- Keep identity generic: subject IRIs only, never a product-specific Player shape.
- Keep authorization and policy in the host. Moderator roles, age bands, escalation routes,
  emergency contacts, scheduling, friendship, and account sanctions are injected hooks.
- A block is bilateral for visibility and silent to the target. A mute is one-way and silent.
- Child-safety reports set legal hold and enter the removed/quarantined visibility set while
  unresolved. Actual quarantine/deletion is a required host hook, never an implied side effect.
- Never delete legacy data during migration. Copy, dual-read/verify, then retire separately.
- Do not add UI here. Portable UI belongs in the consumer package (for example messaging).
- Releases go through changesets (`npx changeset`). Add `.github/workflows/publish.yml` (copied from `linked-cm/calendar`) only when a release is intended: with no pending changesets, that workflow publishes the current version as soon as it lands on `main`.
- No production text-scanning provider ships here or in `@linked.cm/messaging`. The scanner is an injected interface; never describe content moderation as operational until a reviewed provider and host policy are connected.
