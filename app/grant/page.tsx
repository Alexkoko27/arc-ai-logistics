import Image from "next/image";
import Link from "next/link";

const milestones = [
  {
    title: "Milestone 1 - Live AI Logistics Demo",
    status: "COMPLETE",
    body: "Built and deployed a working public demo of an AI-powered logistics dispatcher. The current demo includes shipment selection, map view, agent cards, route/economics/risk analysis, BOOK/SKIP recommendation, and a paid agent run panel.",
  },
  {
    title: "Milestone 2 - Agent Payment Ledger",
    status: "COMPLETE",
    body: "Added a USDC-denominated ledger for the agent run. The UI now shows per-agent execution costs for GPS, Route, Economics, and Risk agents, plus the total agent run cost of 0.005 USDC.",
  },
  {
    title: "Milestone 3 - Grant-Ready Public Pitch",
    status: "COMPLETE",
    body: "Added project positioning, architecture diagram, /grant page, Circle/Arc framing, and demo video outline. The project now has a clearer public explanation for ecosystem reviewers and grant submission.",
  },
  {
    title: "Milestone 4 - Real Arc Testnet Settlement",
    status: "COMPLETE",
    body: "Real Arc testnet settlement is implemented. Each paid agent run produces a real transaction ID, transaction hash, status lifecycle, and Arc Explorer-confirmed proof.",
  },
  {
    title: "Milestone 5 - Circle Developer Controlled Wallet Integration",
    status: "COMPLETE",
    body: "Circle Developer Controlled Wallets are integrated. Agent payments are initiated and tracked through Circle without exposing private keys.",
  },
  {
    title: "Milestone 6 - Autonomous Multi-Shipment Optimization",
    status: "COMPLETE",
    body: "The system now compares multiple truck/load opportunities, calculates scores, ranks options, and recommends the best shipment automatically.",
  },
  {
    title: "Milestone 7 - Agent Economics Dashboard",
    status: "COMPLETE",
    body: "Added a dedicated analytics dashboard showing Total Payments, Total USDC Spent, Average Cost per Analysis, Total Analyses, Per-Agent Revenue, payment lifecycle filters, full payment history visibility, CSV export, Transaction IDs, Transaction Hashes, and Arc Explorer Proof Links. Analytics records are persisted through Neon/Postgres with the legacy JSON store retained as fallback.",
  },
  {
    title: "Milestone 8 - Real Freight Data Integration",
    status: "NEXT",
    body: "Replace demo logistics inputs with production-grade external data sources: real freight marketplace integrations, real weather feeds, real route intelligence, real GPS/fleet telemetry, improved dispatch recommendations, and higher confidence agent decisions. Expected outcome: the platform evaluates live freight opportunities instead of demo datasets while preserving the existing Circle payment and Arc settlement architecture.",
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
  "Arc Explorer proof",
  "Multi-shipment optimization",
  "Agent Economics Dashboard",
  "Scenario Lab",
  "CSV matching simulation",
  "Transaction IDs",
  "Transaction hashes",
];

const implementedItems = [
  "AI Logistics Analysis",
  "Multi-Agent Architecture",
  "Circle DCW Payments",
  "Arc Settlement Proof",
  "Multi-Shipment Optimization",
  "Agent Economics Dashboard",
  "Payment Status Filters",
  "CSV Export",
  "Analytics Persistence",
  "Experimental Scenario Lab",
  "Scenario Lab Local Simulation",
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
              is the settlement unit, and Circle Developer Controlled Wallets
              now power programmatic agent payments in the current demo.
            </p>
            <p>
              The app demonstrates real Circle-initiated USDC settlement on Arc
              testnet with transaction status, tx hash, and explorer proof. This
              creates a practical base for machine-to-machine commerce in logistics.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold">Current Demo</h2>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit rounded-lg border border-black px-4 py-2 text-sm font-semibold hover:bg-black hover:text-white"
                href="/"
              >
                Open Live Demo
              </Link>
              <Link
                className="inline-flex w-fit rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                href="/scenario-lab"
              >
                Open Scenario Lab
              </Link>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {demoItems.map((item) => (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm" key={item}>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Current Release
              </p>
              <h2 className="text-2xl font-bold">v0.0.5.b</h2>
              <p className="max-w-2xl text-sm leading-6 text-gray-700">
                The current release keeps public release surfaces aligned and
                exposes Scenario Lab as an experimental local simulation for CSV-based
                dispatcher testing. It still includes real payment proof,
                multi-shipment optimization, database-backed analytics, payment
                status filtering, full payment history visibility, and CSV export
                for visible records.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:min-w-[28rem]">
              {implementedItems.map((item) => (
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2" key={item}>
                  {item}
                </div>
              ))}
            </div>
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
                Short walkthrough of Arc AI Logistics - a multi-agent freight coordination demo powered by Circle and Arc.
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
