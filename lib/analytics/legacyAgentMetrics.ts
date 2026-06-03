import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { AgentMetrics, AgentRevenueMetric, RecentPaymentRecord } from "@/lib/analytics/types";
import type { AgentPaymentResult, PaymentStatus } from "@/lib/payments/types";

const agentRevenueModel: AgentRevenueMetric[] = [
  { agent: "GPS Agent", amountPerRun: 0.001, totalRevenue: 0 },
  { agent: "Route Agent", amountPerRun: 0.0015, totalRevenue: 0 },
  { agent: "Economics Agent", amountPerRun: 0.0015, totalRevenue: 0 },
  { agent: "Risk Agent", amountPerRun: 0.0005, totalRevenue: 0 },
  { agent: "Weather Agent", amountPerRun: 0.0005, totalRevenue: 0 },
];

const analyticsStorePath = join(
  tmpdir(),
  "arc-ai-logistics",
  "agent-payment-records.json",
);

let paymentRecords: RecentPaymentRecord[] = [];

function safeAmount(amount: string) {
  const parsed = Number(amount);

  return Number.isFinite(parsed) ? parsed : 0;
}

function roundUsdc(value: number) {
  return Number(value.toFixed(6));
}

function isPaymentStatus(value: unknown): value is PaymentStatus {
  return (
    value === "INITIATED" ||
    value === "PENDING" ||
    value === "CLEARED" ||
    value === "FAILED"
  );
}

function isPaymentRecord(value: unknown): value is RecentPaymentRecord {
  if (!value || typeof value !== "object") return false;

  const record = value as Partial<RecentPaymentRecord>;

  return (
    typeof record.timestamp === "string" &&
    typeof record.shipment === "string" &&
    typeof record.amount === "number" &&
    record.currency === "USDC" &&
    isPaymentStatus(record.status) &&
    (typeof record.transactionId === "string" || record.transactionId === null) &&
    (typeof record.txHash === "string" || record.txHash === null || record.txHash === undefined) &&
    (typeof record.explorerUrl === "string" || record.explorerUrl === null)
  );
}

function normalizePaymentRecord(record: RecentPaymentRecord): RecentPaymentRecord {
  return {
    ...record,
    txHash: record.txHash ?? null,
  };
}

function loadPaymentRecords() {
  try {
    if (!existsSync(analyticsStorePath)) return paymentRecords;

    const raw = readFileSync(analyticsStorePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) return paymentRecords;

    paymentRecords = parsed
      .filter(isPaymentRecord)
      .map(normalizePaymentRecord)
      .slice(0, 50);
  } catch {
    return paymentRecords;
  }

  return paymentRecords;
}

function savePaymentRecords(records: RecentPaymentRecord[]) {
  paymentRecords = records.slice(0, 50);

  try {
    mkdirSync(dirname(analyticsStorePath), { recursive: true });
    writeFileSync(
      analyticsStorePath,
      JSON.stringify(paymentRecords, null, 2),
      "utf8",
    );
  } catch {
    // Analytics must never break payment execution or status polling.
  }
}

function upsertPaymentRecord(record: RecentPaymentRecord) {
  const records = loadPaymentRecords();
  const existingIndex = record.transactionId
    ? records.findIndex((item) => item.transactionId === record.transactionId)
    : -1;

  if (existingIndex >= 0) {
    records[existingIndex] = {
      ...records[existingIndex],
      ...record,
      shipment: record.shipment || records[existingIndex].shipment,
    };
  } else {
    records.unshift(record);
  }

  savePaymentRecords(records);
}

export function recordLegacyAgentPayment({
  payment,
  shipment,
}: {
  payment: AgentPaymentResult;
  shipment: string;
}) {
  upsertPaymentRecord({
    transactionId: payment.transactionId,
    txHash: payment.txHash,
    timestamp: payment.timestamp,
    shipment,
    amount: safeAmount(payment.amount),
    currency: payment.currency,
    status: payment.status,
    explorerUrl: payment.explorerUrl,
  });
}

export function updateLegacyAgentPaymentStatus(payment: AgentPaymentResult) {
  if (!payment.transactionId) return;

  const records = loadPaymentRecords();
  const existingRecord = records.find(
    (item) => item.transactionId === payment.transactionId,
  );

  upsertPaymentRecord({
    transactionId: payment.transactionId,
    txHash: payment.txHash,
    timestamp: payment.timestamp,
    shipment: existingRecord?.shipment ?? "Unknown shipment",
    amount: safeAmount(payment.amount),
    currency: payment.currency,
    status: payment.status,
    explorerUrl: payment.explorerUrl,
  });
}

export function getLegacyAgentMetrics(): AgentMetrics {
  const records = loadPaymentRecords();
  const totalAnalyses = records.length;
  const paymentsWithTransaction = records.filter(
    (payment) => payment.transactionId,
  );
  const clearedPayments = records.filter(
    (payment) => payment.status === "CLEARED",
  );
  const totalUsdcSpent = roundUsdc(
    clearedPayments.reduce((sum, payment) => sum + payment.amount, 0),
  );
  const averageCost = totalAnalyses > 0
    ? roundUsdc(
        records.reduce((sum, payment) => sum + payment.amount, 0) /
          totalAnalyses,
      )
    : 0;
  const clearedRuns = clearedPayments.length;

  return {
    totalAnalyses,
    totalPayments: paymentsWithTransaction.length,
    totalUsdcSpent,
    averageCost,
    perAgentRevenue: agentRevenueModel.map((agent) => ({
      ...agent,
      totalRevenue: roundUsdc(agent.amountPerRun * clearedRuns),
    })),
    recentPayments: records,
  };
}
