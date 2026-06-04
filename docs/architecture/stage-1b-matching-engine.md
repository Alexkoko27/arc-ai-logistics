# Stage 1B Matching Engine

Stage 1B adds backend-only development tooling for dispatcher operations:

- deterministic mock operational data
- a simple deterministic matching engine
- persisted matching runs and load suggestions
- load reservation logic backed by the database unique constraint
- a validation script for active reservation locking

This stage does not add UI, auth, live GPS, live load board integrations, broker negotiation, documents, settlements, payments, deployments, or production migrations.

## Mock Data

`lib/dispatch/mockData.ts` seeds one demo organization with:

- dispatcher user and organization membership
- vehicles in different statuses
- drivers and active driver/vehicle assignments
- current vehicle location events
- mock load source and counterparties
- available loads with pickup and dropoff stops

The data is safe for development and preview testing. It does not call external APIs and does not require secrets beyond the selected database connection.

The scripts are guarded so they run only when `VERCEL_ENV=preview`, which makes the app select `DEV_DATABASE_URL`.

## Matching Runs

`lib/dispatch/matchingEngine.ts` evaluates:

- vehicles with `available` or `available_soon` status
- loads with `available` status
- equipment compatibility
- pickup proximity / estimated deadhead miles
- load revenue and estimated profit
- timing compatibility
- a simple risk/simplicity placeholder

The engine creates a `matching_runs` row first, stores the full input snapshot, then writes up to three `load_suggestions` per suitable vehicle.

No external AI API is used in Stage 1B. The engine labels itself as:

- `model_provider`: `arc-deterministic`
- `model_name`: `stage-1b-mock-matcher`
- `model_version`: `2026-06-04`

This keeps the persistence model close to future AI-agent recommendations while making local debugging deterministic.

## Immutable Snapshots

Recommendations must remain immutable decision records. Stage 1B stores snapshots in:

- `matching_runs.input_snapshot`
- `load_suggestions.load_snapshot`
- `load_suggestions.vehicle_snapshot`

If the live load or vehicle changes later, the suggestion still preserves what the matcher saw at decision time.

## Reservation Locking

`lib/dispatch/reservationService.ts` creates active `load_reservations` and then updates related operational state:

- related `load_suggestions.status` becomes `reserved`
- related `loads.status` becomes `reserved`

Double booking protection is enforced by the Stage 1A partial unique index:

```sql
load_reservations_active_load_idx
```

The service treats that database constraint as the source of truth. Duplicate active reservation attempts are converted into `ActiveLoadReservationConflictError`.

When a reservation is released, the reservation status changes to `released`, the load returns to `available`, and a new active reservation can be created for the same load.

## Commands

Use these commands only against the dev/preview database:

```powershell
$env:VERCEL_ENV = "preview"
$env:DEV_DATABASE_URL = "<dev database url>"
npm run db:seed:dispatcher
npm run dispatch:match
npm run dispatch:verify-reservation-lock
```

The scripts intentionally refuse to run when `VERCEL_ENV` does not select `DEV_DATABASE_URL`.

## Deferred Work

The following remain intentionally deferred:

- production dispatcher workflows
- user authentication and authorization
- real GPS ingestion
- real load board ingestion
- broker negotiation
- document generation or storage
- settlements, payments, and reconciliation
- UI/API route surface for the matching results
