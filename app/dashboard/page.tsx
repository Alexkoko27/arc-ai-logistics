import Link from "next/link";
import { getAgentMetrics } from "@/lib/analytics/agentMetrics";

export const dynamic = "force-dynamic";

function formatUsdc(value: number) {
  return `${value.toFixed(4)} USDC`;
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return timestamp;

  return date.toISOString();
}

export default function DashboardPage() {
  const metrics = getAgentMetrics();
  const summaryCards = [
    { label: "Total Payments", value: metrics.totalPayments.toString() },
    { label: "Total USDC Spent", value: formatUsdc(metrics.totalUsdcSpent) },
    { label: "Average Cost per Analysis", value: formatUsdc(metrics.averageCost) },
    { label: "Total Analyses", value: metrics.totalAnalyses.toString() },
  ];

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 border-b border-gray-200 pb-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Agent Economics Dashboard
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Arc AI Logistics Payment Analytics
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-gray-600 sm:text-base">
            File-backed view of paid agent analyses, USDC spend, per-agent revenue,
            and recent Circle/Arc payment proofs for the current deployment runtime.
          </p>
        </div>
        <Link className="text-sm font-semibold underline underline-offset-4" href="/">
          Back to demo
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div className="rounded-xl border p-4" key={card.label}>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
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
            <h2 className="font-bold">Analytics Scope</h2>
            <p className="text-sm leading-6 text-gray-600">
              This dashboard uses a small server-side JSON store in the runtime
              temp directory. It keeps local development reliable without adding
              a database, queue, or secret-bearing client code.
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            Existing Circle payment execution and status lifecycle remain owned by
            the server-side payment service.
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border p-4">
        <div>
          <h2 className="font-bold">Recent Payments</h2>
          <p className="text-sm text-gray-600">
            Latest paid agent run records captured by the dashboard metrics module.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                <th className="py-2 pr-3">Timestamp</th>
                <th className="py-2 pr-3">Shipment</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Explorer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {metrics.recentPayments.length > 0 ? (
                metrics.recentPayments.map((payment) => (
                  <tr key={`${payment.transactionId ?? payment.timestamp}-${payment.shipment}`}>
                    <td className="py-2 pr-3">{formatTimestamp(payment.timestamp)}</td>
                    <td className="py-2 pr-3 font-semibold">{payment.shipment}</td>
                    <td className="py-2 pr-3">{formatUsdc(payment.amount)}</td>
                    <td className="py-2 pr-3">{payment.status}</td>
                    <td className="py-2 pr-3">
                      {payment.explorerUrl ? (
                        <a
                          className="font-semibold underline underline-offset-4"
                          href={payment.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open proof
                        </a>
                      ) : (
                        "Unavailable"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={5}>
                    No payment records in this deployment runtime yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
