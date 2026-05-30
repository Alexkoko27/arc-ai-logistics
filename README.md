# Arc AI Logistics

AI agents for freight coordination, paid with USDC on Arc.

## Links

- Live Demo: https://arc-ai-logistics.vercel.app/
- Grant Pitch Page: https://arc-ai-logistics.vercel.app/grant
- Demo Video: https://arc-ai-logistics.vercel.app/demo/arc-ai-logistics-demo.mp4
- Release Notes: [CHANGELOG.md](CHANGELOG.md)

## Overview

Arc AI Logistics is an agentic logistics coordination system where specialized AI agents evaluate freight opportunities and coordinate USDC-denominated paid agent runs using Arc + Circle infrastructure.

The demo combines truck location, load data, routing, economics, weather risk, historical lane intelligence, recommendation logic, and payment proof into one dispatcher workflow. It is designed to show how logistics software can make AI-agent work economically visible and settle agent execution through Circle and Arc.

## Key Features

- AI logistics analysis
- Multi-agent architecture
- Multi-shipment optimization
- Shipment scoring engine
- Ranked load recommendations
- Compare-all-loads view
- Circle USDC payments
- Arc settlement proof
- Explorer verification
- Agent Payment Ledger
- Agent Economics Dashboard
- Analytics API
- Per-agent revenue tracking
- File-backed payment analytics persistence
- OpenWeather Risk Agent with safe fallback
- Historical lane intelligence with preset/mock data
- Gemini-backed recommendations with local fallback logic

## Core Product Principles

Arc AI Logistics is designed around five core product principles:

1. Real live data
   The system should be able to fetch real operational data such as GPS/fleet location, shipment requests, route conditions, delivery status, and external logistics signals.

2. Faster and cheaper economic calculation
   AI agents should calculate profitability, route cost, delivery timing, and operational tradeoffs faster, cheaper, and more consistently than manual dispatch workflows.

3. Option comparison
   The system should compare multiple shipment and fleet options instead of analyzing only one load in isolation.

4. Learning from past experience
   Over time, the system should learn from previous routes, decisions, delays, costs, risks, and outcomes to improve future recommendations.

5. Opportunity discovery and notifications
   The system should suggest promising freight opportunities and notify users when a better load, route, or dispatch decision becomes available.

These principles define the long-term direction of Arc AI Logistics: an AI-agent coordination system that helps transport operators find cargo, evaluate deals, reduce manual work, and improve delivery control.

## Architecture

![AI Agent System Architecture](public/images/Arc_GPS_plan.png)

AI Agent System: GPS, shipment, route, economics, risk, weather, historical lane, and payment agents coordinate freight decisions and prepare paid agent runs through Circle + Arc infrastructure.

## Current Demo Flow

Truck
→ Load
→ Agent Analysis
→ BOOK / WAIT / SKIP
→ Circle Payment
→ Arc Settlement
→ Explorer Proof
→ Analytics Dashboard

The current demo starts with 3 preset US dry van trucks and 10 preset US dry van loads across Texas, Illinois, and Georgia. Agents evaluate routing, economics, risk, weather, lane history, and payment proof before surfacing dispatch recommendations and analytics.

## Why Arc + Circle

Arc provides stablecoin-native infrastructure suited for programmable settlement and payment proof. USDC is used as the unit of account for paid agent execution.

Circle Developer Controlled Wallets power the current server-side payment flow. A paid agent run creates a real Circle transaction, settles USDC on Arc, returns Circle transaction status, and displays explorer proof when available.

The agent ledger breaks one 0.005 USDC paid analysis into visible work units, preparing the system for future machine-to-machine payment flows without hiding agent execution costs inside the backend.

## Agent Payment Ledger

| Agent | Cost |
| --- | ---: |
| GPS Agent | 0.001 USDC |
| Route Agent | 0.0015 USDC |
| Economics Agent | 0.0015 USDC |
| Risk Agent | 0.001 USDC |
| Total | 0.005 USDC |

This matters because it makes AI-agent execution economically visible and prepares the system for machine-to-machine payment flows. Instead of treating AI analysis as a hidden backend cost, the demo shows how each agent task can become a priced, auditable work unit.

