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

## Grant Milestones

1. Real Arc Testnet settlement for paid agent runs
   - Replace simulated tx proof with real Arc testnet transaction flow.
   - Store tx hash and explorer link per agent run.

2. Circle Developer Controlled Wallet integration
   - Programmatic wallet creation/management.
   - USDC payments for agent execution.

3. Agent Payment Ledger
   - Track per-agent micro-payments.
   - Show total paid per run.
   - Prepare for nanopayment-style settlement.

4. Multi-shipment autonomous optimization
   - Let agents compare several shipment requests.
   - Select the best one based on ETA, profit, risk and location.

5. Public demo and grant-ready documentation
   - Improve /grant page.
   - Add short demo video.
   - Prepare the project for Circle/Arc ecosystem review.

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
