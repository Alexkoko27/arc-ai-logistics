import type {
  DispatcherCockpitData,
  DispatcherLoadView,
  DispatcherSuggestionView,
  DispatcherVehicleView,
} from "./cockpitQueries";
import { getLoadSuggestionReservabilityIssue } from "./reservationService";

export const MATCHING_STALE_AFTER_MINUTES = 30;

const operationalVehicleStatuses = ["available", "available_soon"];

export type LoadReadinessStatus =
  | "reservable"
  | "reserved"
  | "stale"
  | "unavailable";
export type VehicleReadinessStatus =
  | "available"
  | "reserved"
  | "unavailable"
  | "stale_matching_context";

export type OperationalReadiness<TStatus extends string> = {
  status: TStatus;
  reason: string;
};
export type AttentionTone = "amber" | "gray" | "blue";
export type DispatcherAttentionItem = {
  id: string;
  tone: AttentionTone;
  label: string;
  title: string;
  detail: string;
  reason: string;
};
export type ExplanationTone = "amber" | "gray" | "blue";
export type MatchingExplanationItem = {
  id: string;
  tone: ExplanationTone;
  subject: string;
  label: string;
  message: string;
  source: string;
};
export type FreshnessTone = "green" | "amber" | "gray";
export type FreshnessState = "fresh" | "aging" | "stale" | "pending" | "unavailable";
export type MatchingFreshnessSnapshot = {
  state: FreshnessState;
  tone: FreshnessTone;
  ageLabel: string;
  confidenceLabel: string;
  detail: string;
  generatedAtLabel: string;
  staleDurationLabel: string | null;
};
export type OperationalFreshnessItem = {
  id: string;
  tone: FreshnessTone;
  title: string;
  label: string;
  detail: string;
  confidence: string;
};

type ReservationVisibilityItem = {
  reservationId: string;
  label: string;
  expiresAt: string;
  ageLabel?: string;
  countdownLabel?: string;
  isStale?: boolean;
};

type SuggestionVisibilityItem = {
  suggestionId: string;
  label: string;
  scoreLabel: string;
  isStale?: boolean;
  staleReason?: string;
};

type Formatters = {
  formatDate: (value: Date | null) => string;
  formatDuration: (value: number) => string;
};

export function matchingFreshnessSnapshot({
  ageMs,
  formatDate,
  formatDuration,
  isCompleted,
  latestRun,
  minuteMs,
}: {
  ageMs: number | null;
  formatDate: Formatters["formatDate"];
  formatDuration: Formatters["formatDuration"];
  isCompleted: boolean;
  latestRun: DispatcherCockpitData["latestMatchingRun"];
  minuteMs: number;
}): MatchingFreshnessSnapshot {
  if (!latestRun || ageMs === null) {
    return {
      state: "unavailable",
      tone: "gray",
      ageLabel: "Matching age unavailable",
      confidenceLabel: "Freshness unavailable",
      detail: "No matching run is available for current operational review.",
      generatedAtLabel: "Not set",
      staleDurationLabel: null,
    };
  }

  const staleDurationMs = ageMs - MATCHING_STALE_AFTER_MINUTES * minuteMs;

  if (!isCompleted) {
    return {
      state: "pending",
      tone: "gray",
      ageLabel: `${formatDuration(ageMs)} old`,
      confidenceLabel: "Matching run not ready",
      detail: "Matching run is not ready, so freshness age is informational only.",
      generatedAtLabel: formatDate(latestRun.row.createdAt),
      staleDurationLabel: null,
    };
  }

  if (staleDurationMs > 0) {
    return {
      state: "stale",
      tone: "amber",
      ageLabel: `${formatDuration(ageMs)} old`,
      confidenceLabel: "Review freshness",
      detail: "Matching context is outside the current freshness window.",
      generatedAtLabel: formatDate(latestRun.row.createdAt),
      staleDurationLabel: `stale for ${formatDuration(staleDurationMs)}`,
    };
  }

  if (ageMs > MATCHING_STALE_AFTER_MINUTES * minuteMs * 0.5) {
    return {
      state: "aging",
      tone: "amber",
      ageLabel: `${formatDuration(ageMs)} old`,
      confidenceLabel: "Moderate operational confidence",
      detail: "Matching context is still current but aging.",
      generatedAtLabel: formatDate(latestRun.row.createdAt),
      staleDurationLabel: null,
    };
  }

  return {
    state: "fresh",
    tone: "green",
    ageLabel: `${formatDuration(ageMs)} old`,
    confidenceLabel: "High operational confidence",
    detail: "Matching context was updated recently.",
    generatedAtLabel: formatDate(latestRun.row.createdAt),
    staleDurationLabel: null,
  };
}

