# @linked.cm/safety

## 1.0.0

### Major Changes

- [#13](https://github.com/linked-cm/safety/pull/13) [`55e74f3`](https://github.com/linked-cm/safety/commit/55e74f3f0d23983a06c209aeb581a47ba021ffb5) Thanks [@flyon](https://github.com/flyon)! - The ontology moves to `https://linked.cm/ont/safety/`, ships as Turtle with generated accessor
  modules, and `ContentMuteShape.label` is renamed `mutedLabel`.
  
  - **New namespace.** Terms move from `https://id.linked.cm/safety/` to
    `https://linked.cm/ont/safety/` (prefix `safety`); every term keeps its local name. Stored
    safety records are invisible to this release until the app rewrites that namespace
    (predicates and `rdf:type` objects) to the new one.
  - **Generated accessor modules.** `src/data/safety.ttl` is the only source of terms;
    `linked generate-ontology` writes `ontologies/safety` (one named export per term),
    `ontologies/safety.data` (`ns`, `dataFiles`, `loadData`, `_ontologyResource`) and
    `ontologies/safety.register`. Import the terms as a namespace:
    `import * as safety from '@linked.cm/safety/ontologies/safety'`.
  - **Value sets have their own module.** `REPORT_TARGET_KINDS`, `REPORT_REASONS`,
    `REPORT_STATUSES`, `REPORT_RESOLUTIONS`, `RESTRICTION_SCOPES`, `RESTRICTION_STATUSES`,
    `RESTRICTION_SOURCES`, their types and `canonicalReportReason` move from
    `ontologies/safety` to `@linked.cm/safety/values` (still exported from the package root).
  - **Removed:** the root's `safety` namespace object and its re-export of every term (import
    `ontologies/safety` instead), `_self` (now `_ontologyResource` in `ontologies/safety.data`),
    `legacyNs`, and `ns`/`dataFiles`/`loadData` from `ontologies/safety` (now in
    `ontologies/safety.data`).
  - `ContentMuteShape.label` is now `mutedLabel` (`@_linked/core` reserves `label` for
    `rdfs:label`); the stored predicate is `safety:mutedLabel`. `SafetyRows.contentMutes` rows
    carry `mutedLabel`. `listViewerSafety` still returns `label`, and snapshots passed to
    `migrateLegacySafetySnapshot` still use `label`.
  - The build ships `lib/esm/data/safety.ttl` and `shapes.ttl`. The CommonJS build is gone:
    `@_linked/core` ships ESM only.
  - Requires `@_linked/core` ^2.46.0 and `@_linked/xsd` ^1.4.4; built with `@_linked/cli` ^1.61.0.

## 0.3.0

### Minor Changes

- [#1](https://github.com/linked-cm/safety/pull/1) [`6ee9702`](https://github.com/linked-cm/safety/commit/6ee9702c3c7eedb5046552d0c536a28b3f638fe3) Thanks [@carlenmy](https://github.com/carlenmy)! - Add portable RDF safety restrictions and framework-neutral helpers for creating, reading,
  expiring, and lifting messaging or account restrictions.

- [#1](https://github.com/linked-cm/safety/pull/1) [`fe7db35`](https://github.com/linked-cm/safety/commit/fe7db35582740a1a631af5eadb9642e232fb36b6) Thanks [@carlenmy](https://github.com/carlenmy)! - Add portable RDF report, block, subject-mute, and content-mute records; shared visibility
  resolution; moderation lifecycle helpers; host effect hooks; and idempotent legacy migration.
  Also expose a bounded, status-filtered moderation queue read for authorized host tooling.

## 0.2.0

### Minor Changes

- [`ae0f2ec`](https://github.com/linked-cm/safety/commit/ae0f2ece43698f203b5b1e7b8486138f9469a332) Thanks [@carlenmy](https://github.com/carlenmy)! - Add portable RDF report, block, subject-mute, and content-mute records; shared visibility
  resolution; moderation lifecycle helpers; host effect hooks; and idempotent legacy migration.
