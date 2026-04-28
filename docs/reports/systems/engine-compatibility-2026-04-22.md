# Engine Compatibility Report

Date: 2026-04-22
Role: Simulation Engineer
Status: GREEN

## Scope

Checked and aligned the following gameplay engines against the extended play schema:

- Play Selection Engine
- Outcome Resolution Engine
- Legality Engine

New optional schema fields in scope:

- `variantGroupId`
- `packageTags`
- `structure.defensiveConceptTag`

## Engine Assessment

### Play Selection Engine

Status: adapted

Change:

- `SelectionUsageMemory` now supports optional `variantGroupCallCounts` and `recentVariantGroups`
- self-scout logic now penalizes overused sibling variants via `variantGroupId`
- surprise logic now treats a heavily exposed variant group as less surprising, even when the concrete play id is new

Impact:

- new play variants remain selectable
- sibling variants do not bypass self-scout controls just because they use unique play ids
- no breaking changes, because the new memory fields are optional

### Outcome Resolution Engine

Status: adapted

Change:

- outcome traces now carry optional taxonomy metadata from selected plays
- added trace support for offense and defense `variantGroupId`
- added trace support for offense and defense `packageTags`
- added trace support for defensive `structure.defensiveConceptTag`

Impact:

- richer traceability for new plays and future library growth
- no model or probability shifts caused by metadata-only fields
- backward compatibility preserved

### Legality Engine

Status: compatible without logic change

Assessment:

- legality validation operates on pre-snap structure snapshots, not on play taxonomy metadata
- the new optional fields do not affect alignment counts, eligibility, motion or shift validation
- compatibility is verified through selection and resolution integration paths using enriched play definitions

Impact:

- new plays with added taxonomy metadata remain legal or illegal based only on actual pre-snap structure
- no logic drift introduced into legality evaluation

## Test Coverage

Added targeted compatibility coverage for:

- variant-group self-scout suppression in selection
- enriched taxonomy metadata surviving into outcome traces
- selection plus legality plus resolution integration with enriched plays

Validation target:

- no errors
- no broken existing tests
- new plays usable through all engine paths

## Result

Engine compatibility is guaranteed for the current schema expansion.

Status check:

- All engines functioning: yes
- No errors detected in compatibility paths: yes

Final status: GREEN
