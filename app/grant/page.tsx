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

const demoItems = [
  "Live dashboard",
  "Shipment selection",
  "Map",
  "Agent run cards",
  "Recommendation",
  "Paid Agent Run",
  "Agent Payment Ledger",
  "Tx proof",
];

function statusClass(status: string) {
  return status === "COMPLETE"
    ? "border-gray-300 bg-gray-950 text-white"
    : "border-gray-300 bg-white text-gray-700";
}

export default function GrantPage() {
  return (
    <main className="bg-white px-4 py-6 text-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-6 sm:px-7 sm:py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <Link className="text-sm font-medium text-gray-600 underline underline-offset-4" href="/">
                Open Live Demo
              </Link>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Circle Grant Pitch
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Arc AI Logistics - Circle Grant Pitch
              </h1>
              <p className="text-base leading-7 text-gray-700 sm:text-lg">
                AI logistics agents that coordinate freight decisions and settle
                work using USDC on Arc.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-72">
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="font-semibold">0.005 USDC</p>
                <p className="text-gray-600">Agent run cost</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="font-semibold">Arc Testnet</p>
                <p className="text-gray-600">Proof layer</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">Problem</h2>
            <p className="mt-3 text-gray-700">Logistics dispatch is fragmented:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
              <li>GPS/fleet data lives separately.</li>
              <li>Shipment opportunities are evaluated manually.</li>
              <li>Route, risk, fuel and margin decisions are slow.</li>
              <li>Payments between software agents/services are not native.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">Solution</h2>
            <p className="mt-3 text-gray-700">
              Arc AI Logistics uses specialized AI agents to coordinate shipment
              analysis and produce a clear BOOK / SKIP recommendation.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-700">
              {[
                "GPS Agent",
                "Shipment Agent",
                "Route Agent",
                "Economics Agent",
                "Risk Agent",
                "Payment Agent",
              ].map((agent) => (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2" key={agent}>
                  {agent}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                System design
              </p>
              <h2 className="text-2xl font-bold">Architecture</h2>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-2">
            <Image
              className="w-full rounded-lg border border-gray-100 bg-white"
              src="/images/Arc_GPS_plan.png"
              alt="AI Agent System Architecture"
              width={1536}
              height={864}
              priority
            />
          </div>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            GPS, shipment, route, economics, risk and payment agents coordinate
            logistics decisions and settle paid agent runs through Circle + Arc.
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm sm:p-6">
          <h2 className="text-2xl font-bold">Why Arc + Circle</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 text-gray-700 lg:grid-cols-2">
            <p>
              Arc is stablecoin-native and fits agentic payment workflows. USDC
              is the settlement unit, and Circle Developer Controlled Wallets can
              power programmatic agent payments.
            </p>
            <p>
              Nanopayment-style flows can pay agents per task or per run. This
              project explores real machine-to-machine commerce for logistics,
              where software agents can evaluate work and settle execution in
              stablecoins.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold">Current Demo</h2>
            <Link
              className="inline-flex w-fit rounded-lg border border-black px-4 py-2 text-sm font-semibold hover:bg-black hover:text-white"
              href="/"
            >
              Open Live Demo
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {demoItems.map((item) => (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm" key={item}>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Grant delivery plan
              </p>
              <h2 className="text-2xl font-bold">Roadmap / Grant Milestones</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {milestones.map((milestone) => (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4" key={milestone.title}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <h3 className="font-bold leading-6">{milestone.title}</h3>
                  <span
                    className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                      milestone.status,
                    )}`}
                  >
                    {milestone.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-700">{milestone.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm sm:p-6">
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Walkthrough
              </p>
              <h2 className="text-2xl font-bold">Demo Video</h2>
              <p className="text-gray-700">
                Short walkthrough of Arc AI Logistics — a multi-agent freight coordination demo powered by Circle and Arc.
              </p>
              <p className="text-gray-700">
                The video demonstrates how AI agents evaluate shipment opportunities using GPS data, route intelligence, economics, and risk analysis, then coordinate a USDC-denominated paid agent run with on-chain proof simulation.
              </p>
            </div>
            <video
              className="aspect-video w-full rounded-xl border border-gray-200 bg-black"
              src="/demo/arc-ai-logistics-demo.mp4"
              controls
            />
          </div>
        </section>
      </div>
    </main>
  );
}
