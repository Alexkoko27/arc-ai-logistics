# Stage 2A — Context Facts Boundary

## Purpose

Stage 2A defines the controlled boundary for context facts and derived planning signals before any schema, matching, AI, or external candidate expansion.

The goal is not to build a perfect future-proof ontology.

The goal is to create safe rails for future AI/matching behavior:

- database stores what is true;
- context layer stores what may matter;
- cognition/matching layer derives what may be relevant;
- dispatcher decides what to do;
- AI must not silently convert context into authority.

Stage 2A must preserve the existing operational boundary:

```text
Load ≠ LoadSuggestion ≠ LoadReservation ≠ Deal ≠ Shipment ≠ Dispatch ≠ Settlement
```

A `LoadSuggestion` remains analytical planning output.

A `LoadReservation` remains a temporary operational hold.

Stage 2A must not introduce dispatch execution, shipment lifecycle, deal lifecycle, settlement workflow, automatic assignment, broker communication workflow, or hidden orchestration.

---

## Core principle

Do not create a table for every thought.

At the beginning, many real-world business details should be represented as controlled context facts, not as new domains.

Prefer simple controlled facts:

```text
entity_type = driver
entity_id = <driver_id>
context_key = cooperation_tier
context_value = friendly
```

Do not create early ontology such as:

```text
driver_behavior_profiles
driver_cooperation_profiles
driver_workaround_capabilities
driver_facility_access_matrix
```

Context facts are not operational decisions.

Derived signals are not workflow state.

AI review output is not dispatcher authority.

---

## Recommended conceptual context fact shape

This is a conceptual shape, not yet a migration proposal.

```text
entity_type = driver | vehicle | load | load_stop | location | counterparty | lane | organization
entity_id = <id>
context_key = <controlled_key>
context_value = <controlled_value>
value_type = boolean | string | number | enum | date | json
source = dispatcher | external_source | ai_prefilter | imported_payload
confidence = verified | dispatcher_entered | inferred | unknown
valid_from = optional
valid_until = optional
notes = optional
```

The important rule is controlled keys.

This must not become an open garbage bucket for arbitrary AI-generated facts.

New context keys require explicit architecture review.

---

## Context classification

### Hard operational truth

Store in core tables or strong structured fields.

Examples:

- driver exists;
- vehicle exists;
- load exists;
- load has stops;
- load status;
- vehicle status;
- active reservation;
- suggestion snapshot.

### Stable context

Can be stored as context facts if it affects planning.

Examples:

- driver cooperation tier;
- driver access context;
- preferred fuel network.

### Soft context

Usually context facts, not separate tables.

Examples:

- friendly driver context;
- fuel preference;
- planning preference.

### Hypothetical context

Usually derived during matching/planning and not stored as truth.

Examples:

- possible compatible partial;
- possible route cost offset;
- possible remaining capacity.

### AI-derived reasoning

Can be stored only as explanation, score breakdown, metadata, or review signal when needed.

It must never become operational truth.

### Future execution domain

Do not activate in Stage 2A.

Examples:

- deal lifecycle;
- shipment lifecycle;
- dispatch lifecycle;
- broker negotiation workflow;
- driver notification workflow;
- settlement workflow.

---

## Allowed Stage 2A context facts

Stage 2A allows a very small initial whitelist.

These facts may later live in a controlled context facts layer, but should not be added as separate domain tables.

---

### Driver context facts

#### cooperation_tier

```text
entity_type = driver
entity_id = <driver_id>
context_key = cooperation_tier
context_value = regular | friendly
```

Meaning:

```text
regular = regular driver
friendly = trusted / friendly driver, potentially relevant for expanded planning review
```

Important:

```text
friendly ≠ permission
friendly ≠ automatic driver choice
friendly ≠ workaround approval
friendly ≠ execution authority
```

Allowed effect:

```text
Friendly driver context may expand dispatcher review surface.
```

Forbidden effect:

```text
Friendly driver context must not become operational permission.
```

Allowed wording:

```text
Trusted/friendly driver context may be relevant for dispatcher review.
```

Forbidden wording:

```text
Use this driver.
This driver can handle the workaround.
Recommended driver.
Driver can bypass stop time.
```

---

#### us_citizen

