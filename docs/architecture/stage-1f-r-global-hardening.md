# Stage 1F-R — Global Hardening Pass

## Purpose

Stage 1F-R is a narrow hardening pass after Stage 1F.

It does not introduce new product behavior.

It exists to tighten the architecture boundary before Stage 2A expands operational cognition.

## Current Position

Stage 1F completed Arc AI Logistics as a Controlled Recommendation Readiness / Operational Cognition Governance Foundation.

Stage 1F-R keeps that foundation stable by making sure that:

- planning cognition remains explainable and read-only;
- review readiness does not become execution readiness;
- schema foundations do not imply active workflow behavior;
- active temporary holds remain protected from silent context drift.

## Critical Invariant

The following invariant remains unchanged:

```text
Load ≠ LoadSuggestion ≠ LoadReservation ≠ Deal ≠ Shipment ≠ Dispatch ≠ Settlement
```

A reservation remains only a temporary operational hold.

A LoadSuggestion remains analytical planning output.

A LoadReservation does not create or imply a shipment, dispatch, deal, settlement, payment, driver assignment, or execution workflow.

## Execution-Domain Tables Are Schema-Only

The database schema may contain future-domain tables such as:

- deals;
- shipments;
- dispatches.

At this stage, these tables are schema foundation only.

Their presence in the schema does not mean that Arc AI Logistics currently supports:

- deal lifecycle;
- shipment lifecycle;
- dispatch execution;
- driver assignment workflow;
- settlement workflow;
- payment workflow;
- notification workflow;
- background orchestration;
- automatic operational progression.

No Stage 1F-R change should connect these tables to active dispatcher workflow behavior.

## Vehicle Edit / Active Hold Boundary

A vehicle tied to an active unexpired load reservation is part of a temporary operational hold context.

Changing that vehicle while the hold is active can silently invalidate the planning context behind the hold.

Stage 1F-R should prevent silent active-hold context drift.

The safe default is:

- vehicle edits are blocked while the vehicle is tied to an active unexpired reservation;
- this does not create a new reservation lifecycle state;
- this does not create dispatch, shipment, deal, settlement, or assignment behavior;
- it only protects temporary planning-hold integrity.

Future stages may replace this with a more nuanced derived warning model, but that requires a separate architecture review.

## Matching Freshness Assumption

The current matching freshness window is a planning assumption.

`MATCHING_STALE_AFTER_MINUTES = 30` should be treated as:

- a current dispatcher planning heuristic;
- not a universal logistics truth;
- not a guarantee of operational validity;
- a candidate for future configuration when live data and market-specific behavior are introduced.

## Wording Boundary

User-facing confidence wording should remain planning-oriented.

Preferred wording:

- planning confidence;
- planning context;
- planning review;
- review readiness;
- read-only planning support.

Avoid wording that implies operational authority, such as:

- execution readiness;
- approved;
- assigned;
- AI selected;
- best load;
- dispatch this;
- guaranteed;
- automatic recommendation.

## Explicit Non-Goals

Stage 1F-R does not add:

- dispatch execution;
- shipment lifecycle;
- deal lifecycle;
- settlement/payment workflow;
- driver assignment;
- background jobs;
- automatic rematching;
- notifications;
- autonomous AI decisions;
- new persisted readiness state.

## Completion Criteria

Stage 1F-R is complete when:

- execution-domain tables are explicitly documented as schema-only;
- vehicle edits cannot silently mutate active hold context;
- planning confidence wording is used consistently in user-facing cognition/readiness surfaces;
- no new execution workflow behavior is introduced;
- validation passes.
