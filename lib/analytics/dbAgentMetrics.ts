import { count, countDistinct, desc, eq, inArray, sql } from "drizzle-orm";
import type { AgentMetrics, RecentPaymentRecord } from "@/lib/analytics/types";
import { getDb } from "@/lib/db/client";
import {
  agentPaymentAllocations,
  agents,
  analysisRuns,
  paymentRecords,
  shipments,
} from "@/lib/db/schema";
import type { PaymentStatus } from "@/lib/payments/types";

const confirmedPaymentStatuses = ["cleared", "confirmed", "success", "succeeded", "complete"];

function toNumber(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function roundUsdc(value: number) {
  return Number(value.toFixed(6));
}

function toPaymentStatus(status: string): PaymentStatus {
  const normalized = status.toUpperCase();

  if (
    normalized === "INITIATED" ||
    normalized === "PENDING" ||
    normalized === "CLEARED" ||
    normalized === "FAILED"
  ) {
    return normalized;
  }

  if (confirmedPaymentStatuses.includes(status.toLowerCase())) {
    return "CLEARED";
  }

  return "PENDING";
}

export async function getDbAgentMetrics(): Promise<AgentMetrics> {
  const db = getDb();
  const [paymentSummary] = await db
    .select({
      totalPayments: count(paymentRecords.id),
    })
    .from(paymentRecords);
  const [analysisSummary] = await db
    .select({
      totalAnalyses: count(analysisRuns.id),
    })
    .from(analysisRuns);
  const [confirmedSummary] = await db
    .select({
      totalUsdcSpent: sql<string>`coalesce(sum(${paymentRecords.amountUsdc}), 0)`,
      paidAnalyses: countDistinct(paymentRecords.analysisRunId),
    })
    .from(paymentRecords)
    .where(inArray(paymentRecords.status, confirmedPaymentStatuses));
  const perAgentRevenue = await db
    .select({
      agent: agents.name,
      amountPerRun: agents.defaultPriceUsdc,
      totalRevenue: sql<string>`coalesce(sum(case when ${paymentRecords.status} in ('cleared', 'confirmed', 'success', 'succeeded', 'complete') then ${agentPaymentAllocations.amountUsdc} else 0 end), 0)`,
    })
    .from(agents)
    .leftJoin(agentPaymentAllocations, eq(agentPaymentAllocations.agentId, agents.id))
    .leftJoin(paymentRecords, eq(paymentRecords.id, agentPaymentAllocations.paymentRecordId))
    .groupBy(agents.id, agents.name, agents.defaultPriceUsdc)
    .orderBy(agents.name);
  const recentRows = await db
    .select({
      transactionId: paymentRecords.circleTransactionId,
      txHash: paymentRecords.arcTxHash,
      timestamp: paymentRecords.createdAt,
      shipmentRef: shipments.externalRef,
      amount: paymentRecords.amountUsdc,
      status: paymentRecords.status,
      explorerUrl: paymentRecords.explorerUrl,
    })
    .from(paymentRecords)
    .innerJoin(analysisRuns, eq(analysisRuns.id, paymentRecords.analysisRunId))
    .leftJoin(shipments, eq(shipments.id, analysisRuns.shipmentId))
    .orderBy(desc(paymentRecords.createdAt));

  const totalUsdcSpent = roundUsdc(toNumber(confirmedSummary?.totalUsdcSpent));
  const paidAnalyses = confirmedSummary?.paidAnalyses ?? 0;
  const recentPayments: RecentPaymentRecord[] = recentRows.map((row) => ({
    transactionId: row.transactionId,
    txHash: row.txHash,
    timestamp: row.timestamp.toISOString(),
    shipment: row.shipmentRef ?? "Unknown shipment",
    amount: toNumber(row.amount),
    currency: "USDC",
    status: toPaymentStatus(row.status),
    explorerUrl: row.explorerUrl,
  }));

  return {
    totalAnalyses: analysisSummary?.totalAnalyses ?? 0,
    totalPayments: paymentSummary?.totalPayments ?? 0,
    totalUsdcSpent,
    averageCost: paidAnalyses > 0 ? roundUsdc(totalUsdcSpent / paidAnalyses) : 0,
    perAgentRevenue: perAgentRevenue.map((agent) => ({
      agent: agent.agent,
      amountPerRun: toNumber(agent.amountPerRun),
      totalRevenue: roundUsdc(toNumber(agent.totalRevenue)),
    })),
    recentPayments,
  };
}
