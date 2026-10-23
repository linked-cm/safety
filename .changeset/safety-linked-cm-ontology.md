---
'@linked.cm/safety': major
---

Move the ontology to `https://linked.cm/ont/safety/` and rename `ContentMuteShape.label` to
`mutedLabel`.

- Terms move from `https://id.linked.cm/safety/` to `https://linked.cm/ont/safety/`. The old
  namespace stays exported as the deprecated `legacyNs`. Stored safety records are invisible to
  this release until the app rewrites the prefix (every term keeps its local name).
- The ontology ships as Turtle (`src/data/safety.ttl`) and registers through
  `ontologies/safety.register`, so the store's ontology sync and `linked build`'s shape check see
  it.
- `ContentMuteShape.label` is now `mutedLabel` (`@_linked/core` 2.37 reserves `label` for
  `rdfs:label`); the stored predicate stays `safety:mutedLabel`. `SafetyRows.contentMutes` rows
  carry `mutedLabel`. `listViewerSafety` still returns `label`, and legacy snapshots passed to
  `migrateLegacySafetySnapshot` still use `label`.
- The CommonJS build is gone: `@_linked/core` ships ESM only, so it could not load.
- Requires `@_linked/core` ^2.37.2 and `@_linked/xsd` ^1.3.1.
