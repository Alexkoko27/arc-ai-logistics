# Arc AI Logistics

A Next.js demo dApp for AI-assisted logistics on Arc Testnet. The app shows a simple agent chain:

- Truck GPS Agent: provides the truck origin coordinates.
- Cargo Location Agent: provides the cargo pickup coordinates.
- Route Economics Agent: calculates distance, ETA, costs, and expected profit.
- AI Decision Agent: uses Gemini when configured, with a local fallback rule.
- Payment Agent: prepares the Circle/Arc wallet payment flow.

The current project is an MVP scaffold. Google Routes and Gemini can be real when API keys are configured. Circle/Arc payment is currently prepared around a developer-controlled wallet and is ready for the next step: a real USDC transfer or smart contract call.

## Requirements

- Node.js 20+
- npm
- Google Maps JavaScript API key
- Google Routes API server key
- Gemini API key
- Circle developer-controlled wallets API key and entity secret

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

Arc Testnet defaults are already documented in `.env.example`:

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

Then fund the wallet with Arc Testnet USDC using the Circle faucet.

## Project Structure

```text
app/page.tsx                 Main demo UI and agent status panels
app/api/analyze/route.ts     Route metrics, economics, and AI analysis endpoint
app/api/pay/route.ts         Circle/Arc payment preparation endpoint
components/MapView.tsx       Google Maps display
lib/googleRoutes.ts          Google Routes API integration with fallback
lib/gemini.ts                Gemini analysis with fallback
lib/profit.ts                Route profitability calculation
lib/routeData.ts             Demo truck and cargo coordinates
scripts/create-circle-wallet.ts
```

## Notes

- `.env.example` is safe to commit.
- `.env.local` must stay private.
- If Google Routes is not configured, `/api/analyze` falls back to Berlin to Hamburg demo values.
- If Gemini is not configured or fails, the AI decision falls back to a local profit rule.