```text
entity_type = driver
entity_id = <driver_id>
context_key = us_citizen
context_value = true | false | unknown
```

Meaning:

```text
true = driver is a US citizen
false = driver is not a US citizen
unknown = status is unknown
```

This is driver-level access context.

It does not automatically approve or reject a load by itself.

---

#### card

```text
entity_type = driver
entity_id = <driver_id>
context_key = card
context_value = true | false | unknown
```

Meaning:

```text
true = driver has the required access card for certain access-sensitive loads/sites
false = driver does not have the required card
unknown = card status is unknown
```

Use the generic key `card`.

Do not use `military_access_card`.

The word `card` is intentionally generic because different access-sensitive loads may require different access proofs.

---

#### escort_required_for_access

```text
entity_type = driver
entity_id = <driver_id>
context_key = escort_required_for_access
context_value = true | false | unknown
```

Meaning:

```text
true = driver may need escort for certain access-sensitive loads/sites
false = escort is usually not needed for this driver
unknown = escort requirement is unknown
```

This is driver-level context only.

Do not create escort workflow in Stage 2A.

Do not create:

```text
escort_provider
escort_lead_time_hours
escort_scheduling
escort_workflows
```

---

#### preferred_fuel_network

```text
entity_type = driver
entity_id = <driver_id>
context_key = preferred_fuel_network
context_value = Pilot | Loves | TA | Petro | unknown
```

Meaning:

```text
Soft planning context for fuel preference.
```

This is not a route optimization engine.

---

### Organization context facts

#### preferred_fuel_network

```text
entity_type = organization
entity_id = <organization_id>
context_key = preferred_fuel_network
context_value = Pilot | Loves | TA | Petro | unknown
```

Meaning:

```text
Organization-level soft planning preference.
```

Do not create fuel optimization domain in Stage 2A.

---

### Load context facts

#### declared_load_type

```text
entity_type = load
entity_id = <load_id>
context_key = declared_load_type
context_value = full | partial | unknown
```

Meaning:

```text
full = source / broker / customer declared the load as full
partial = source / broker / customer declared the load as partial
unknown = declared type is unknown
```

Important:

```text
declared_load_type = full
```

does not mean:

```text
partial is impossible
```

Declared load type is a source fact.

Possible remaining capacity is derived reasoning.

Do not overwrite source truth with AI interpretation.

---

### Load stop context facts

#### access_sensitive

```text
entity_type = load_stop
entity_id = <load_stop_id>
context_key = access_sensitive
context_value = true | false | unknown
```

Meaning:

```text
true = this pickup/dropoff may require special driver access context
false = normal stop
unknown = access sensitivity is unknown
```

This is the minimal marker that tells matching/AI when driver access context may matter.

Do not create facility access ontology in Stage 2A.

Do not add stop/location escort facts in Stage 2A.

Do not create:

```text
facility_access_matrix
facility_security_profiles
escort_available
escort_provider
escort_lead_time_hours
```

If real repeated business need appears later, this can be reviewed separately.

---

## Explicitly excluded context facts for Stage 2A

Do not add these in Stage 2A:

```text
driver_can_bypass_stop_time
driver_can_use_workaround
driver_good_for_risky_loads
driver_behavior_score
driver_flexibility_score
driver_appointment_manipulation_allowed
driver_approved_for_access
access_guaranteed
dispatch_allowed
recommended_driver
recommended_partial
recommended_route
best_sequence
```

Reason:

These sound like operational permission or hidden authority.

Stage 2A may expand review surface.

Stage 2A must not expand AI authority.

---

## Allowed derived planning signals

The following are derived signals, not hard truth.

They may appear in:

```text
suggestion explanation
score_breakdown
metadata
UI review signal
planning context summary
```

They must not become:

```text
route plan
dispatch
shipment
deal
settlement
automatic reservation
automatic assignment
automatic broker action
```

---

### possible_remaining_capacity

```text
signal_key = possible_remaining_capacity
signal_value = true | false
```

Meaning:

```text
A load declared as full may still appear to leave weight/length capacity for dispatcher review.
```

This is derived reasoning only.

It must not overwrite `declared_load_type`.

---

### possible_partial_consolidation_review

```text
signal_key = possible_partial_consolidation_review
signal_value = true | false
```

