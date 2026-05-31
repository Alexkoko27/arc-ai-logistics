# Database Design

## Decision

Arc AI Logistics uses `analysis_runs` as the primary business entity for the database-backed MVP.

The product does not charge users for creating a shipment record. Users pay for AI analysis execution: a coordinated run of logistics agents that evaluates shipment context, produces a recommendation, and may create Circle / Arc payment proof.

Because of that, the database is intentionally centered around:

```text
analysis_runs -> agent_runs -> payment_records
```

`shipments` stores load context used as input for analysis. A shipment may be imported, entered manually, or supplied by demo data, but it is not the core paid event in the current product model.

## Why Analysis Run Is Primary

One shipment can have multiple analysis runs:

- different agent sets
- different route or weather context
- different model/provider configurations
- different prices
- different payment outcomes
- repeated re-analysis over time

This makes `analysis_runs` the durable record of the paid or unpaid AI work that actually happened.

## Shipment Role

`shipments` keeps references and contextual data so the system can answer what was analyzed.

Shipment fields are intentionally broad:

- `external_ref`
- `origin`
- `destination`
- `cargo_type`
- `status`
- `metadata`

The schema keeps shipment references so future migration remains possible if the product evolves toward persistent shipment lifecycle management.

## Agent Model

Agents are rows in the `agents` table, not fixed database columns.

Default system agents are seeded as rows:

- `gps-agent`
- `route-agent`
- `risk-agent`
- `economics-agent`

`owner_user_id` is nullable. `null` means a system/default agent. A non-null value may later represent a user-owned or tenant-owned custom agent.

`agent_runs` stores one concrete execution of one agent inside one analysis run. It includes `agent_version` and `agent_snapshot` so historical runs remain understandable even if the agent name, price, prompt, or implementation changes later.

## Payments

`payment_records` stores actual Circle / Arc payment records and on-chain proof:

- amount
- status
- Circle transaction ID
- Arc transaction hash
- explorer URL
- non-secret raw payment metadata

Private keys, Circle API keys, entity secrets, wallet secrets, Gemini keys, OpenWeather keys, Google keys, and `DATABASE_URL` must never be stored in the database.

`agent_payment_allocations` allocates one payment record across one or more agent runs.

Before creating an allocation, application logic must ensure:

```text
payment_record.analysis_run_id == agent_run.analysis_run_id
```

The UI must not be trusted as the source of this rule.

## Dashboard Metrics

The dashboard reads metrics server-side from the database.

Metric definitions:

- Total Payments: `count(payment_records)`
- Total USDC Spent: `sum(payment_records.amount_usdc)` for confirmed statuses
- Average Cost per Analysis: confirmed/success amount divided by paid analysis runs
- Total Analyses: `count(analysis_runs)`
- Per-Agent Revenue: `sum(agent_payment_allocations.amount_usdc)` grouped by agent
- Recent Payments: `payment_records` joined to `analysis_runs` and `shipments` when available

`Total Analyses` uses `analysis_runs` because this schema treats AI analysis execution as the core business event.

## Future Reconsideration

If Arc AI Logistics later evolves toward persistent shipment lifecycle management, dispatch workflows, carrier workflows, or fleet management, the primary entity may be reconsidered as `shipment`.

That would be appropriate if the system starts managing shipment state end-to-end rather than primarily selling or tracking AI analysis execution.

The current schema keeps shipment references and metadata so that migration path remains open.

## Legacy Analytics Store

The v0.0.4 runtime JSON analytics store remains isolated as a fallback while the database path is introduced.

The legacy store should not be extended with new product behavior. Once the Neon database path is confirmed in production and local development, the legacy store can be retired through a separate, explicit cleanup task.