## Agent Economics Dashboard

The dashboard shows:

- Total Payments
- Total USDC Spent
- Average Cost per Analysis
- Total Analyses
- Per-agent revenue
- Recent payment records
- Circle transaction IDs
- Arc tx hashes
- Explorer proof links

Analytics persistence uses a small server-side file-backed store for the current deployment/runtime. It is suitable for the demo and local development; a production version should replace this with a durable database.

## Current Release

v0.0.4 — 2026-05-30 09:34 UTC

Release highlights:

- Autonomous Multi-Shipment Optimization
- Shipment scoring engine
- Ranked load recommendations
- Compare-all-loads view
- Agent Economics Dashboard
- Analytics API
- Per-agent revenue tracking
- Payment analytics persistence
- Improved payment proof visibility
- Improved dashboard presentation

## Current Status

- Live public demo: COMPLETE
- Stage 1 MVP scope: COMPLETE
- AI logistics analysis: COMPLETE
- Multi-agent recommendation flow: COMPLETE
- Multi-shipment optimization: COMPLETE
- Agent Payment Ledger: COMPLETE
- Circle DCW payment flow: COMPLETE
- Real USDC settlement on Arc: COMPLETE
- Explorer proof display: COMPLETE
- Agent Economics Dashboard: COMPLETE
- Analytics persistence: COMPLETE
- Grant pitch page: COMPLETE
- Embedded demo video: COMPLETE
- Manual load entry/import: NEXT
- Durable analytics database: NEXT
- Autonomous dispatch workflows: NEXT

## Data and Integrations

- Google Routes is used for server-side routing when configured, with safe fallback miles when unavailable.
- OpenWeather is used server-side through `OPENWEATHER_API_KEY`; the key is never exposed to the browser.
- The app runs safely without `OPENWEATHER_API_KEY` by using fallback weather risk.
- Gemini is used for AI dispatch recommendations when configured, with local fallback recommendation logic when unavailable.
- Historical lane intelligence is preset/mock data for Texas, Illinois, and Georgia lanes.
- Fuel prices are preset by state for the MVP and do not call a paid fuel API.
- Circle Developer Controlled Wallets are used for server-side USDC payment execution.
- Arc settlement proof is displayed through tx hash and explorer links when returned by Circle.
- Load board APIs are intentionally deferred; manual load entry and import are planned later.

## Known Limitations

- Demo truck and load data is preset.
- Historical lane intelligence is preset/mock data.
- Analytics persistence is file-backed and runtime-scoped, not a durable production database.
- Weather risk is intentionally conservative and uses fallback behavior when live weather is unavailable.
- Load board integrations, user accounts, and manual load entry are deferred.
- The system remains dispatcher-first; AI recommends, while humans decide.

## Future Roadmap

- Manual load entry and CSV import
- Durable analytics storage
- Broker and lane history database
- External GPS / ELD integration
- Load board data import
- Notification workflows for better opportunities
- Emergency dispatch mode
- AI provider abstraction
- More autonomous multi-load dispatch workflows
- Machine-to-machine logistics coordination on Circle + Arc

## Project Notes

- [Future architecture notes](docs/FUTURE_IDEAS.md) — deferred ideas, resilience scenarios, AI provider abstraction, emergency dispatch mode, and future marketplace concepts.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Google Maps
- Google Routes
- OpenWeather
- AI agent orchestration / Gemini
- Circle Developer Platform
- Arc Testnet
- Vercel

## Local Development

```bash
npm install
npm run dev
```

Required environment variables, without values:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_MAPS_SERVER_API_KEY=
GEMINI_API_KEY=
OPENWEATHER_API_KEY=
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
```

Never commit `.env.local`, API keys, entity secrets, wallet secrets, or private keys.

## Grant Reviewer Note

Arc AI Logistics is a live demo and grant-ready prototype showing AI logistics analysis, USDC-denominated paid agent execution, real Circle DCW payments, Arc settlement proof, and payment analytics. The next step is to move from preset demo data toward durable production data, manual load entry, stronger history storage, and more autonomous dispatch workflows.
