# Arc AI Logistics

AI agents for freight coordination, paid with USDC on Arc.

## Links

- Live Demo: https://arc-ai-logistics.vercel.app/
- Grant Pitch Page: https://arc-ai-logistics.vercel.app/grant
- Demo Video: https://arc-ai-logistics.vercel.app/demo/arc-ai-logistics-demo.mp4

## Short Pitch

Logistics dispatch is fragmented across GPS/fleet systems, routing tools, pricing inputs, risk checks, and payment workflows. Dispatchers often evaluate shipment opportunities manually, even when the decision depends on real-time location, route conditions, economics, and operational constraints.

Arc AI Logistics is an agentic logistics coordination system where specialized AI agents evaluate freight opportunities and coordinate USDC-denominated paid agent runs using Arc + Circle infrastructure. The demo shows how GPS/Fleet, Route, Economics, and Risk agents can work together to produce a clear BOOK / SKIP recommendation for a shipment request.

The current demo is testnet-oriented and demonstrates how agent execution can be priced in USDC and prepared for settlement on Arc using Circle infrastructure. It is designed as a grant-ready prototype for machine-to-machine payment flows in logistics, with the next milestone focused on real Arc testnet settlement and Circle Developer Controlled Wallet integration.

## What The Demo Shows

- Shipment request selection
- Map view with origin/destination
- GPS/Fleet Agent
- Route Agent
- Economics Agent
- Risk Agent
- BOOK / SKIP recommendation
- Agent Payment Ledger
- USDC-denominated paid agent run
- On-chain proof / testnet proof simulation
- Embedded demo video on /grant

## Architecture

![AI Agent System Architecture](public/images/Arc_GPS_plan.png)

AI Agent System: GPS, shipment, route, economics, risk, and payment agents coordinate freight decisions and prepare paid agent runs through Circle + Arc infrastructure.

## Why Arc + Circle

Arc is a stablecoin-native blockchain environment suited for programmable settlement. For this project, Arc is the target infrastructure for agent payment proof, testnet settlement, and future machine-to-machine commerce between logistics services.

USDC is used as the unit of account for agent execution. In the current demo, a paid agent run is priced at 0.005 USDC, making the cost of each AI-agent work unit visible inside the product.

Circle Developer Controlled Wallets are the planned wallet layer for programmatic USDC payments. The goal is for a Payment Agent to initiate, track, and reconcile agent execution payments without exposing private keys to users or application code.

Nanopayment-style flows are the target model for paying individual agent work units such as GPS checks, route analysis, economics calculations, and risk scoring. The current demo shows the workflow and testnet proof concept; the next milestone is real Arc testnet settlement.

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
- Agent cards and recommendation flow: COMPLETE
- Agent Payment Ledger: COMPLETE
- Grant pitch page: COMPLETE
- Embedded demo video: COMPLETE
- Real Arc testnet settlement: NEXT
- Circle Developer Controlled Wallet integration: NEXT
- Autonomous multi-shipment optimization: NEXT

## Roadmap / Grant Milestones

### Milestone 1 — Live AI Logistics Demo
Status: COMPLETE

Built and deployed a working public demo of an AI-powered logistics dispatcher.
The current demo includes shipment selection, map view, agent cards, route/economics/risk analysis, BOOK/SKIP recommendation, and a paid agent run panel.

### Milestone 2 — Agent Payment Ledger
Status: COMPLETE

Added a USDC-denominated ledger for the agent run.
The UI now shows per-agent execution costs for GPS, Route, Economics, and Risk agents, plus the total agent run cost of 0.005 USDC.

### Milestone 3 — Grant-Ready Public Pitch
Status: COMPLETE

Added project positioning, architecture diagram, /grant page, Circle/Arc framing, and demo video.
The project now has a clearer public explanation for ecosystem reviewers and grant submission.

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

Extend the demo from analyzing one selected shipment to comparing multiple shipment requests automatically.
Agents should rank opportunities by distance, ETA, profit, risk, and truck availability, then recommend the best load.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Google Maps
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
GOOGLE_MAPS_API_KEY=
GEMINI_API_KEY=
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
```

Never commit `.env.local`, API keys, entity secrets, or private keys.

## Grant Reviewer Note

Arc AI Logistics is currently a live demo and grant-ready prototype. The next step is to replace the demo/testnet proof layer with real Arc testnet settlement and Circle Developer Controlled Wallet powered USDC payments for agent execution.
