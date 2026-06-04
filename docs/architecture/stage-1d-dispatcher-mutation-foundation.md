# Stage 1D Dispatcher Mutation Foundation

Stage 1D is split because dispatcher mutations are more sensitive than the
read-only cockpit. Creating loads, editing vehicles, reserving loads, and
releasing reservations all change operational state and can create race
conditions if UI code bypasses service boundaries.

Stage 1D-A is foundation-only. It prepares mutation guardrails, validation,
server action contracts, and service boundaries without implementing broad CRUD
or workflow persistence yet.

## Mutation Guard

`lib/dispatch/mutationGuard.ts` blocks dispatcher mutations in production
runtime. It uses safe runtime metadata only:

- `NODE_ENV`
- `VERCEL_ENV`

It does not read `.env` files, database URLs, secrets, API keys, or private
keys. Production Vercel runtime is blocked, and a production Node runtime is
blocked unless it is explicitly a Vercel Preview runtime.

## Action Result Contract

`lib/dispatch/actionResult.ts` defines the shared server action result shape:

- `success`
- `message`
- optional `fieldErrors`
- optional domain `code`

This keeps dispatcher UI mutations predictable before real write flows are
enabled.

## Validation

`lib/dispatch/validation.ts` defines Zod schemas for future operations:

- create/edit `Load`
- create/edit `Vehicle`
- reserve `Load`
- release `LoadReservation`

The schemas preserve domain naming. A load mutation does not create a deal,
shipment, dispatch, or settlement.

## Server Actions

`app/dispatcher/actions.ts` contains conservative server action skeletons.
For Stage 1D-A they:

1. call the mutation guard
2. validate input
3. return a `STAGE_1D_A_FOUNDATION_ONLY` result

They do not persist load/vehicle changes, reserve loads, release reservations,
or edit immutable `load_suggestions` snapshots.

## Service Boundaries

Minimal service boundary files are prepared:

- `lib/dispatch/loadService.ts`
- `lib/dispatch/vehicleService.ts`
- `lib/dispatch/workflowService.ts`

Future mutations should go through these service boundaries instead of writing
directly from UI components. Existing reservation locking remains owned by
`lib/dispatch/reservationService.ts`.

## Excluded Scope

Stage 1D-A does not add:

- full create/edit UI
- production workflows
- auth
- external AI APIs
- GPS integrations
- load-board integrations
- broker negotiation
- documents
- settlements or payments
- production migrations
- deployment changes

## Future Sub-Stages

Recommended next steps:

- Stage 1D-B: load create/edit service + focused UI
- Stage 1D-C: vehicle create/edit service + focused UI
- Stage 1D-D: reservation workflow actions using DB-level locking
- Stage 1D-E: integrate stable operational controls into the cockpit
