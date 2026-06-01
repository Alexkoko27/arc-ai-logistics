"use client";

import { useMemo, useState } from "react";
import type { RecentPaymentRecord } from "@/lib/analytics/types";

const previewLimit = 10;

type PaymentFilter = "all" | "cleared" | "pending" | "failed";

const filterOptions: { label: string; value: PaymentFilter }[] = [
  { label: "All", value: "all" },
  { label: "Cleared", value: "cleared" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
];

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

function statusBadgeClass(status: RecentPaymentRecord["status"]) {
  const base = "inline-flex rounded-full border px-2 py-1 text-xs font-semibold uppercase";

  if (status === "CLEARED") {
    return `${base} border-green-200 bg-green-50 text-green-700`;
  }

  if (status === "FAILED") {
    return `${base} border-red-200 bg-red-50 text-red-700`;
  }

  if (status === "PENDING" || status === "INITIATED") {
    return `${base} border-amber-200 bg-amber-50 text-amber-700`;
  }

  return `${base} border-gray-200 bg-gray-50 text-gray-700`;
}

function matchesPaymentFilter(payment: RecentPaymentRecord, filter: PaymentFilter) {
  if (filter === "all") return true;
  if (filter === "cleared") return payment.status === "CLEARED";
  if (filter === "failed") return payment.status === "FAILED";

  return payment.status === "PENDING" || payment.status === "INITIATED";
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function buildCsv(payments: RecentPaymentRecord[]) {
  const header = [
    "timestamp",
    "shipment/load",
    "amount",
    "status",
    "transaction id",
    "tx hash",
    "explorer link",
  ];
  const rows = payments.map((payment) => [
    payment.timestamp,
    payment.shipment,
    payment.amount,
    payment.status,
    payment.transactionId,
    payment.txHash,
    payment.explorerUrl,
  ]);

  return [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
}

export default function RecentPaymentsTable({
  payments,
}: {
  payments: RecentPaymentRecord[];
}) {
  const [activeFilter, setActiveFilter] = useState<PaymentFilter>("all");
  const [showAll, setShowAll] = useState(false);
  const filteredPayments = useMemo(
    () => payments.filter((payment) => matchesPaymentFilter(payment, activeFilter)),
    [activeFilter, payments],
  );
  const visiblePayments = showAll
    ? filteredPayments
    : filteredPayments.slice(0, previewLimit);
  const hasMore = filteredPayments.length > previewLimit;

  function selectFilter(filter: PaymentFilter) {
    setActiveFilter(filter);
    setShowAll(false);
  }

  function downloadCsv() {
    const csv = buildCsv(visiblePayments);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `arc-ai-logistics-payments-${activeFilter}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-bold">Recent Payments</h2>
          <p className="text-sm text-gray-600">
            Payment history with status filters, Circle transaction IDs, Arc hashes,
            and explorer proof links.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex flex-wrap gap-2" aria-label="Payment status filters">
            {filterOptions.map((option) => (
              <button
                className={
                  activeFilter === option.value
                    ? "rounded border border-black bg-black px-3 py-1 text-sm font-semibold text-white"
                    : "rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                }
                key={option.value}
                onClick={() => selectFilter(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
            disabled={visiblePayments.length === 0}
            onClick={downloadCsv}
            type="button"
          >
            Download CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Showing {visiblePayments.length} of {filteredPayments.length} transactions
          {activeFilter !== "all" ? ` (${activeFilter})` : ""}.
        </p>
        {hasMore && (
          <button
            className="w-fit font-semibold underline underline-offset-4"
            onClick={() => setShowAll((value) => !value)}
            type="button"
          >
            {showAll ? "Show latest 10" : "View all transactions"}
          </button>
        )}
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
            {visiblePayments.length > 0 ? (
              visiblePayments.map((payment) => (
                <tr key={`${payment.transactionId ?? payment.timestamp}-${payment.shipment}`}>
                  <td className="py-3 pr-3 align-top">
                    {formatTimestamp(payment.timestamp)}
                  </td>
                  <td className="py-3 pr-3 align-top font-semibold">{payment.shipment}</td>
                  <td className="py-3 pr-3 align-top">{formatUsdc(payment.amount)}</td>
                  <td className="py-3 pr-3 align-top">
                    <span className={statusBadgeClass(payment.status)}>{payment.status}</span>
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
                  No payment records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
