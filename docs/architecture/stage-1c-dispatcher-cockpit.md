# Stage 1C Dispatcher Cockpit

Stage 1C adds a read-only internal dispatcher cockpit at:

```text
/dispatcher
```

The page displays persisted Stage 1B dispatcher data:

- vehicles with equipment, availability, latest known location, and assigned driver
- loads with lane, timing, status, source, economics, and active reservation visibility
- latest matching run metadata
- load suggestions with rank, score, score breakdown, estimated deadhead, estimated profit, explanation, status, and immutable snapshots

The cockpit keeps domain concepts separate:

```text
Load != LoadSuggestion != LoadReservation != Deal != Shipment != Dispatch != Settlement
```

Stage 1C does not add auth, live GPS, live load board ingestion, broker negotiation, documents, settlements, payments, production migrations, deploys, external API calls, or AI API calls.

## Data Access

`lib/dispatch/cockpitQueries.ts` reads existing Stage 1A/1B tables and returns view data for the server-rendered page.

The UI does not recalculate matching scores. It displays persisted values from:

- `matching_runs`
- `load_suggestions`
- `load_reservations`
- Stage 1B immutable snapshots

If no database URL is configured, the page renders a safe empty configuration message instead of attempting database access.

## Local Dev Flow

Use the dev database only:

```bash
npx tsx --env-file=.env.dev.local scripts/seed-dispatcher-mock-data.ts
npx tsx --env-file=.env.dev.local scripts/run-matching.ts
npx tsx --env-file=.env.dev.local scripts/verify-reservation-lock.ts
npm run dev
```

Then open:

```text
http://localhost:3000/dispatcher
```
