# Stage 1D Closure Boundaries

This document freezes the Stage 1D dispatcher architecture boundary before
additional hardening or future stages continue. It is a clarification document,
not a feature specification.

Stage 1D closes as an Operational Planning Platform Foundation.

It is not:

- a shipment execution system
- a dispatch execution engine
- an orchestration platform
- an autonomous workflow engine

## Critical Domain Invariant

```text
Load ≠ LoadSuggestion ≠ LoadReservation ≠ Deal ≠ Shipment ≠ Dispatch ≠ Settlement
```

These concepts must remain separate in code, documentation, and future schema
hardening. A planning hold must not be treated as a commercial agreement,
accepted transport obligation, driver assignment, shipment lifecycle event, or
financial settlement.

## Stage 1D Ownership Boundary

Stage 1D owns dispatcher planning visibility and short-lived reservation
control. Its dispatcher semantics are:

- read-only where derived cockpit visibility is concerned
- derived from current operational records and historical matching output
- planning-oriented
- decision-support only

Stage 1D does not own shipment execution, dispatch execution, settlement,
payment workflow, driver-response workflows, autonomous orchestration, or hidden
state progression.

## Reservation Boundary

`LoadReservation` is only a temporary operational hold.

A reservation:

- blocks conflicting active planning holds while it remains active and unexpired
- preserves audit-visible hold history
- may be released or expire
- may update planning hold visibility through the reservation service

A reservation is not:

- booking
- dispatch
- shipment progression
- broker negotiation completion
- driver assignment
- settlement or payment progression

Reservation wording in future stages should avoid implying that a held load has
become a deal, shipment, dispatch, or settlement.

## Inert Future-Schema Structures

The current schema and initial dispatcher migration include execution-domain
structures such as:

- `deals`
- `shipments`
- `dispatches`
- execution timestamps and statuses, including booking, dispatch, assignment,
  and completion fields

For Stage 1D closure, these structures are inert future-schema placeholders.
They are present in schema/migrations but are outside active Stage 1D dispatcher
ownership.

The dispatcher runtime must not treat these structures as active execution
workflow state unless a later stage explicitly defines that ownership and adds
the required service, validation, migration, authorization, and test coverage.

## Decision Support Is Not Orchestration

The decision-support layer must stay observable and non-orchestrating. It may
surface readiness, freshness, reservations, confidence, and review attention,
but it must not become a hidden execution controller.

The dispatcher cockpit and related services must avoid:

- autonomous workflow progression
- automatic dispatching
- automatic shipment lifecycle execution
- hidden state transitions
- background orchestration
- implicit conversion from planning records into execution records

If future contributors add execution behavior, it must be explicit, separately
owned, and named as a later execution stage.

## Current Semantic Separations

Stage 1D intentionally keeps these planning concepts distinct:

- stale freshness: historical matching output may no longer match current
  operational state
- pending matching: a matching run or suggestion path exists but is not ready
  for current reservation decisions
- unavailable context: required load, stop, location, vehicle, or organization
  context is missing or no longer usable for planning
- active hold: an active and unexpired `LoadReservation` blocks competing holds
  without creating execution state
- readiness: derived cockpit visibility for whether a planning action appears
  currently safe
- confidence: recommendation scoring context, not execution authority
- review attention: dispatcher-facing signal that something needs human review,
  not automatic progression

These labels and counters must remain aligned with row-level planning semantics.
They should not imply booking, dispatch, shipment movement, or settlement.

## Current Runtime Position

The current dispatcher paths preserve the planning/execution boundary:

- matching produces historical `LoadSuggestion` records
- cockpit reads combine current operational state with historical snapshots
- readiness is derived visibility, not persisted execution state
- reservation service controls temporary holds
- stale suggestions remain historical context
- audit/activity views may show dirty or expired history without converting it
  into execution state

Execution-domain tables may exist, but Stage 1D dispatcher runtime does not use
them to execute shipments, dispatches, deals, settlements, payments, or driver
responses.

## Closure Rule

Future hardening may add database guardrails, status constraints, cleanup jobs,
or clearer service boundaries. Those changes must preserve the Stage 1D closure
invariant:

```text
Operational planning visibility and temporary holds are not execution workflow.
```
