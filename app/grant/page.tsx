import Image from "next/image";
import Link from "next/link";

const milestones = [
  {
    title: "Milestone 1 — Live AI Logistics Demo",
    status: "COMPLETE",
    body: "Built and deployed a working public demo of an AI-powered logistics dispatcher. The current demo includes shipment selection, map view, agent cards, route/economics/risk analysis, BOOK/SKIP recommendation, and a paid agent run panel.",
  },
  {
    title: "Milestone 2 — Agent Payment Ledger",
    status: "COMPLETE",
    body: "Added a USDC-denominated ledger for the agent run. The UI now shows per-agent execution costs for GPS, Route, Economics, and Risk agents, plus the total agent run cost of 0.005 USDC.",
  },
  {
    title: "Milestone 3 — Grant-Ready Public Pitch",
    status: "COMPLETE",
    body: "Added project positioning, architecture diagram, /grant page, Circle/Arc framing, and demo video outline. The project now has a clearer public explanation for ecosystem reviewers and grant submission.",
  },
  {
    title: "Milestone 4 — Real Arc Testnet Settlement",
    status: "NEXT",
    body: "Replace the current demo/testnet-style transaction proof with real Arc testnet settlement. Each paid agent run should produce a real transaction hash and explorer-confirmed proof.",
  },
  {
    title: "Milestone 5 — Circle Developer Controlled Wallet Integration",
    status: "NEXT",
    body: "Integrate Circle Developer Controlled Wallets for programmatic USDC payments. The goal is to let the Payment Agent initiate and track agent payments securely without exposing private keys.",
  },
  {
    title: "Milestone 6 — Autonomous Multi-Shipment Optimization",
    status: "NEXT",
    body: "Extend the demo from analyzing one selected shipment to comparing multiple shipment requests automatically. Agents should rank opportunities by distance, ETA, profit, risk, and truck availability, then recommend the best load.",
  },
];

export default function GrantPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      <section className="space-y-4 border-b border-gray-200 pb-8">
        <Link className="text-sm text-gray-600 underline" href="/">
          Open Live Demo
        </Link>
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Circle Grant Pitch
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            Arc AI Logistics - Circle Grant Pitch
          </h1>
          <p className="max-w-3xl text-lg text-gray-700">
            AI logistics agents that coordinate freight decisions and settle work
            using USDC on Arc.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-3 border border-gray-200 p-5">
          <h2 className="text-xl font-bold">Problem</h2>
          <p className="text-gray-700">Logistics dispatch is fragmented:</p>
          <ul className="list-disc space-y-2 pl-5 text-gray-700">
            <li>GPS/fleet data lives separately.</li>
            <li>Shipment opportunities are evaluated manually.</li>
            <li>Route, risk, fuel and margin decisions are slow.</li>
            <li>Payments between software agents/services are not native.</li>
          </ul>
        </div>

        <div className="space-y-3 border border-gray-200 p-5">
          <h2 className="text-xl font-bold">Solution</h2>
          <p className="text-gray-700">
            Arc AI Logistics uses specialized AI agents to coordinate shipment
            analysis and produce a clear BOOK / SKIP recommendation.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-gray-700">
            <li>GPS Agent</li>
            <li>Shipment Agent</li>
            <li>Route Agent</li>
            <li>Economics Agent</li>
            <li>Risk Agent</li>
            <li>Payment Agent</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Architecture</h2>
        <div className="border border-gray-200 p-3">
          <Image
            className="w-full border border-gray-100"
            src="/images/Arc_GPS_plan.png"
            alt="AI Agent System Architecture"
            width={1536}
            height={864}
            priority
          />
        </div>
        <p className="text-sm text-gray-600">
          GPS, shipment, route, economics, risk and payment agents coordinate
          logistics decisions and settle paid agent runs through Circle + Arc.
        </p>
      </section>

      <section className="space-y-3 border border-gray-200 p-5">
        <h2 className="text-2xl font-bold">Why Arc + Circle</h2>
        <p className="text-gray-700">
          Arc is stablecoin-native and fits agentic payment workflows. USDC is
          the settlement unit, and Circle Developer Controlled Wallets can power
          programmatic agent payments.
        </p>
        <p className="text-gray-700">
          Nanopayment-style flows can pay agents per task or per run. This
          project explores real machine-to-machine commerce for logistics, where
          software agents can evaluate work and settle execution in stablecoins.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Current Demo</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            "Live dashboard",
            "Shipment selection",
            "Map",
            "Agent run cards",
            "Recommendation",
            "Paid Agent Run",
            "Agent Payment Ledger",
            "Tx proof",
          ].map((item) => (
            <div className="border border-gray-200 p-3 text-sm" key={item}>
              {item}
            </div>
          ))}
        </div>
        <Link
          className="inline-block border border-black px-4 py-2 text-sm font-semibold hover:bg-black hover:text-white"
          href="/"
        >
          Open Live Demo
        </Link>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Roadmap / Grant Milestones</h2>
        <div className="space-y-3">
          {milestones.map((milestone) => (
            <div className="border border-gray-200 p-4" key={milestone.title}>
              <h3 className="font-bold">{milestone.title}</h3>
              <p className="text-sm font-semibold text-gray-500">
                Status: {milestone.status}
              </p>
              <p className="mt-2 text-sm text-gray-700">{milestone.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 border border-gray-200 p-5">
        <h2 className="text-2xl font-bold">Demo Video</h2>
        <p className="text-gray-700">
          Short walkthrough of Arc AI Logistics — a multi-agent freight coordination demo powered by Circle and Arc.
        </p>
        <p className="text-gray-700">
          The video demonstrates how AI agents evaluate shipment opportunities using GPS data, route intelligence, economics, and risk analysis, then coordinate a USDC-denominated paid agent run with on-chain proof simulation.
        </p>
        <video
          className="aspect-video w-full rounded-lg border border-gray-200"
          src="/demo/arc-ai-logistics-demo.mp4"
          controls
        />
      </section>
    </main>
  );
}
