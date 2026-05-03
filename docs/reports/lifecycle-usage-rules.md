# Lifecycle Usage Rules

Date: 2026-05-03

## Goal

New online flow paths must not decide from raw persisted state fields. Flow decisions must use the lifecycle read-model so UI, admin flows, and write gates share the same conflict handling.

## Canonical Rule

Use the lifecycle read-model for all decisions that start, block, continue, reload, or disable a multiplayer flow:

- `normalizeOnlineCoreLifecycle(...)` for user-scoped flow decisions.
- `normalizeOnlineLeagueCoreLifecycle(...)` for league-wide, admin, and simulation decisions.

The following raw fields are not valid decision sources outside lifecycle internals and low-level projection code:

- `weekStatus`
- `readyForWeek`
- `fantasyDraft.status`
- `completedWeeks`
- `matchResults`

## Allowed Direct Reads

Direct reads are allowed only when they do not choose flow behavior:

- Lifecycle read-model implementation and its unit tests.
- Persistence mappers and repository hydration code.
- Low-level derivation helpers that feed the lifecycle model.
- Display-only labels, tables, debug panels, and report output.
- Draft internals where the field is not a core flow status decision, for example current pick display.
- Test fixtures that intentionally construct raw states.

## Forbidden Direct Reads

Do not branch, gate writes, or disable UI directly from raw lifecycle fields:

```ts
if (league.weekStatus === "simulating") return;
if (league.fantasyDraft?.status !== "completed") return;
if (league.completedWeeks?.length) return;
if (user.readyForWeek) simulate();
```

Use the lifecycle model instead:

```ts
const lifecycle = normalizeOnlineLeagueCoreLifecycle({ league, requiresDraft: true });

if (!lifecycle.canSimulate) {
  return;
}
```

## Guardrail Test

`src/lib/online/online-lifecycle-usage-rules.test.ts` is the lightweight guardrail. It scans the known flow-decision surfaces for direct raw-state branches and UI gates.

When adding a new flow surface, add it to `FLOW_DECISION_SURFACES` in that test. If a direct raw read is truly display-only, keep it outside the scanned decision surface or document the exception here before changing the scanner.

This is intentionally not a broad ESLint rule. The project needs a small, explicit policy that protects the risky paths without blocking harmless mapper, fixture, or display code.
