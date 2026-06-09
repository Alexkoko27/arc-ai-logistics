# Stage 2A-1-B — Context Facts Schema

## Current branch

`dev-production-transition`

## Depends on

- `docs/architecture/stage-2a-context-facts-boundary.md`
- `docs/architecture/stage-2a-context-facts-whitelist.md`

## Purpose

This document defines the minimal schema contract for controlled dispatcher context facts.

The goal is to create a safe database foundation for operationally relevant context without allowing context to become hidden operational authority.

This stage does **not** introduce:

- AI automation
- automatic dispatch
- automatic reservation
- driver assignment
- shipment lifecycle
- deal lifecycle
- settlement workflow
- broker communication workflow
- external load-board ingestion
- route planning engine
- partial bundle planning engine

## Core architecture rule

Database stores what is true.

Context facts store what may matter.

Cognition and matching may derive what may be relevant.

Dispatcher decides what to do.

AI must not silently convert context into authority.

The existing invariant remains unchanged:

```text
Load ≠ LoadSuggestion ≠ LoadReservation ≠ Deal ≠ Shipment ≠ Dispatch ≠ Settlement
```

`LoadSuggestion` remains analytical planning output.

`LoadReservation` remains a temporary operational hold.

Context facts must not create or imply dispatch authority.

---

# Table: dispatcher_context_facts

## Purpose

`dispatcher_context_facts` stores controlled key/value context facts related to existing dispatcher entities.

It is intended for compact planning context, not for arbitrary AI memory or operational decisions.

Example:

```text
entity_type = driver
entity_id = <driver_id>
context_key = cooperation_tier
context_value = friendly
```

Meaning:

A driver has a known cooperation context that may be relevant for dispatcher review.

Not meaning:

The system may automatically assign this driver.

Not meaning:

The driver is allowed to bypass rules.

Not meaning:

The AI may make an operational decision.

---

# Proposed columns

## id

Type:

```text
uuid primary key
```

Purpose:

Unique identifier for the context fact.

## organization_id

Type:

```text
uuid not null
```

References:

```text
organizations.id
```

Purpose:

Every context fact must be organization-scoped.

No global dispatcher context facts.

No cross-organization context leakage.

## entity_type

Type:

```text
text not null
```

Allowed values for Stage 2A-1:

```text
driver
organization
load
load_stop
```

Purpose:

Identifies what kind of object this context fact belongs to.

Must be validated against the whitelist.

## entity_id

Type:

```text
uuid not null
```

Purpose:

Identifies the specific entity instance.

Expected references by `entity_type`:

```text
driver       -> drivers.id
organization -> organizations.id
load         -> loads.id
load_stop    -> load_stops.id
```

Important:

A database-level polymorphic foreign key is not expected.

Entity existence and organization consistency should be enforced by service/helper validation.

## context_key

Type:

```text
text not null
```

Purpose:

Controlled context key.

Must be allowed by the Stage 2A whitelist for the given `entity_type`.

Examples:

```text
cooperation_tier
us_citizen
card
escort_required_for_access
preferred_fuel_network
declared_load_type
access_sensitive
```

Forbidden examples:

```text
recommended_driver
recommended_partial
recommended_route
best_sequence
dispatch_allowed
access_guaranteed
driver_can_bypass_stop_time
driver_can_use_workaround
driver_behavior_score
driver_flexibility_score
```

## context_value

Type:

```text
text not null
```

Purpose:

Controlled value for the given `entity_type + context_key`.

Allowed values must come from the whitelist.

Examples:

```text
regular
friendly
true
false
unknown
Pilot
Loves
TA
Petro
full
partial
```

Important:

`context_value` must not be free-form business logic.

It must not contain operational instructions.

## source

Type:

```text
text not null
```

Allowed values for Stage 2A-1:

```text
dispatcher
system_seed
import_review
ai_suggested_review
```

Meaning:

`dispatcher`

The fact was entered or confirmed by a dispatcher/operator.

`system_seed`

The fact came from controlled demo/seed data.

`import_review`

The fact came from a reviewed import process.

`ai_suggested_review`

AI suggested the fact for human review.

Important:

`ai_suggested_review` does not mean the fact is trusted truth.

AI-suggested context must remain review-oriented and should not automatically become operational authority.

## confidence

Type:

```text
text not null
```

Allowed values:

```text
confirmed
unconfirmed
unknown
```

Purpose:

Describes whether the context fact is confirmed enough to be used as planning context.

Important:

`confirmed` means confirmed as context.

It does not mean dispatch approval.

It does not mean access approval.

It does not mean operational permission.

## metadata

Type:

```text
jsonb nullable
```

Purpose:

Optional lightweight supporting information.

Allowed examples:

```json
{
  "note": "Dispatcher-confirmed preference"
}
```

```json
{
  "review_reason": "Suggested during manual import review"
}
```

Forbidden metadata usage:

- route plans
- dispatch plans
- broker negotiation instructions
- driver workaround instructions
- hidden AI conclusions
- arbitrary external load-board payload dumps
- sensitive personal details
- credentials
- API keys
- private customer/broker terms

## created_at

Type:

```text
timestamp not null
```

Purpose:

Creation time.

## updated_at

Type:

```text
timestamp not null
```

Purpose:

Last update time.

---

# Suggested uniqueness rule

For Stage 2A-1, only one current fact should exist for:

```text
organization_id + entity_type + entity_id + context_key
```

Reason:

