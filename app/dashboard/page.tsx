import Link from "next/link";
import type { PaymentStatus } from "@/lib/payments/types";
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

function formatIdentifier(value: string | null) {
  if (!value) return "Unavailable";
  if (value.length <= 18) return value;

  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function statusBadgeClass(status: PaymentStatus) {
  const base = "inline-flex rounded-full border px-2 py-1 text-xs font-semibold uppercase";

  if (status === "CLEARED") {
    return `${base} border-green-200 bg-green-50 text-green-700`;
  }

  if (status === "FAILED") {
    return `${base} border-red-200 bg-red-50 text-red-700`;
  }

  if (status === "PENDING") {
    return `${base} border-amber-200 bg-amber-50 text-amber-700`;
  }

  return `${base} border-gray-200 bg-gray-50 text-gray-700`;
}

export default function DashboardPage() {
  const metrics = getAgentMetrics();
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
            File-backed view of paid agent analyses, USDC spend, per-agent revenue,
            and recent Circle/Arc payment proofs for the current deployment runtime.
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
              Recent payment records expose both the Circle transaction ID and
              the Arc settlement hash when Circle returns on-chain proof data.
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            Analytics uses a small server-side JSON store in the runtime temp
            directory. Existing Circle payment execution and status polling remain
            owned by the server-side payment service.
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border p-4">
        <div>
          <h2 className="font-bold">Recent Payments</h2>
          <p className="text-sm text-gray-600">
            Latest paid agent run records with Circle transaction IDs, Arc hashes,
            and explorer proof links.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                <th className="py-2 pr-3">Timestamp</th>
                <th className="py-2 pr-3">Shipment / Load</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Transaction ID</th>
                <th className="py-2 pr-3">Tx Hash</th>
                <th className="py-2 pr-3">Explorer Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {metrics.recentPayments.length > 0 ? (
                metrics.recentPayments.map((payment) => (
                  <tr key={`${payment.transactionId ?? payment.timestamp}-${payment.shipment}`}>
                    <td className="py-3 pr-3 align-top">{formatTimestamp(payment.timestamp)}</td>
                    <td className="py-3 pr-3 align-top font-semibold">{payment.shipment}</td>
                    <td className="py-3 pr-3 align-top">{formatUsdc(payment.amount)}</td>
                    <td className="py-3 pr-3 align-top">
                      <span className={statusBadgeClass(payment.status)}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-3 pr-3 align-top font-mono text-xs">
                      {formatIdentifier(payment.transactionId)}
                    </td>
                    <td className="py-3 pr-3 align-top font-mono text-xs">
                      {formatIdentifier(payment.txHash)}
                    </td>
                    <td className="py-3 pr-3 align-top">
                      {payment.explorerUrl ? (
                        <a
                          className="inline-flex rounded border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 underline-offset-4 hover:underline"
                          href={payment.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open explorer proof
                        </a>
                      ) : (
                        <span className="text-gray-500">Unavailable</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={7}>
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
