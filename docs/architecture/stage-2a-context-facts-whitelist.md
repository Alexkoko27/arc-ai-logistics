# Stage 2A-1 — Context Facts Whitelist

## Purpose

This document defines the initial controlled whitelist for dispatcher context facts in Arc AI Logistics.

The goal of Stage 2A-1 is to create a minimal and safe foundation for storing context that may matter during dispatcher planning review.

This whitelist does not grant operational authority to AI, matching logic, or derived cognition layers.

## Core boundary

Arc AI Logistics must preserve the following separation:

```text
Database stores what is true.
Context layer stores what may matter.
Cognition and matching derive what may be relevant.
Dispatcher decides what to do.
AI must not silently convert context into authority.
```

The existing invariant remains unchanged:

```text
Load ≠ LoadSuggestion ≠ LoadReservation ≠ Deal ≠ Shipment ≠ Dispatch ≠ Settlement
```

A context fact is not a dispatch decision.
A context fact is not a recommendation.
A context fact is not permission to act.
A context fact only provides controlled planning context for human review.

## Initial allowed context facts

### Driver context facts

#### `cooperation_tier`

Allowed values:

```text
regular | friendly
```

Meaning:

- `regular` — ordinary driver.
- `friendly` — trusted/friendly driver, potentially relevant for expanded dispatcher planning review.

Important boundaries:

```text
friendly ≠ permission
friendly ≠ automatic driver choice
friendly ≠ workaround approval
friendly ≠ execution authority
friendly ≠ dispatch approval
```

Allowed usage:

- May expand dispatcher review surface.
- May help explain why a candidate deserves human review.
- Must remain non-binding.

Forbidden usage:

- Must not automatically assign a driver.
- Must not automatically reserve a load.
- Must not imply that a workaround is approved.
- Must not imply that a driver can bypass timing, access, or appointment constraints.

---

#### `us_citizen`

Allowed values:

```text
true | false | unknown
```

Meaning:

Driver-level access context only.

Allowed usage:

- May be used as a planning review factor for access-sensitive stops.
- May appear in explanation, reasoning factors, or review context.

Forbidden usage:

- Must not imply access approval.
- Must not imply dispatch permission.
- Must not automatically qualify or disqualify a driver without dispatcher review.

---

#### `card`

Allowed values:

```text
true | false | unknown
```

Meaning:

Generic access-card marker.

Important wording decision:

Use `card`, not `military_access_card`.

Reason:

Access-sensitive loads may require different forms of access proof. The system should not overfit the schema to one example.

Allowed usage:

- May be used as driver-level access context.
- May support review signals for access-sensitive pickup or delivery stops.

Forbidden usage:

- Must not imply access is guaranteed.
- Must not imply the driver is approved for a specific facility.
- Must not create a security clearance model.

---

#### `escort_required_for_access`

Allowed values:

```text
true | false | unknown
```

Meaning:

Driver-level context indicating whether an escort may be required for access-sensitive locations.

Allowed usage:

- May appear as a limitation or review factor.
- May help identify that dispatcher verification is needed.

Forbidden usage:

- Must not create escort scheduling.
- Must not create escort provider workflows.
- Must not imply that access is solved.

---

#### `preferred_fuel_network`

Allowed values:

```text
Pilot | Loves | TA | Petro | unknown
```

Meaning:

Soft driver-level planning context.

Allowed usage:

- May help explain route or review context.
- May be considered as a soft preference.

Forbidden usage:

- Must not become a route optimization engine.
- Must not automatically select route, load, or driver.

---

### Organization context facts

#### `preferred_fuel_network`

Allowed values:

```text
Pilot | Loves | TA | Petro | unknown
```

Meaning:

Soft organization-level planning preference.

Allowed usage:

- May provide default planning context when driver-level preference is unavailable.
- May appear in review explanations.

Forbidden usage:

- Must not override dispatcher judgment.
- Must not automatically select routes, stops, drivers, or loads.

---

### Load context facts

#### `declared_load_type`

Allowed values:

```text
full | partial | unknown
```

Meaning:

Source-declared load type from broker, customer, dispatcher, or external source.

Important boundary:

```text
declared_load_type = full
```

does not mean:

```text
partial is impossible
```

Allowed usage:

- Stores the declared/source load type.
- May support later derived review signals such as possible remaining capacity.

Forbidden usage:

- Must not rewrite source truth.
- Must not create `load.is_really_partial`.
- Must not automatically recommend adding another load.

---

### Load stop context facts

#### `access_sensitive`

Allowed values:

```text
true | false | unknown
```

Meaning:

Minimal marker that a pickup or dropoff stop may require additional access review.

Allowed usage:

- May be compared against driver access context.
- May create a review-oriented signal such as `access_context_review` or `access_context_limitation`.

Forbidden usage:

- Must not imply access approval.
- Must not create facility access workflows.
- Must not create escort scheduling.
- Must not automatically approve dispatch.

## Explicitly forbidden context keys

The following keys must not be introduced in Stage 2A-1:

```text
recommended_driver
recommended_partial
recommended_route
best_sequence
dispatch_allowed
access_guaranteed
driver_can_bypass_stop_time
driver_can_use_workaround
driver_good_for_risky_loads
driver_behavior_score
driver_flexibility_score
driver_appointment_manipulation_allowed
driver_approved_for_access
automatic_assignment
automatic_hold
automatic_dispatch
```

Reason:

These keys imply operational permission, hidden authority, execution readiness, or unsafe semantic drift.

## Allowed derived planning signals

The following may exist later as derived planning signals in suggestion explanation, score breakdown, metadata, reasoning factors, UI review context, or planning context summary.

They are not hard truth and are not core database facts.

```text
possible_remaining_capacity
possible_partial_consolidation_review
possible_compatible_partial
route_cost_offset_opportunity
matching_freshness
review_priority
access_context_review
access_context_limitation
```

Important boundary:

Derived planning signals may explain why something deserves review.
They must not become dispatch, shipment, deal, settlement, automatic reservation, automatic assignment, broker communication, or route execution.

## Stage 2A-1 implementation rule

Any future `dispatcher_context_facts` implementation must validate:

- organization scope;
- allowed `entity_type`;
- allowed `context_key` for that entity type;
- allowed value for that context key;
- source or provenance;
- confidence/status if added;
- no arbitrary AI-generated facts;
- no execution-authority fields.

## Update policy

This whitelist may be updated later, but only through explicit architecture review and a separate commit.

Each new context fact must answer:

1. What entity does this fact belong to?
2. Is this hard truth, soft context, or derived reasoning?
3. What exact values are allowed?
4. Can this accidentally imply operational authority?
5. Where may it be displayed or used?
6. What must it not do?

## Final principle

Context facts may expand dispatcher review surface.
Context facts must not expand AI authority.
