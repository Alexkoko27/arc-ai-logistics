# Arc AI Logistics

A Next.js demo dApp for AI-assisted logistics on Arc Testnet. The app demonstrates a dispatcher workflow where a user selects a vehicle and shipment, pays a tiny USDC fee on Arc Testnet, and receives an AI-assisted recommendation plus on-chain proof.

## Demo Scenario

```text
Dispatcher selects truck + shipment
-> GPS Agent validates truck position
-> Route Agent estimates pickup and delivery distance / ETA
-> Economics Agent estimates costs, revenue, and profit
-> Risk Agent checks timing, vehicle status, cross-border, and load factors
-> Circle Developer-Controlled Wallet pays 0.005 USDC on Arc Testnet
-> UI shows recommendation and on-chain transaction proof
```

This milestone focuses on Arc/Circle testnet demonstration value: cheap stablecoin-native paid AI agent actions with a visible transaction trail.

## Requirements

- Node.js 20+
- npm
- Google Maps JavaScript API key
- Google Routes API server key
- Gemini API key
- Circle developer-controlled wallets API key and entity secret
- Funded Arc Testnet Circle wallet

## Setup

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
cp .env.example .env.local
```

Fill `.env.local`. Do not commit `.env.local`; it is protected by `.gitignore`.

Required payment variables for the paid agent demo:

```env
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
CIRCLE_WALLET_ID=
CIRCLE_WALLET_ADDRESS=
CIRCLE_FEE_RECEIVER_ADDRESS=
AGENT_ANALYSIS_FEE_USDC=0.005
ARC_USDC_TOKEN_ADDRESS=0x3600000000000000000000000000000000000000
```

Arc Testnet defaults are documented in `.env.example`:

```env
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
ARC_EXPLORER_URL=https://testnet.arcscan.app
```

## Development

Run the app locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Run checks:

```bash
npm run lint
npm run build
```

## Circle Wallet Setup

After adding `CIRCLE_API_KEY` and `CIRCLE_ENTITY_SECRET` to `.env.local`, create an Arc Testnet wallet:

```bash
npm run create:circle-wallet
```

Copy the returned wallet set id, wallet id, and wallet address into `.env.local`:

```env
CIRCLE_WALLET_SET_ID=
CIRCLE_WALLET_ID=
CIRCLE_WALLET_ADDRESS=
```

Then fund the wallet with Arc Testnet USDC using the Circle faucet. For the demo fee recipient, set `CIRCLE_FEE_RECEIVER_ADDRESS` to another Arc Testnet address you control.

## Project Structure

```text
app/page.tsx                    Dispatcher demo UI and paid agent run flow
app/api/demo-data/route.ts      Demo vehicles, shipments, and fee config
app/api/agent-runs/route.ts     Runs GPS, Route, Economics, Risk agents and creates fee transfer
app/api/pay/status/route.ts     Polls Circle transaction status
app/api/analyze/route.ts        Legacy route analysis endpoint
app/api/pay/route.ts            Legacy reservation preparation endpoint
components/MapView.tsx          Google Maps display
lib/agentRun.ts                 Demo agent orchestration and recommendation logic
lib/circle.ts                   Circle Arc Testnet transfer helpers
lib/demoData.ts                 Demo vehicles and shipment requests
lib/googleRoutes.ts             Google Routes API integration with fallback
lib/gemini.ts                   Gemini analysis with fallback
scripts/create-circle-wallet.ts Circle wallet creation helper
```

## Notes

- `.env.example` is safe to commit.
- `.env.local` must stay private.
- If Google Routes is not configured, route calculations use a local distance fallback.
- If Gemini is not configured or fails, the recommendation falls back to local dispatch rules.
- The first paid testnet action is an agent-analysis fee transfer, not a freight escrow contract yet.
