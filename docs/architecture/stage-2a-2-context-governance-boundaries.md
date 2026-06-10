# Stage 2A-2 — Context Governance Boundaries

## Stable checkpoint

Current branch:

`dev-production-transition`

Current checkpoint:

`936e81b docs: define context governance boundaries`

Previous implementation checkpoint:

`504ee1d feat: show dispatcher context facts review surface`

## Purpose

Stage 2A-2 defines how governed dispatcher context facts may be read and displayed without becoming operational authority.

The purpose of this boundary is to prevent context facts from silently turning into:

- dispatch permissions
- driver assignments
- recommendation engines
- workflow automation
- hidden operational policy

## Current allowed behavior

Context facts may be:

- persisted through controlled validation
- read through organization-scoped query helpers
- displayed as dispatcher review context
- shown with source type and confidence
- used to explain available planning context

Context facts may not:

- assign drivers
- select vehicles
- rank operational choices
- mutate reservations
- create dispatch readiness
- trigger broker or driver workflow
- override matching freshness
- bypass human review

## Core distinction

A context fact is an observation.

It is not a decision.

Example:

Allowed:

`driver.cooperation_tier = friendly`

Forbidden interpretation:

`driver should be assigned to this load`

Allowed:

`load_stop.access_sensitive = true`

Forbidden interpretation:

`dispatch is blocked or approved`

Allowed:

`organization.preferred_fuel_network = Pilot`

Forbidden interpretation:

`route must use Pilot`

## Source type governance

Allowed source types:

- `dispatcher_entered`
- `imported`
- `system_inferred`
- `ai_surfaced`

Source type meaning:

### dispatcher_entered

Human-entered operational context.

Strongest review visibility, but still not operational authority.

### imported

External system context.

Visible for review, but must not be treated as automatically verified operational truth.

### system_inferred

Derived system context.

Must remain explainable and bounded.

### ai_surfaced

AI-highlighted context.

AI may surface review-relevant observations.

AI must not create operational truth or operational permission.

## Confidence governance

`confidence` represents confidence in the context observation only.

It does not represent:

- dispatch confidence
- driver suitability
- assignment readiness
- operational permission
- recommendation strength

## Planning visibility rule

Planning-visible context may support human review.

It must not directly change:

- matching score
- suggestion rank
- load readiness
- vehicle readiness
- reservation availability
- dispatch workflow

Any future use of context facts in cognition must be explicit, explainable, and review-oriented.

## Forbidden inference categories

The system must not infer or persist context facts that imply:

- `dispatch_allowed`
- `recommended_driver`
- `best_vehicle`
- `best_sequence`
- `auto_assign`
- `dispatch_ready`
- `driver_can_bypass_stop_time`
- `broker_should_be_contacted`
- `hold_this_load`
- `execute_route`

These belong to operational authority or workflow control, not governed context facts.

## Human review boundary

Context facts may raise awareness.

They may not make decisions.

Correct wording:

- "Visible for dispatcher review"
- "Planning context observation"
- "Review context only"
- "May require human attention"

Avoid wording:

- "Recommended"
- "Best"
- "Should assign"
- "Dispatch ready"
- "Approved"
- "Use this driver"
- "Execute"

## Future consumption rule

Before context facts influence cognition, the system must define:

- which context keys are consumable
- which source types are trusted for which visibility
- how stale facts are labeled
- how conflicts are displayed
- how the UI explains influence
- what remains forbidden

No context fact may influence operational behavior invisibly.

## Preserved invariant

The following separation remains preserved:

Load ≠ LoadSuggestion ≠ LoadReservation ≠ Deal ≠ Shipment ≠ Dispatch ≠ Settlement

`dispatcher_context_facts` is a planning-context layer.

It does not replace workflow entities.
It does not collapse planning into execution.
