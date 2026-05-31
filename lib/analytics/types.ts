import type { PaymentStatus } from "@/lib/payments/types";

export type AgentRevenueMetric = {
  agent: string;
  amountPerRun: number;
  totalRevenue: number;
};

export type RecentPaymentRecord = {
  transactionId: string | null;
  txHash: string | null;
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
