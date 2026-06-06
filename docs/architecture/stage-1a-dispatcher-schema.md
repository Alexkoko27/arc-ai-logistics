# Stage 1A Dispatcher Database Foundation

> Stage 1D closure clarification: this Stage 1A document is historical schema
> foundation context. Execution-domain tables and statuses listed here
> (`deals`, `shipments`, `dispatches`, booking/dispatch/assignment/completion
> timestamps) are inert future-schema placeholders for Stage 1D and are outside
> active Stage 1D dispatcher ownership. See
> `docs/architecture/stage-1d-closure-boundaries.md`.

## Scope

Stage 1A adds the database foundation for the production-oriented dispatcher
architecture. It is intentionally schema-only: no UI, real GPS integration, load
board integration, broker negotiation workflow, legal documents, or financial
settlement execution is implemented in this stage.

The schema is additive to the existing public MVP database. Existing
analysis/payment tables remain in place so the current showcase, payment demo,
and analytics paths can continue to work.

## Core Domain Boundaries

The dispatcher architecture keeps these concepts separate:

- `Load`: a market opportunity or available freight record.
- `LoadSuggestion`: an immutable AI recommendation for one load and one vehicle
  in one matching run.
- `LoadReservation`: a temporary lock that prevents double-booking while a
  dispatcher evaluates a planning hold.
- `Deal`: the commercial agreement or negotiation state with a counterparty.
- `Shipment`: the accepted transport obligation.
- `Dispatch`: assignment of a vehicle and driver to a shipment.
- `Settlement`: future financial/payment execution, intentionally deferred.

This separation prevents market data from overwriting operational history. A
load board record can become stale, disappear, or be duplicated by another
source, while a shipment and dispatch must remain durable operational records.

## Stage 1A Tables

Identity and ownership:

- `organizations`
- `users`
- `organization_members`

Fleet:

- `vehicles`
- `drivers`
- `driver_vehicle_assignments`

Location and tracking:

- `locations`
- `vehicle_location_events`

Freight opportunities:

- `load_sources`
- `counterparties`
- `loads`
- `load_stops`

Matching and AI recommendations:

- `matching_runs`
- `load_suggestions`
- `load_reservations`

Operations:

- `deals`
- `shipments`
- `dispatches`

Audit:

- `audit_events`

## Status Model

`loads.status`:

- `available`
- `reserved`
- `negotiating`
- `booked`
- `expired`
- `cancelled`

`suggested` is not a global load state. It belongs to `load_suggestions`,
because the same load may be suggested in multiple matching runs for different
vehicles or at different times.

`load_suggestions.status`:

- `suggested`
- `viewed`
- `reserved`
- `dismissed`
- `expired`
- `converted`

`load_reservations.status`:

- `active`
- `expired`
- `released`
- `cancelled`

`deals.status`:

- `draft`
- `proposed`
- `negotiating`
- `pending_dispatcher_approval`
- `accepted`
- `rejected`
- `cancelled`

`completed` is intentionally not used for deals in Stage 1A. Commercial
acceptance should stay separate from shipment completion and future settlement
completion.

`shipments.status`:

- `planned`
- `booked`
- `dispatched`
- `in_transit`
- `delivered`
- `closed`
- `cancelled`

`dispatches.status`:

- `assigned`
- `notified`
- `accepted_by_driver`
- `rejected_by_driver`
- `in_progress`
- `completed`
- `cancelled`

## Immutable AI Recommendations

`matching_runs` and `load_suggestions` are designed as historical records.
Recommendations store input snapshots, load snapshots, vehicle snapshots,
score totals, score breakdowns, estimated deadhead miles, estimated profit,
explanations, and model/provider/version metadata.

Old AI suggestions should not silently change when a load, vehicle, route, or
market source changes later.

## Reservation Locking

`load_reservations` includes a Postgres partial unique index:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS load_reservations_active_load_idx
  ON load_reservations(load_id)
  WHERE status = 'active';
```

This is the database-level protection that prevents one load from having more
than one active reservation at the same time. Application logic should still use
transactions and clear status transitions, but UI-only locking is not enough.

## Integration Readiness

Integration-facing records include source/external identity and payload fields
where appropriate:

- `source_id`
- `external_id`
- `raw_payload`
- `payload_hash`
- `last_seen_at`
- `created_at`
- `updated_at`

These fields prepare the system for GPS feeds and load board feeds where
external records may change, duplicate, disappear, or become stale.

## Deferred Stage 2 Domains

These domains are intentionally deferred:

- `documents`
- `payment_obligations`
- `settlements`
- `negotiation_events`
- `compliance_checks`
- `maintenance_logs`
- `fuel_logs`
- `driver_availability_rules`

They should be added only after the dispatcher foundation, matching lifecycle,
reservation locking, and shipment/dispatch boundaries are stable.
