import type { AgentPaymentResult, PaymentStatus } from "@/lib/payments/types";

export type AgentRevenueMetric = {
  agent: "GPS Agent" | "Route Agent" | "Risk Agent" | "Economics Agent";
  amountPerRun: number;
  totalRevenue: number;
};

export type RecentPaymentRecord = {
  transactionId: string | null;
  timestamp: string;
  shipment: string;
  amount: number;
  currency: "USDC";
  status: PaymentStatus;
  explorerUrl: string | null;
};

export type AgentMetrics = {
  totalAnalyses: number;
  totalPayments: number;
  totalUsdcSpent: number;
  averageCost: number;
  perAgentRevenue: AgentRevenueMetric[];
  recentPayments: RecentPaymentRecord[];
};

const agentRevenueModel: AgentRevenueMetric[] = [
  { agent: "GPS Agent", amountPerRun: 0.001, totalRevenue: 0 },
  { agent: "Route Agent", amountPerRun: 0.0015, totalRevenue: 0 },
  { agent: "Risk Agent", amountPerRun: 0.001, totalRevenue: 0 },
  { agent: "Economics Agent", amountPerRun: 0.0015, totalRevenue: 0 },
];

const paymentRecords: RecentPaymentRecord[] = [];

function safeAmount(amount: string) {
  const parsed = Number(amount);

  return Number.isFinite(parsed) ? parsed : 0;
}

function roundUsdc(value: number) {
  return Number(value.toFixed(6));
}

export function recordAgentPayment({
  payment,
  shipment,
}: {
  payment: AgentPaymentResult;
  shipment: string;
}) {
  const record: RecentPaymentRecord = {
    transactionId: payment.transactionId,
    timestamp: payment.timestamp,
    shipment,
    amount: safeAmount(payment.amount),
    currency: payment.currency,
    status: payment.status,
    explorerUrl: payment.explorerUrl,
  };
  const existingIndex = payment.transactionId
    ? paymentRecords.findIndex(
        (item) => item.transactionId === payment.transactionId,
      )
    : -1;

  if (existingIndex >= 0) {
    paymentRecords[existingIndex] = record;
  } else {
    paymentRecords.unshift(record);
  }

  paymentRecords.splice(50);
}

export function updateAgentPaymentStatus(payment: AgentPaymentResult) {
  if (!payment.transactionId) return;

  const existingIndex = paymentRecords.findIndex(
    (item) => item.transactionId === payment.transactionId,
  );

  if (existingIndex < 0) return;

  paymentRecords[existingIndex] = {
    ...paymentRecords[existingIndex],
    timestamp: payment.timestamp,
    amount: safeAmount(payment.amount),
    status: payment.status,
    explorerUrl: payment.explorerUrl,
  };
}

export function getAgentMetrics(): AgentMetrics {
  const totalAnalyses = paymentRecords.length;
  const paymentsWithTransaction = paymentRecords.filter(
    (payment) => payment.transactionId,
  );
  const clearedPayments = paymentRecords.filter(
    (payment) => payment.status === "CLEARED",
  );
  const totalUsdcSpent = roundUsdc(
    clearedPayments.reduce((sum, payment) => sum + payment.amount, 0),
  );
  const averageCost = totalAnalyses > 0
    ? roundUsdc(
        paymentRecords.reduce((sum, payment) => sum + payment.amount, 0) /
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
    recentPayments: paymentRecords.slice(0, 10),
  };
}
