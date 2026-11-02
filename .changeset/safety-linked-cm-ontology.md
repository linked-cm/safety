---
'@linked.cm/safety': major
---

The ontology moves to `https://linked.cm/ont/safety/`, ships as Turtle with generated accessor
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