Avoid conflicting active facts such as:

```text
driver cooperation_tier = regular
driver cooperation_tier = friendly
```

at the same time.

If historical tracking is needed later, it should be designed separately.

Do not add fact history in Stage 2A-1.

---

# Suggested indexes

Recommended indexes:

```text
organization_id
organization_id + entity_type
organization_id + entity_type + entity_id
organization_id + entity_type + entity_id + context_key
```

Reason:

The main read pattern will be:

- get context for one driver
- get context for one load
- get context for one load stop
- build compact planning context for dispatcher/matching review

---

# Validation requirements

Stage 2A-1 must not rely only on UI discipline.

A validation helper must enforce:

```text
entity_type is allowed
context_key is allowed for entity_type
context_value is allowed for entity_type + context_key
source is allowed
confidence is allowed
entity belongs to organization
for organization entity_type, entity_id must equal organization_id
```

## Required helper concept

Suggested helper:

```text
validateDispatcherContextFactInput()
```

Possible file:

```text
lib/dispatch/dispatcherContextFacts.ts
```

or:

```text
lib/dispatch/contextFacts.ts
```

The exact file name can be decided during implementation.

## Validation must reject

Examples that must be rejected:

```text
driver.recommended_driver = true
driver.driver_can_bypass_stop_time = true
driver.dispatch_allowed = true
load.recommended_partial = true
load.best_sequence = true
load_stop.access_guaranteed = true
```

## Validation must allow

Examples that should be allowed:

```text
driver.cooperation_tier = regular
driver.cooperation_tier = friendly
driver.us_citizen = true
driver.us_citizen = false
driver.us_citizen = unknown
driver.card = true
driver.card = false
driver.card = unknown
driver.escort_required_for_access = true
driver.escort_required_for_access = false
driver.escort_required_for_access = unknown
driver.preferred_fuel_network = Pilot
driver.preferred_fuel_network = Loves
driver.preferred_fuel_network = TA
driver.preferred_fuel_network = Petro
driver.preferred_fuel_network = unknown

organization.preferred_fuel_network = Pilot
organization.preferred_fuel_network = Loves
organization.preferred_fuel_network = TA
organization.preferred_fuel_network = Petro
organization.preferred_fuel_network = unknown

load.declared_load_type = full
load.declared_load_type = partial
load.declared_load_type = unknown

load_stop.access_sensitive = true
load_stop.access_sensitive = false
load_stop.access_sensitive = unknown
```

---

# Important semantic rules

## Friendly driver context

Allowed meaning:

```text
cooperation_tier = friendly
```

means:

The driver may be relevant for expanded dispatcher review.

Forbidden meaning:

```text
driver can bypass appointment rules
driver is automatically recommended
driver is approved for risky loads
driver can be assigned automatically
driver can be dispatched automatically
```

Final rule:

Friendly driver context may expand review surface.

Friendly driver context must not become operational permission.

## Access context

Allowed meaning:

```text
load_stop.access_sensitive = true
```

means:

This stop may require access context review.

Allowed matching/cognition output:

```text
access_context_review
access_context_limitation
```

Forbidden meaning:

```text
access guaranteed
dispatch allowed
driver approved for access
escort workflow created
```

## Declared load type

Allowed meaning:

```text
load.declared_load_type = full
```

means:

The source declared the load as full.

Forbidden meaning:

```text
partial is impossible
AI rewrote load type
load is really partial
```

Derived reasoning may later say:

```text
possible_remaining_capacity = true
possible_partial_consolidation_review = true
```

but this must remain planning review context.

---

# What this schema may support later

This table may later support:

- compact dispatcher planning context
- matching explanation enrichment
- review-oriented candidate expansion
- access-context review signals
- possible partial-consolidation review signals
- route-cost-offset review signals

This table must not support:

- dispatch workflow
- shipment lifecycle
- deal lifecycle
- settlement lifecycle
- automatic broker communication
- automatic driver assignment
- automatic reservation
- automatic route planning
- automatic load bundling

---

# Stage 2A-1 implementation boundary

Implementation should be limited to:

```text
database table
Drizzle schema
migration
whitelist validation helper
possibly seed/demo context facts
read-only query helper
```

Implementation should not include:

```text
UI mutation panel
dispatcher edit workflow
AI-generated writes
matching behavior changes
partial search
route planning
external candidates
broker email
driver notification
dispatch/deal/shipment changes
```

---

# Recommended implementation order

1. Add `dispatcher_context_facts` table to `lib/db/schema.ts`.
2. Add migration for the new table.
3. Add whitelist constants and validation helper.
4. Add entity organization consistency checks in service/helper layer.
5. Optionally seed a tiny number of safe demo facts.
6. Add read-only query helper for compact planning context.
7. Run validation:

```bash
git diff --check
npm run lint
npm run build
```

8. Commit in a narrow commit.

Suggested commit message:

```text
feat: add dispatcher context facts foundation
```

or, if only adding the schema/migration first:

```text
feat: add dispatcher context facts schema
```

---

# Non-goals

Stage 2A-1 is not the place to design:

- driver behavior ontology
- access clearance system
- escort scheduling
- partial bundle engine
- route optimization
- external board ingestion
- broker negotiation workflow
- AI execution workflow

Those may only be considered later after separate architecture review.

---

# Final rule

Context facts are controlled planning context.

They are not decisions.

They are not permissions.

They are not commitments.

They are not dispatch authority.

The dispatcher remains the decision maker.
