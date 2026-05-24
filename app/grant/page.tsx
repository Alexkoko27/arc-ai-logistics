import Image from "next/image";
import Link from "next/link";

const milestones = [
  {
    title: "Real Arc Testnet settlement for paid agent runs",
    body: "Replace simulated tx proof with real Arc testnet transaction flow. Store tx hash and explorer link per agent run.",
  },
  {
    title: "Circle Developer Controlled Wallet integration",
    body: "Programmatic wallet creation and management. USDC payments for agent execution.",
  },
  {
    title: "Agent Payment Ledger",
    body: "Track per-agent micro-payments, show total paid per run, and prepare for nanopayment-style settlement.",
  },
  {
    title: "Multi-shipment autonomous optimization",
    body: "Let agents compare several shipment requests and select the best one based on ETA, profit, risk and location.",
  },
  {
    title: "Public demo and grant-ready documentation",
    body: "Improve the /grant page, add a short demo video, and prepare the project for Circle/Arc ecosystem review.",
  },
];

const videoPlan = [
  "0-10s: Problem - logistics dispatch is still manual and fragmented.",
  "10-25s: Select a shipment request.",
  "25-40s: Agents fetch GPS, route, economics and risk data.",
  "40-55s: App recommends BOOK / SKIP.",
  "55-70s: Paid Agent Run shows USDC cost, tx hash and Arc proof.",
  "70-90s: Explain why Arc + Circle enable machine-to-machine agent payments.",
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
          {milestones.map((milestone, index) => (
            <div className="border border-gray-200 p-4" key={milestone.title}>
              <p className="text-sm font-semibold text-gray-500">
                Milestone {index + 1}
              </p>
              <h3 className="font-bold">{milestone.title}</h3>
              <p className="text-sm text-gray-700">{milestone.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 border border-gray-200 p-5">
        <h2 className="text-2xl font-bold">Demo Video</h2>
        <p className="text-gray-700">
          Short walkthrough of the Arc AI Logistics multi-agent dispatch demo.
        </p>
        <video
          className="w-full rounded-lg border border-gray-200"
          src="/demo/arc-ai-logistics-demo.mp4"
          controls
        />
        <ul className="list-disc space-y-2 pl-5 text-gray-700">
          {videoPlan.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
