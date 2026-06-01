# Changelog

## v0.0.4.b - 2026-06-01 08:58 UTC

Dashboard observability and release wording update for payment lifecycle visibility.

- Added payment status filtering for All, Cleared, Pending, and Failed records.
- Added paginated payment history visibility from the existing analytics data source.
- Added CSV export for payment records matching an optional date range.
- Improved dashboard visibility into Pending, Failed, and Cleared payment lifecycle states.
- Updated public release labels and documentation for v0.0.4.b.

## v0.0.4.a - 2026-05-31 09:04 UTC

Database persistence wording and release note update for the Neon/Drizzle integration.

- Neon/Postgres analytics persistence is now active.
- Drizzle schema and migrations added.
- analysis_runs, agent_runs, payment_records persistence added.
- Legacy JSON fallback retained.
- Dashboard copy updated.

## v0.0.4 — 2026-05-30 09:34 UTC

Polish release focused on demo quality, payment proof visibility, release documentation, and reviewer presentation for Arc/Circle evaluation.

- Added Autonomous Multi-Shipment Optimization.
- Added shipment scoring engine.
- Added ranked load recommendations.
- Added compare-all-loads view.
- Added Agent Economics Dashboard.
- Added analytics API.
- Added per-agent revenue tracking.
- Added file-backed payment analytics persistence.
- Improved Recent Payments table with transaction IDs, tx hashes, explorer proof links, and status badges.
- Improved dashboard section titles, spacing, and concise descriptions.
- Updated visible release version to v0.0.4.
- Updated README to reflect current capabilities and release status.

## v0.0.3a — 2026-05-28 09:23 UTC

- Fixed NaN and null economics values.
- Improved route fallback handling.
- Added safe numeric guards.
- Improved recommendation robustness.
- Fixed partial route calculation edge cases.

## v0.0.3 — 2026-05-28 08:39 UTC

- Added OpenWeather Risk Agent.
- Added weather-aware risk scoring.
- Added historical lane intelligence.
- Added detention, toll, and waiting cost estimates.
- Added true net profit and true margin calculations.
- Added why-ranked explanations.
- Added Stage 1 progress block.
- Updated README and environment example.

## v0.0.2 — 2026-05-26 06:41 UTC

- Migrated demo to US trucking lanes.
- Added 10 preset dry van loads.
- Added 3 demo trucks.
- Switched economics from kilometers to miles.
- Added state-based fuel cost.
- Added driver cost per mile.
- Added ranked multi-load comparison.
- Added v0.0.2 timestamp to the live demo.