Meaning:

```text
The system sees a potential partial consolidation opportunity for dispatcher review.
```

This is not a consolidation plan.

This is not a command to add a partial.

---

### possible_compatible_partial

```text
signal_key = possible_compatible_partial
signal_value = true | false
```

Meaning:

```text
AI/matching layer found a partial candidate that may fit the current full/current load context.
```

This is not a Stage 2A database entity.

It appears after full/partial compatibility analysis.

It may be based on:

- full load;
- remaining vehicle/load capacity;
- available partial candidates;
- route/geography proximity;
- appointment timing;
- equipment compatibility.

Storage rule:

```text
Do not store as a dedicated table.
```

Allowed storage if explanation is needed:

```text
load_suggestions.explanation
load_suggestions.score_breakdown
load_suggestions.metadata
```

Forbidden:

```text
consolidation_candidates
load_bundle_plans
multi_load_route_plans
partial_compatibility_matrix
route_plan
operational_sequence
```

Allowed wording:

```text
Possible compatible partial for dispatcher review.
```

Forbidden wording:

```text
Recommended partial.
Add this load.
Best sequence.
```

This signal must not automatically create reservation, route plan, dispatch, shipment, deal, or sequence.

---

### route_cost_offset_opportunity

```text
signal_key = route_cost_offset_opportunity
signal_value = possible_partial_near_delivery
```

Meaning:

```text
If a route has toll / detour / route cost burden, the system may check whether a partial near the delivery area could potentially offset that cost.
```

This replaces the incorrect “toll avoidance preference” framing.

This is not mainly about avoiding tolls.

It is about identifying a possible nearby partial that may economically justify a route burden or detour.

Reasoning factors may include:

```text
reasoning_factor = toll_or_route_cost_present
reasoning_factor = delivery_area_has_partial_search_potential
reasoning_factor = additional_partial_may_offset_route_cost
reasoning_factor = dispatcher_review_required
```

Forbidden:

```text
recommended_route
approved_detour
add_this_partial
route_cost_policy_engine
route_plan
```

Allowed wording:

```text
Possible route cost offset opportunity for dispatcher review.
```

---

### matching_freshness

```text
signal_key = matching_freshness
signal_value = fresh | aging | stale | unavailable
```

Meaning:

```text
How current or reliable the matching output is for planning review.
```

This should remain derived logic.

It should not be manually stored as truth.

---

### review_priority

```text
signal_key = review_priority
signal_value = review_first | high_attention | monitor
```

Meaning:

```text
What the dispatcher should review first.
```

Important:

```text
review_priority ≠ command priority
review_first ≠ do first
review_first ≠ execute first
```

Allowed wording:

```text
Review first.
High attention.
Monitor.
```

Avoid:

```text
Do first.
Execute first.
Recommended action.
```

---

## Friendly driver rule

Friendly driver context may expand review surface.

Example:

```text
driver.cooperation_tier = friendly
```

may contribute to:

```text
trusted_driver_available_for_review = true
include_expanded_review_candidates = true
```

Allowed result:

```text
candidate_class = expanded_review
requires_dispatcher_review = true
```

Meaning:

```text
Show additional candidates that a standard filter might hide.
```

Forbidden result:

```text
can_bypass_stop_time = true
can_use_workaround = true
driver_can_handle_this = true
recommended_driver = true
automatic_assignment = true
automatic_hold = true
automatic_dispatch = true
```

Correct principle:

```text
Friendly driver context may expand review surface.
Friendly driver context must not become operational permission.
```

---

## Access context rule

AI/matching may compare:

```text
driver.us_citizen
driver.card
driver.escort_required_for_access
load_stop.access_sensitive
```

But output must remain review-oriented.

Allowed:

```text
signal_key = access_context_review
signal_value = required
reasoning_factor = load_stop_access_sensitive
reasoning_factor = driver_access_context_available
```

Allowed:

```text
signal_key = access_context_limitation
signal_value = driver_access_unknown
```

Forbidden:

```text
access_guaranteed = true
dispatch_allowed = true
driver_approved_for_access = true
```

Access context may limit or qualify planning review.

Access context must not become automatic approval.

---

## Partial/full rule

`declared_load_type = full` remains source truth.

