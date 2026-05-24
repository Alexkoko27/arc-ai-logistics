# Arc AI Logistics

AI agents for logistics dispatch, paid with USDC on Arc.

## Live Demo

https://arc-ai-logistics.vercel.app/

## Summary

Arc AI Logistics is an agentic logistics coordination system where specialized AI agents evaluate freight opportunities and settle work using USDC on Arc. The agents combine GPS/fleet location, shipment data, routing, economics, and risk signals to produce a clear dispatch recommendation. The demo shows how logistics workflows can move toward programmable agent economics with payment proof on stablecoin-native infrastructure.

## Architecture

![AI Agent System Architecture](public/images/Arc_GPS_plan.png)

AI Agent System: GPS, shipment, route, economics, risk and payment agents coordinate logistics decisions and settle paid agent runs through Circle + Arc.

## How Arc + Circle Are Used

Arc provides a stablecoin-native blockchain environment for agent payments and settlement. USDC is the payment unit for paid agent runs, making the demo a practical model for machine-to-machine agent payments.

Circle Developer Controlled Wallets are used/planned as the wallet and payment layer for programmatic payments. Nanopayments and micropayments are the target model for paying individual AI-agent work units such as route checks, economics calculations, and risk scoring.

The current demo is testnet-focused and shows a paid agent run with transaction proof. The next milestones move toward fully live Circle/Arc settlement, persistent payment records, and production-grade transaction state handling.

## Current Demo Status

The current demo includes:

- Shipment request selection
- Map view with origin/destination
- Agent run flow
- GPS Agent
- Route Agent
- Economics Agent
- Risk Agent
- Recommendation: BOOK / SKIP
- Paid Agent Run panel
- Agent Payment Ledger
- On-chain proof / tx hash display

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

Added project positioning, architecture diagram, /grant page, Circle/Arc framing, and demo video outline.
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

- Next.js
- TypeScript
- Tailwind CSS
- Google Maps
- Gemini / AI agent logic
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
GOOGLE_MAPS_SERVER_API_KEY=
GEMINI_API_KEY=
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
```

Never commit `.env.local` or API keys.

## Demo Video

Demo video coming soon.

Recommended 60-90 second structure:

- 0-10s: Problem - logistics dispatch is still manual and fragmented.
- 10-25s: Select a shipment request.
- 25-40s: Agents fetch GPS, route, economics and risk data.
- 40-55s: App recommends BOOK / SKIP.
- 55-70s: Paid Agent Run shows USDC cost, tx hash and Arc proof.
- 70-90s: Explain why Arc + Circle enable machine-to-machine agent payments.
