import { getDbAgentMetrics } from "@/lib/analytics/dbAgentMetrics";
import {
  getLegacyAgentMetrics,
  recordLegacyAgentPayment,
  updateLegacyAgentPaymentStatus,
} from "@/lib/analytics/legacyAgentMetrics";
import type { AgentMetrics } from "@/lib/analytics/types";
import { hasDatabaseUrl } from "@/lib/db/client";
import {
  recordDbAgentPayment,
  updateDbAgentPaymentStatus,
} from "@/lib/db/analysisPersistence";
import type { AgentPaymentResult } from "@/lib/payments/types";

export type {
  AgentMetrics,
  AgentRevenueMetric,
  RecentPaymentRecord,
} from "@/lib/analytics/types";

export async function recordAgentPayment({
  analysisRunId,
  payment,
  shipment,
}: {
  analysisRunId?: string | null;
  payment: AgentPaymentResult;
  shipment: string;
}) {
  if (hasDatabaseUrl() && analysisRunId) {
    try {
      await recordDbAgentPayment({ analysisRunId, payment });
      return;
    } catch {
      // Keep the v0.0.4 JSON analytics path as an isolated legacy fallback.
    }
  }

  recordLegacyAgentPayment({ payment, shipment });
}

export async function updateAgentPaymentStatus(payment: AgentPaymentResult) {
  if (hasDatabaseUrl()) {
    try {
      const updated = await updateDbAgentPaymentStatus(payment);
      if (updated) return;
    } catch {
      // Keep status polling resilient when the DB is unavailable.
    }
  }

  updateLegacyAgentPaymentStatus(payment);
}

export async function getAgentMetrics(): Promise<AgentMetrics> {
  if (hasDatabaseUrl()) {
    try {
      return await getDbAgentMetrics();
    } catch {
      // Dashboard should keep rendering with the legacy empty/fallback state.
    }
  }

  return getLegacyAgentMetrics();
}