AI/matching must not rewrite it as:

```text
load.is_really_partial = true
```

Allowed:

```text
signal_key = possible_remaining_capacity
signal_value = true
```

Allowed:

```text
signal_key = possible_partial_consolidation_review
signal_value = true
```

Meaning:

```text
Declared full remains source truth.
Possible remaining capacity is only derived reasoning.
```

---

## External candidate boundary

Stage 2A does not introduce full external load-board ingestion.

Raw external rows must not be dumped into core `loads`.

Possible future direction:

```text
external_candidate
```

But not in Stage 2A implementation unless separately reviewed.

If external candidates are considered later, AI prefilter output should remain below hard facts.

Allowed concept:

```text
external_candidate.prefilter_result = likely_relevant
external_candidate.prefilter_reason = equipment_and_region_match
```

Meaning:

```text
AI thinks this candidate may be worth review.
```

Not meaning:

```text
This is now a core load.
```

Never allow AI prefilter to mutate core `loads` automatically.

---

## What AI may do

AI/matching may:

- help compare candidates;
- explain why a candidate is interesting;
- surface possible partial opportunities;
- surface route cost offset opportunities;
- identify review factors;
- summarize limitations;
- generate non-binding review context;
- help prepare dispatcher-facing explanation.

AI/matching must not:

- create deal;
- create shipment;
- create dispatch;
- assign driver;
- notify driver;
- contact broker automatically;
- create broker negotiation workflow;
- create route plan;
- create consolidation plan;
- create automatic reservation;
- mutate core loads from external candidates;
- treat context as operational authority.

---

## What may be saved after AI/matching analysis

Allowed:

```text
matching_runs
load_suggestions
score_breakdown
explanation
reasoning_factors
review signals
candidate snapshot
metadata
```

Not allowed automatically:

```text
core load
deal
shipment
dispatch
driver assignment
broker communication
route plan
consolidation plan
```

A suggestion records why a candidate was shown.

A suggestion is not a commitment.

A suggestion is not a dispatch decision.

---

## Forbidden Stage 2A domains

Do not create these domains in Stage 2A:

```text
driver_behavior_profiles
driver_cooperation_profiles
driver_trust_levels
driver_workaround_capabilities
driver_flexibility_rules
driver_security_clearance_profiles
driver_facility_access_matrix
escort_workflows
escort_scheduling
escort_provider_rules
consolidation_candidates
load_bundle_plans
multi_load_route_plans
partial_compatibility_matrix
route_cost_policy_engine
route_plan
road_events
broker_negotiation_workflow
dispatch_workflow
driver_notification_workflow
```

Reason:

These are either:

- premature abstraction;
- enterprise overengineering;
- hidden execution authority risk;
- table-for-every-thought design;
- context explosion risk.

---

## Stage 2A implementation order

Preferred order:

1. Document this boundary.
2. Review wording and domain vocabulary.
3. Add minimal context facts foundation only after this boundary is accepted.
4. Add whitelist validation for context keys before allowing arbitrary facts.
5. Build deterministic compact planning context before sending anything to AI.
6. Add derived signals only as suggestion explanation / score breakdown / metadata / UI review context.
7. Keep all execution domains inactive until separately reviewed.

Do not begin with:

- external load-board ingestion;
- partial bundling engine;
- route planning;
- broker communication workflow;
- dispatch workflow;
- shipment lifecycle;
- deal lifecycle.

---

## Main compression rule

When in doubt, use this order:

1. Is it core truth?
   Put it in a core table.

2. Is it stable useful context?
   Put it in controlled `context_key / context_value`.

3. Is it uncertain or AI-created?
   Keep it as a derived signal.

4. Is it an action or workflow?
   Do not store or automate it yet.

5. Is it only a future idea?
   Document it, but do not model it.

---

## Final principle

Database stores what is true.

Context layer stores what may matter.

Cognition/matching layer explains what might be relevant.

Dispatcher decides what to do.

AI must not silently convert context into authority.

Friendly driver context may expand review surface.

Friendly driver context must not become operational permission.

Access context may limit or qualify planning review.

Access context must not become automatic approval.

Partial compatibility may produce review signals.

Partial compatibility must not become automatic route, dispatch, shipment, deal, reservation, or sequence.