export function loadReadiness({
  load,
  matchingIsReady,
  hasReservableSuggestion,
}: {
  load: DispatcherLoadView;
  matchingIsReady: boolean;
  hasReservableSuggestion: boolean;
}): OperationalReadiness<LoadReadinessStatus> {
  if (load.activeReservation) {
    return {
      status: "reserved",
      reason: "Active unexpired operational hold blocks reservation.",
    };
  }

  if (load.status !== "available") {
    return {
      status: "unavailable",
      reason: `Current load status is ${load.status}.`,
    };
  }

  if (!matchingIsReady) {
    return {
      status: "stale",
      reason: "Fresh matching context is required for reservation selection.",
    };
  }

  if (!hasReservableSuggestion) {
    return {
      status: "unavailable",
      reason: "No current reservable load suggestion is available.",
    };
  }

  return {
    status: "reservable",
    reason: "Available load with a fresh reservable suggestion and no active hold.",
  };
}

export function vehicleReadiness({
  vehicle,
  hasActiveReservation,
  matchingIsReady,
}: {
  vehicle: DispatcherVehicleView;
  hasActiveReservation: boolean;
  matchingIsReady: boolean;
}): OperationalReadiness<VehicleReadinessStatus> {
  if (hasActiveReservation) {
    return {
      status: "reserved",
      reason: "Vehicle is tied to an active temporary hold.",
    };
  }

  if (!operationalVehicleStatuses.includes(vehicle.status)) {
    return {
      status: "unavailable",
      reason: `Current vehicle status is ${vehicle.status}.`,
    };
  }

  if (!matchingIsReady) {
    return {
      status: "stale_matching_context",
      reason: "Fresh matching context is required for reservation selection.",
    };
  }

  return {
    status: "available",
    reason: "Vehicle is operationally available in fresh matching context.",
  };
}

export function staleReasonForSuggestion({
  suggestion,
  matchingIsReady,
}: {
  suggestion: DispatcherSuggestionView;
  matchingIsReady: boolean;
}) {
  if (!matchingIsReady) return "matching context is stale or unavailable";
  if (suggestion.row.status !== "suggested") return `suggestion is ${suggestion.row.status}`;
  if (suggestion.load?.status !== "available") {
    return `load is ${suggestion.load?.status ?? "unavailable"}`;
  }
  if (suggestion.activeReservation) return "load already has an active hold";
  return getLoadSuggestionReservabilityIssue({
    suggestion: suggestion.row,
    load: suggestion.load,
    vehicle: suggestion.vehicle,
    currentLoadStops: suggestion.currentLoadStops,
  });
}

export function buildDispatcherAttentionItems({
  activeReservations,
  data,
  loadReadinessItems,
  matchingIsReady,
  reservationSuggestions,
  vehicleReadinessItems,
}: {
  activeReservations: ReservationVisibilityItem[];
  data: DispatcherCockpitData;
  loadReadinessItems: OperationalReadiness<LoadReadinessStatus>[];
  matchingIsReady: boolean;
  reservationSuggestions: SuggestionVisibilityItem[];
  vehicleReadinessItems: OperationalReadiness<VehicleReadinessStatus>[];
}) {
  const items: DispatcherAttentionItem[] = [];

  for (const reservation of activeReservations.filter((item) => item.isStale)) {
    items.push({
      id: `reservation:${reservation.reservationId}`,
      tone: "amber",
      label: "Expiring reservation",
      title: reservation.label,
      detail: reservation.countdownLabel ?? reservation.expiresAt,
      reason: "Temporary hold is close to expiration and needs review.",
    });
  }

  for (const suggestion of reservationSuggestions.filter((item) => item.isStale).slice(0, 4)) {
    items.push({
      id: `suggestion:${suggestion.suggestionId}`,
      tone: "gray",
      label: "Stale matching",
      title: suggestion.label,
      detail: suggestion.scoreLabel || "Review suggested match",
      reason: suggestion.staleReason ?? "Suggestion is unavailable for reservation.",
    });
  }

  data.loads.forEach((load, index) => {
    const readiness = loadReadinessItems[index];
    if (!readiness || readiness.status === "reservable" || readiness.status === "reserved") {
      return;
    }

    items.push({
      id: `load:${load.id}`,
      tone: readiness.status === "stale" ? "amber" : "gray",
      label:
        readiness.status === "stale"
          ? "Stale matching"
          : "Unavailable for reservation",
      title: load.referenceNumber ?? load.externalId ?? load.id,
      detail: load.status,
      reason: readiness.reason,
    });
  });

  data.vehicles.forEach((vehicle, index) => {
    const readiness = vehicleReadinessItems[index];
    if (!readiness || readiness.status === "available" || readiness.status === "reserved") {
      return;
    }

    items.push({
      id: `vehicle:${vehicle.id}`,
      tone: readiness.status === "stale_matching_context" ? "amber" : "blue",
      label:
        readiness.status === "stale_matching_context"
          ? "Stale matching"
          : "Needs review",
      title: vehicle.unitNumber,
      detail: vehicle.status,
      reason: readiness.reason,
    });
  });

  if (!matchingIsReady && data.suggestions.length === 0) {
    items.push({
      id: "matching:no-current-run",
      tone: "amber",
      label: "Needs review",
      title: "Matching context",
      detail: "No fresh suggestions",
      reason: "Fresh matching context is required before reservation selection.",
    });
  }

  return items.slice(0, 8);
}

