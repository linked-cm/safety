# Package boundary

`@linked.cm/safety` owns host-neutral RDF safety records and core operations.

- Keep identity generic: subject IRIs only, never a product-specific Player shape.
- Keep authorization and policy in the host. Moderator roles, age bands, escalation routes,
  emergency contacts, scheduling, friendship, and account sanctions are injected hooks.
- A block is bilateral for visibility and silent to the target. A mute is one-way and silent.
- Child-safety reports set legal hold and enter the removed/quarantined visibility set while
  unresolved. Actual quarantine/deletion is a required host hook, never an implied side effect.
- Never delete legacy data during migration. Copy, dual-read/verify, then retire separately.
- Do not add UI here. Portable UI belongs in the consumer package (for example messaging).
