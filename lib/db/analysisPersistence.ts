import { and, eq } from "drizzle-orm";
import type { AgentRunResult } from "@/lib/agentRun";
import { getDb, hasDatabaseUrl } from "@/lib/db/client";
import { seedDefaultSystemAgents } from "@/lib/db/systemAgents";
import {
  agentPaymentAllocations,
  agentRuns,
  agents,
  analysisRuns,
  paymentRecords,
  shipments,
} from "@/lib/db/schema";
import type { AgentPaymentResult, PaymentStatus } from "@/lib/payments/types";

const agentSlugByRunName = new Map([
  ["Fleet GPS Agent", "gps-agent"],
  ["GPS Agent", "gps-agent"],
  ["Route Agent", "route-agent"],
  ["Economics Agent", "economics-agent"],
  ["Risk Agent", "risk-agent"],
  ["Weather Agent", "weather-agent"],
  ["OpenWeather Risk Agent", "weather-agent"],
]);

function safeAmount(amount: string | number) {
  const value = typeof amount === "number" ? amount : Number(amount);

  return Number.isFinite(value) ? value : 0;
}

function formatLocation(location: AgentRunResult["shipment"]["origin"]) {
  return `${location.city}, ${location.state}`;
}

function normalizePaymentStatus(status: PaymentStatus) {
  return status.toLowerCase();
}

function isConfirmedPayment(status: PaymentStatus) {
  return status === "CLEARED";
}

function summarizeRun(run: AgentRunResult) {
  return `${run.recommendation.decision}: ${run.recommendation.reason}`;
}

function validateRunForStorage(run: AgentRunResult) {
  if (!run.shipment.reference || run.agents.length === 0) {
    throw new Error("Analysis run is missing required storage context.");
  }

  if (!Number.isFinite(safeAmount(run.payment.feeAmount))) {
    throw new Error("Analysis run fee amount is invalid.");
  }
}

async function getSystemAgentsBySlug() {
  await seedDefaultSystemAgents();

  const db = getDb();
  const rows = await db.select().from(agents);

  return new Map(rows.map((agent) => [agent.slug, agent]));
}

export async function createStoredAnalysisRun(run: AgentRunResult) {
  if (!hasDatabaseUrl()) return null;

  validateRunForStorage(run);

  const db = getDb();
  const agentMap = await getSystemAgentsBySlug();
  const [shipment] = await db
    .insert(shipments)
    .values({
      externalRef: run.shipment.reference,
      origin: formatLocation(run.shipment.origin),
      destination: formatLocation(run.shipment.destination),
      cargoType: run.shipment.commodity,
      status: run.shipment.status,
      metadata: {
        demoShipmentId: run.shipment.id,
        equipment: run.shipment.equipment,
        weightLbs: run.shipment.weightLbs,
        revenue: run.shipment.revenue,
        currency: run.shipment.currency,
        pickupWindowStart: run.shipment.pickupWindowStart,
        pickupWindowEnd: run.shipment.pickupWindowEnd,
        deliveryWindowStart: run.shipment.deliveryWindowStart,
        deliveryWindowEnd: run.shipment.deliveryWindowEnd,
      },
    })
    .returning();
  const requestedAgentSet = run.agents
    .map((agent) => agentSlugByRunName.get(agent.name))
    .filter((slug): slug is string => Boolean(slug));
  const [analysisRun] = await db
    .insert(analysisRuns)
    .values({
      shipmentId: shipment.id,
      status: "completed",
      totalCostUsdc: run.payment.feeAmount,
      paymentStatus: "unpaid",
      requestedAgentSet,
      resultSummary: summarizeRun(run),
      completedAt: new Date(),
    })
    .returning();

  for (const runAgent of run.agents) {
    const slug = agentSlugByRunName.get(runAgent.name);
    const agent = slug ? agentMap.get(slug) : undefined;

    if (!agent) continue;

    await db.insert(agentRuns).values({
      analysisRunId: analysisRun.id,
      agentId: agent.id,
      status: runAgent.status === "complete" ? "completed" : "warning",
      agentVersion: "v0.0.4",
      agentSnapshot: {
        slug: agent.slug,
        name: agent.name,
        category: agent.category,
        defaultPriceUsdc: agent.defaultPriceUsdc,
      },
      outputSummary: runAgent.summary,
      score:
        runAgent.name === "Risk Agent"
          ? String(run.risk.score)
          : runAgent.name === "Weather Agent"
            ? String(run.weatherRisk.riskScoreDelta)
            : null,
      costUsdc: agent.defaultPriceUsdc,
      startedAt: new Date(),
      completedAt: new Date(),
    });
  }

  return analysisRun.id;
}