export function buildMatchingExplanationItems({
  activeReservations,
  data,
  loadReadinessItems,
  matchingIsReady,
  reservationSuggestions,
  vehicleReadinessItems,
}: {
  activeReservations: ReservationVisibilityItem[];
  data: DispatcherCockpitData;
  loadReadinessItems: OperationalReadiness<LoadReadinessStatus>[];
  matchingIsReady: boolean;
  reservationSuggestions: SuggestionVisibilityItem[];
  vehicleReadinessItems: OperationalReadiness<VehicleReadinessStatus>[];
}) {
  const items: MatchingExplanationItem[] = [];

  if (!matchingIsReady) {
    items.push({
      id: "matching-context",
      tone: "amber",
      subject: "Matching context",
      label: "Stale context",
      message:
        "Operational matching context is stale or unavailable, so reservation readiness requires review.",
      source: "latest matching run freshness",
    });
  }

  for (const suggestion of reservationSuggestions.filter((item) => item.isStale)) {
    items.push({
      id: `suggestion:${suggestion.suggestionId}`,
      tone: "gray",
      subject: suggestion.label,
      label: "Suggestion unavailable",
      message:
        suggestion.staleReason ??
        "Suggestion is unavailable because current readiness checks did not pass.",
      source: "suggestion snapshot validation",
    });
  }

  data.loads.forEach((load, index) => {
    const readiness = loadReadinessItems[index];
    if (!readiness || readiness.status === "reservable") return;

    items.push({
      id: `load:${load.id}`,
      tone: readiness.status === "stale" ? "amber" : "gray",
      subject: load.referenceNumber ?? load.externalId ?? load.id,
      label: readiness.status === "reserved" ? "Temporary hold" : readiness.status,
      message: readiness.reason,
      source: "load readiness",
    });
  });

  data.vehicles.forEach((vehicle, index) => {
    const readiness = vehicleReadinessItems[index];
    if (!readiness || readiness.status === "available") return;

    items.push({
      id: `vehicle:${vehicle.id}`,
      tone: readiness.status === "stale_matching_context" ? "amber" : "blue",
      subject: vehicle.unitNumber,
      label:
        readiness.status === "stale_matching_context"
          ? "Stale context"
          : readiness.status,
      message: readiness.reason,
      source: "vehicle readiness",
    });
  });

  for (const reservation of activeReservations.filter((item) => item.isStale)) {
    items.push({
      id: `reservation:${reservation.reservationId}`,
      tone: "amber",
      subject: reservation.label,
      label: "Review needed",
      message:
        "Temporary operational hold expires soon, so the reservation should be reviewed before readiness changes.",
      source: "reservation expiration window",
    });
  }

  return items.slice(0, 12);
}

export function buildOperationalFreshnessItems({
  activeReservations,
  matchingFreshness,
  suggestionReviewCount,
  suggestionCount,
}: {
  activeReservations: ReservationVisibilityItem[];
  matchingFreshness: MatchingFreshnessSnapshot;
  suggestionReviewCount: number;
  suggestionCount: number;
}) {
  const expiringHoldCount = activeReservations.filter((item) => item.isStale).length;
  const holdAgeSummary =
    activeReservations.length > 0
      ? activeReservations
          .map((item) => item.ageLabel)
          .slice(0, 3)
          .join(", ")
      : null;

  return [
    {
      id: "matching-context",
      tone: matchingFreshness.tone,
      title: "Matching context",
      label: matchingFreshness.state,
      detail: [
        `Generated ${matchingFreshness.generatedAtLabel}.`,
        `Matching age ${matchingFreshness.ageLabel}.`,
        matchingFreshness.staleDurationLabel,
      ]
        .filter(Boolean)
        .join(" "),
      confidence: matchingFreshness.confidenceLabel,
    },
    {
      id: "suggestion-readiness",
      tone: suggestionReviewCount > 0 ? "amber" : "green",
      title: "Suggestion readiness",
      label: suggestionReviewCount > 0 ? "readiness review" : "reservable",
      detail:
        suggestionCount > 0
          ? `${suggestionReviewCount} of ${suggestionCount} suggestions are unavailable for reservation review.`
          : "No current suggestions are available for reservation review.",
      confidence:
        suggestionReviewCount > 0
          ? "Derived from reservability checks, not matching age alone."
          : "Current suggestions pass reservation readiness checks.",
    },
    {
      id: "hold-availability",
      tone: expiringHoldCount > 0 ? "amber" : "gray",
      title: "Temporary hold availability",
      label: expiringHoldCount > 0 ? "hold review" : "no pressure",
      detail:
        activeReservations.length > 0
          ? `${expiringHoldCount} of ${activeReservations.length} active holds are near expiration. Hold ages ${holdAgeSummary}.`
          : "No active temporary holds are affecting availability review.",
      confidence:
        expiringHoldCount > 0
          ? "Review hold availability before expiration changes reservability."
          : "No active hold availability pressure.",
    },
  ] satisfies OperationalFreshnessItem[];
}
