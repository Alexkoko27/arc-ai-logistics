import Link from "next/link";
import RecentPaymentsTable from "@/components/RecentPaymentsTable";
import { getAgentMetrics } from "@/lib/analytics/agentMetrics";

export const dynamic = "force-dynamic";

function formatUsdc(value: number) {
  return `${value.toFixed(4)} USDC`;
}

export default async function DashboardPage() {
  const metrics = await getAgentMetrics();
  const summaryCards = [
    {
      label: "Total Payments",
      value: metrics.totalPayments.toString(),
      description: "Circle transactions created for paid agent runs.",
    },
    {
      label: "Total USDC Spent",
      value: formatUsdc(metrics.totalUsdcSpent),
      description: "Cleared USDC settlement volume tracked by analytics.",
    },
    {
      label: "Average Cost per Analysis",
      value: formatUsdc(metrics.averageCost),
      description: "Average paid-agent bundle cost across recorded runs.",
    },
    {
      label: "Total Analyses",
      value: metrics.totalAnalyses.toString(),
      description: "Agent analysis records captured by the payment store.",
    },
  ];

  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 border-b border-gray-200 pb-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Agent Economics Dashboard
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Arc AI Logistics Payment Analytics
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-gray-600 sm:text-base">
            Neon/Postgres-backed view of paid agent analyses, USDC spend,
            per-agent revenue, and Circle/Arc payment lifecycle proof.
          </p>
        </div>
        <Link className="text-sm font-semibold underline underline-offset-4" href="/">
          Back to demo
        </Link>
      </header>

      <section className="space-y-3">
        <div>
          <h2 className="font-bold">Payment Summary</h2>
          <p className="text-sm text-gray-600">
            High-level settlement metrics for paid AI-agent analysis runs.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div className="rounded-xl border p-4" key={card.label}>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="mt-2 text-2xl font-bold">{card.value}</p>
              <p className="mt-2 text-xs leading-5 text-gray-500">{card.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border p-4">
          <div>
            <h2 className="font-bold">Per-Agent Revenue</h2>
            <p className="text-sm text-gray-600">
              Revenue allocation follows the current Agent Payment Ledger model.
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {metrics.perAgentRevenue.map((agent) => (
              <div className="flex items-center justify-between gap-4 py-3" key={agent.agent}>
                <div>
                  <p className="font-semibold">{agent.agent}</p>
                  <p className="text-sm text-gray-500">
                    {formatUsdc(agent.amountPerRun)} per analysis
                  </p>
                </div>
                <p className="font-mono font-semibold">
                  {formatUsdc(agent.totalRevenue)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border p-4">
          <div>
            <h2 className="font-bold">Proof Visibility</h2>
            <p className="text-sm leading-6 text-gray-600">
              Payment records expose Circle transaction IDs, Arc settlement hashes,
              explorer proof links, and lifecycle states for cleared, pending, and
              failed payments.
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            Analytics is persisted in Neon/Postgres through the server-side
            database layer. The legacy JSON analytics store remains isolated as a
            compatibility fallback while Circle payment execution and status
            polling stay owned by the server-side payment service.
          </div>
        </div>
      </section>

      <RecentPaymentsTable payments={metrics.recentPayments} />
    </main>
  );
}