export async function recordDbAgentPayment({
  analysisRunId,
  payment,
}: {
  analysisRunId: string;
  payment: AgentPaymentResult;
}) {
  if (!hasDatabaseUrl()) return null;

  const db = getDb();
  const now = new Date();
  const [record] = await db
    .insert(paymentRecords)
    .values({
      analysisRunId,
      amountUsdc: String(safeAmount(payment.amount)),
      status: normalizePaymentStatus(payment.status),
      circleTransactionId: payment.transactionId,
      arcTxHash: payment.txHash,
      explorerUrl: payment.explorerUrl,
      rawCircleResponse: payment,
      confirmedAt: isConfirmedPayment(payment.status) ? now : null,
    })
    .returning();

  await db
    .update(analysisRuns)
    .set({
      paymentStatus: normalizePaymentStatus(payment.status),
      updatedAt: now,
    })
    .where(eq(analysisRuns.id, analysisRunId));

  const storedAgentRuns = await db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.analysisRunId, analysisRunId));

  for (const storedAgentRun of storedAgentRuns) {
    if (storedAgentRun.analysisRunId !== record.analysisRunId) {
      throw new Error("Payment allocation analysis_run mismatch.");
    }

    await db.insert(agentPaymentAllocations).values({
      paymentRecordId: record.id,
      agentRunId: storedAgentRun.id,
      agentId: storedAgentRun.agentId,
      amountUsdc: storedAgentRun.costUsdc,
    });
  }

  return record.id;
}

export async function updateDbAgentPaymentStatus(payment: AgentPaymentResult) {
  if (!hasDatabaseUrl() || !payment.transactionId) return false;

  const db = getDb();
  const existing = await db
    .select()
    .from(paymentRecords)
    .where(eq(paymentRecords.circleTransactionId, payment.transactionId))
    .limit(1);
  const record = existing[0];

  if (!record) return false;

  const now = new Date();
  await db
    .update(paymentRecords)
    .set({
      amountUsdc: String(safeAmount(payment.amount)),
      status: normalizePaymentStatus(payment.status),
      arcTxHash: payment.txHash,
      explorerUrl: payment.explorerUrl,
      rawCircleResponse: payment,
      confirmedAt: isConfirmedPayment(payment.status) ? now : record.confirmedAt,
      updatedAt: now,
    })
    .where(eq(paymentRecords.id, record.id));

  await db
    .update(analysisRuns)
    .set({
      paymentStatus: normalizePaymentStatus(payment.status),
      updatedAt: now,
    })
    .where(eq(analysisRuns.id, record.analysisRunId));

  return true;
}

export async function hasAgentRunsForPayment(paymentRecordId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: agentPaymentAllocations.id })
    .from(agentPaymentAllocations)
    .innerJoin(agentRuns, eq(agentRuns.id, agentPaymentAllocations.agentRunId))
    .innerJoin(paymentRecords, eq(paymentRecords.id, agentPaymentAllocations.paymentRecordId))
    .where(
      and(
        eq(agentPaymentAllocations.paymentRecordId, paymentRecordId),
        eq(agentRuns.analysisRunId, paymentRecords.analysisRunId),
      ),
    );

  return rows.length > 0;
}
