# Stage 2A-1-D — Dispatcher Context Facts Persistence Foundation

## Purpose

Stage 2A-1-D adds the persistence foundation for controlled dispatcher context facts.

This stage introduces the `dispatcher_context_facts` table and a small validation-aware service for storing planning-relevant context facts.

The goal is not to make operational decisions. The goal is to preserve bounded context that may later help dispatcher planning review.

## Core Principle

Database stores operational truth.

Context facts store planning-relevant context.

AI may surface review signals.

Dispatcher remains the decision maker.

## Preserved Invariant

The following domain separation remains preserved:

Load ≠ LoadSuggestion ≠ LoadReservation ≠ Deal ≠ Shipment ≠ Dispatch ≠ Settlement

`dispatcher_context_facts` does not collapse or replace any of these entities.

## What Was Added

This stage adds:

- `dispatcher_context_facts` Drizzle schema definition
- SQL migration for the table
- controlled entity type checks
- controlled source type checks
- confidence bounds
- unique fact identity per organization/entity/key
- `contextFactService.ts`
- validation-aware upsert helper

## Table Role

`dispatcher_context_facts` stores controlled facts such as:

- `driver.cooperation_tier = friendly`
- `driver.us_citizen = true`
- `driver.card = unknown`
- `organization.preferred_fuel_network = Pilot`
- `load.declared_load_type = partial`
- `load_stop.access_sensitive = true`

These facts may later expand planning review surface.

They are not workflow state.

They are not dispatch permission.

They are not final recommendations.

## Validation Boundary

The persistence service calls `validateDispatcherContextFactInput()` before inserting or updating a fact.

Invalid context keys or values must be rejected before persistence.

Allowed source types are controlled:

- `dispatcher_entered`
- `imported`
- `system_inferred`
- `ai_surfaced`

The term `ai_surfaced` is intentionally not `ai_generated`.

AI may surface context for review, but must not create arbitrary operational truth.

## Forbidden Semantics

The table must not store facts such as:

- `driver.dispatch_allowed = true`
- `recommended_driver`
- `best_sequence`
- `driver_can_bypass_stop_time`
- `auto_assign`
- `dispatch_ready`

These represent operational authority, workflow control, or recommendation finality.

They do not belong in context facts.

## Confidence Boundary

`confidence` is bounded between 0 and 1.

Confidence describes confidence in the context observation.

It must not be interpreted as:

- dispatch confidence
- assignment permission
- workflow readiness
- operational correctness
- recommendation authority

## No Workflow Side Effects

This stage does not:

- change matching behavior
- change reservation behavior
- change load status
- change vehicle status
- create dispatches
- create deals
- create shipments
- contact brokers
- optimize routes
- auto-assign drivers
- automate operational decisions

## Why No Arbitrary Metadata Blob

This table intentionally avoids a broad arbitrary `metadata` JSON blob.

The goal is to prevent uncontrolled ontology growth and semantic authority drift.

Future extensions should remain explicit, reviewed, and whitelist-controlled.

## Future Expansion Boundary

Future stages may add:

- read/query helpers
- dispatcher-reviewed context entry UI
- planning review visibility
- controlled AI-surfaced context proposals

Future stages must still avoid:

- dispatch execution
- hidden operational permissions
- autonomous recommendations
- uncontrolled AI-generated facts
- generic table-for-every-thought architecture
