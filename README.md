# Arc AI Logistics

AI agents for freight coordination, paid with USDC on Arc.

## Links

- Live Demo: https://arc-ai-logistics.vercel.app/
- Grant Pitch Page: https://arc-ai-logistics.vercel.app/grant
- Demo Video: https://arc-ai-logistics.vercel.app/demo/arc-ai-logistics-demo.mp4

## Short Pitch

Logistics dispatch is fragmented across GPS/fleet systems, routing tools, pricing inputs, risk checks, and payment workflows. Dispatchers often evaluate shipment opportunities manually, even when the decision depends on real-time location, route conditions, economics, and operational constraints.

Arc AI Logistics is an agentic logistics coordination system where specialized AI agents evaluate freight opportunities and coordinate USDC-denominated paid agent runs using Arc + Circle infrastructure. The demo shows how GPS/Fleet, Route, Economics, Risk, Weather, and Historical Lane agents can work together to produce a clear BOOK / WAIT / SKIP recommendation for a shipment request.

The current demo is testnet-oriented and demonstrates how agent execution can be priced in USDC and prepared for settlement on Arc using Circle infrastructure. It is designed as a grant-ready prototype for machine-to-machine payment flows in logistics, with the next milestone focused on real Arc testnet settlement and Circle Developer Controlled Wallet integration.

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

## Stage 1 MVP Scope

Stage 1 MVP scope is completed in v0.0.3.

The current demo includes:

- US trucking preset demo data
- 3 dry van trucks
- 10 preset dry van loads
- Miles-based routing and economics
- Google Routes with fallback distance estimates
- Server-side OpenWeather Risk Agent with fallback behavior
- Preset/mock historical lane intelligence
- State-based preset fuel prices
- Detention, toll, and waiting cost estimates
- True net profit and true margin calculations
- Multi-load comparison
- Why-ranked explanations
- Risk-aware BOOK / WAIT / SKIP recommendations
- Agent Payment Ledger and USDC-denominated paid agent run panel

## What The Demo Shows

- Shipment request selection
- Map view with origin/destination
- GPS/Fleet Agent
- Route Agent
- Economics Agent
- Risk Agent
- Weather Risk Agent
- Historical Lane Intelligence
- BOOK / WAIT / SKIP recommendation
- Agent Payment Ledger
- USDC-denominated paid agent run
- On-chain proof / testnet proof simulation
- Embedded demo video on /grant

## Architecture

![AI Agent System Architecture](public/images/Arc_GPS_plan.png)

AI Agent System: GPS, shipment, route, economics, risk, weather, historical lane, and payment agents coordinate freight decisions and prepare paid agent runs through Circle + Arc infrastructure.

## Project Notes

- [Future architecture notes](docs/FUTURE_IDEAS.md) — deferred ideas, resilience scenarios, AI provider abstraction, emergency dispatch mode, and future marketplace concepts.

## Why Arc + Circle

Arc is a stablecoin-native blockchain environment suited for programmable settlement. For this project, Arc is the target infrastructure for agent payment proof, testnet settlement, and future machine-to-machine commerce between logistics services.

USDC is used as the unit of account for agent execution. In the current demo, a paid agent run is priced at 0.005 USDC, making the cost of each AI-agent work unit visible inside the product.

Circle Developer Controlled Wallets are the planned wallet layer for programmatic USDC payments. The goal is for a Payment Agent to initiate, track, and reconcile agent execution payments without exposing private keys to users or application code.

Nanopayment-style flows are the target model for paying individual agent work units such as GPS checks, route analysis, economics calculations, risk scoring, weather checks, and lane intelligence. The current demo shows the workflow and testnet proof concept; the next milestone is real Arc testnet settlement.

## Data and Integrations

- Google Routes is used for server-side routing when configured, with safe fallback miles when unavailable.
- OpenWeather is used server-side through `OPENWEATHER_API_KEY`; the key is never exposed to the browser.
- The app runs safely without `OPENWEATHER_API_KEY` by using fallback weather risk.
- Gemini is used for AI dispatch recommendations when configured, with local fallback recommendation logic when unavailable.
- Historical lane intelligence is preset/mock data for Texas, Illinois, and Georgia lanes.
- Fuel prices are preset by state for the MVP and do not call a paid fuel API.
- Load board APIs are intentionally deferred; manual load entry and import are planned later.

## Agent Payment Ledger

The demo includes a USDC-denominated ledger for agent execution:

| Agent | Cost |
| --- | ---: |
| GPS Agent | 0.001 USDC |
| Route Agent | 0.0015 USDC |
| Economics Agent | 0.0015 USDC |
| Risk Agent | 0.001 USDC |
| Total | 0.005 USDC |

This matters because it makes AI-agent execution economically visible and prepares the system for machine-to-machine payment flows. Instead of treating AI analysis as a hidden backend cost, the demo shows how each agent task can become a priced, auditable work unit.

## Current Status

Current status:

- Live public demo: COMPLETE
- Stage 1 MVP scope: COMPLETE
- Agent cards and recommendation flow: COMPLETE
- Agent Payment Ledger: COMPLETE
- Core product principles documented: COMPLETE
- OpenWeather Risk Agent with fallback: COMPLETE
- Historical lane intelligence: COMPLETE
- Expanded trucking economics: COMPLETE
- Why-ranked explanations: COMPLETE
- Grant pitch page: COMPLETE
- Embedded demo video: COMPLETE
- Real Arc testnet settlement: NEXT
- Circle Developer Controlled Wallet integration: NEXT
- Manual load entry/import: NEXT
- Autonomous multi-shipment optimization: NEXT

## Roadmap / Grant Milestones

### Milestone 1 — Live AI Logistics Demo
Status: COMPLETE

Built and deployed a working public demo of an AI-powered logistics dispatcher.
The current demo includes shipment selection, map view, agent cards, route/economics/risk analysis, BOOK/WAIT/SKIP recommendation, and a paid agent run panel.

### Milestone 2 — Agent Payment Ledger
Status: COMPLETE

Added a USDC-denominated ledger for the agent run.
The UI now shows per-agent execution costs for GPS, Route, Economics, and Risk agents, plus the total agent run cost of 0.005 USDC.

### Milestone 3 — Stage 1 Logistics MVP
Status: COMPLETE

Closed the Stage 1 MVP scope with US trucking demo data, live/fallback weather risk, historical lane intelligence, expanded true-net economics, multi-load comparison, and why-ranked explanations.

### Milestone 4 — Real Arc Testnet Settlement
Status: NEXT

Replace the current demo/testnet-style transaction proof with real Arc testnet settlement.
Each paid agent run should produce a real transaction hash and explorer-confirmed proof.

### Milestone 5 — Circle Developer Controlled Wallet Integration
Status: NEXT

Integrate Circle Developer Controlled Wallets for programmatic USDC payments.
The goal is to let the Payment Agent initiate and track agent payments securely without exposing private keys.

### Milestone 6 — Autonomous Multi-Shipment Optimization
Status: NEXT

Extend the demo from ranking preset matches to more autonomous dispatch workflows.
Agents should compare load opportunities, account for weather, history, timing, profit, risk, and truck availability, then recommend the best load.

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

Never commit `.env.local`, API keys, entity secrets, or private keys.

## Grant Reviewer Note

Arc AI Logistics is currently a live demo and grant-ready prototype. The next step is to replace the demo/testnet proof layer with real Arc testnet settlement and Circle Developer Controlled Wallet powered USDC payments for agent execution.
