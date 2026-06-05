# Stage 1D Operational Architecture Checkpoint

This checkpoint captures the dispatcher operational planning architecture after
Stage 1A through Stage 1D-L. It is a guardrail for future stages, not a feature
spec.

## Critical Boundary

```text
Load ≠ LoadSuggestion ≠ LoadReservation ≠ Deal ≠ Shipment ≠ Dispatch ≠ Settlement
```

Reservation is only a temporary operational hold.

The dispatcher planning layer currently manages operational visibility and
short-lived reservation control. It does not execute shipments, dispatches,
deals, settlements, payments, driver responses, or orchestration workflows.

## Current Operational Layers

- Loads are market opportunities with lane, timing, equipment, source, and
  economics.
- Vehicles are operational resources with equipment, availability, and latest
  known location context.
- Matching creates a persisted run from the current operational snapshot.
- Load suggestions are historical recommendations for one load and one vehicle
  in one matching run.
- Load reservations are temporary holds created from valid suggestions.
- Readiness is derived cockpit visibility for whether loads and vehicles can be
  acted on now.
- Reservation activity is read-only audit visibility for active, released, and
  expired holds.

## Matching Model

Matching is snapshot-in-time. A matching run records the loads, vehicles, stops,
locations, and operational values the matcher saw when it created suggestions.

Load suggestions can become stale after matching. A suggestion must not appear
reservable when the current load, current vehicle, current stop/location
context, suggestion status, active hold state, or matching run freshness no
longer supports it.

Stale matching output remains visible as historical context, but stale matching
must not appear operationally ready.

## Reservation Model

Reservation lifecycle is limited to:

- `active`
- `released`
- `expired`

Only active and unexpired reservations block. Released and expired reservations
remain audit-visible but non-blocking.

Reservations must originate from a valid current `LoadSuggestion`. Creating a
reservation updates operational hold visibility only; it does not create or imply
a shipment, dispatch, deal, settlement, payment, or driver-response workflow.

## Readiness Model

Readiness is derived visibility only. It is not a persisted source of truth.

Load `reservable` requires:

- no active unexpired reservation
- current load status that can be reserved
- a completed, fresh matching run
- a current fresh valid `LoadSuggestion`
- current load, stop/location, and vehicle state that still matches the
  suggestion snapshots

No matching run must not appear fresh. Stale matching must not appear
operationally ready.

Counters and labels must use the same readiness logic. A count must never claim
more readiness than the corresponding row-level label would allow.

## Integrity And Safety Rules

All dispatcher planning reads and joins must preserve organization scoping.

Dirty historical rows should remain visible in audit/activity surfaces whenever
possible. Missing joined load or suggestion records should fall back to stored
IDs instead of disappearing from audit visibility.

Load or vehicle edits can invalidate existing suggestions. Current operational
validity is more important than historical matching output when deciding whether
a suggestion can be reserved.

Historical snapshots explain why a suggestion was generated. They do not prove
that the suggestion is still safe to reserve.

## Explicitly Excluded

The current dispatcher operational planning architecture does not include:

- shipment lifecycle
- dispatch execution
- settlement/payment workflow
- orchestration engine
- automatic rematching
- notifications
- driver-response workflows
- background schedulers
