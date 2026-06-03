export type ChangelogEntry = {
  version: string;
  date: string;
  changes: string[];
};

export const changelogEntries: ChangelogEntry[] = [
  {
    version: "v0.0.5.c",
    date: "2026-06-03",
    changes: [
      "Added Weather Agent ledger allocation visibility",
      "Added Weather Agent analytics visibility across paid agent economics surfaces",
      "Updated release/documentation surfaces for Weather Agent operational role",
      "Aligned public release references to v0.0.5.c",
      "No changes to runtime logic, Circle payment flow, database schema, migrations, analytics logic, dashboard functionality, or Scenario Lab behavior",
    ],
  },
  {
    version: "v0.0.5.b",
    date: "2026-06-01",
    changes: [
      "Added homepage access to Scenario Lab as an experimental local simulation",
      "Added Scenario Lab dispatcher UX improvements",
      "Added matching metrics for Scenario Lab results",
      "Added deterministic Why this match explanations",
      "Added dispatcher notes for recommendations",
      "Added browser-only CSV export for matching results",
      "Added dispatcher explainer guide",
      "Updated /grant Current Release block to v0.0.5.b",
      "Clarified Scenario Lab status as experimental local simulation",
      "No changes to Circle payment flow, Gemini integration, database schema, migrations, dashboard logic, analytics persistence, or Scenario Lab matching logic",
    ],
  },
  {
    version: "v0.0.5.a",
    date: "2026-06-01",
    changes: [
      "Added hidden experimental /scenario-lab route",
      "Added sample CSV-based local truck/load matching simulation",
      "Added 50-load and 5-truck sample dataset",
      "Added 0-3 recommendations per truck",
      "Added row-level CSV validation warnings",
      "Added simulated Contact shipper action",
      "Scenario Lab is not yet connected to Circle payments, Gemini, Neon persistence, or dashboard observability",
      "No changes to Circle payment flow, Gemini integration, database schema, migrations, or dashboard logic",
    ],
  },
  {
    version: "v0.0.4.b",
    date: "2026-06-01 08:58 UTC",
    changes: [
      "Added payment status filtering for All, Cleared, Pending, and Failed records",
      "Added paginated payment history visibility from the existing analytics data source",
      "Added CSV export for payment records matching an optional date range",
      "Improved visibility into Pending, Failed, and Cleared payment lifecycle states",
      "Updated public release labels and documentation for v0.0.4.b",
    ],
  },
  {
    version: "v0.0.4.a",
    date: "2026-05-31 09:04 UTC",
    changes: [
      "Activated Neon/Postgres analytics persistence",
      "Added Drizzle schema and migration setup",
      "Added analysis_runs, agent_runs, and payment_records persistence",
      "Retained legacy JSON analytics fallback",
      "Updated dashboard copy for database-backed analytics",
    ],
  },
  {
    version: "v0.0.4",
    date: "2026-05-30 09:34 UTC",
    changes: [
      "Added Autonomous Multi-Shipment Optimization",
      "Added shipment scoring engine and ranked load recommendations",
      "Added compare-all-loads view",
      "Added Agent Economics Dashboard",
      "Added analytics API and per-agent revenue tracking",
      "Added file-backed payment analytics persistence",
      "Improved payment proof visibility with transaction IDs, tx hashes, and explorer links",
      "Improved dashboard spacing, descriptions, and payment status badges",
    ],
  },
  {
    version: "v0.0.3a",
    date: "2026-05-28 09:23 UTC",
    changes: [
      "Fixed NaN and null economics values",
      "Improved route fallback handling",
      "Added safe numeric guards",
      "Improved recommendation robustness",
      "Fixed partial route calculation edge cases",
    ],
  },
  {
    version: "v0.0.3",
    date: "2026-05-28 08:39 UTC",
    changes: [
      "Added OpenWeather Risk Agent",
      "Added weather-aware risk scoring",
      "Added historical lane intelligence",
      "Added detention, toll, and waiting cost estimates",
      "Added true net profit and true margin calculations",
      "Added why-ranked explanations",
      "Added Stage 1 progress block",
      "Updated README and environment example",
    ],
  },
  {
    version: "v0.0.2",
    date: "2026-05-26 06:41 UTC",
    changes: [
      "Migrated demo to US trucking lanes",
      "Added 10 preset dry van loads",
      "Added 3 demo trucks",
      "Switched economics from kilometers to miles",
      "Added state-based fuel cost",
      "Added driver cost per mile",
      "Added ranked multi-load comparison",
      "Added v0.0.2 timestamp to the live demo",
    ],
  },
];

export const latestChangelogEntry = changelogEntries[0];
