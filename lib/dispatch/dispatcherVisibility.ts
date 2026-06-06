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
  | "matching_review"
  | "stale"
  | "unavailable";
export type VehicleReadinessStatus =
  | "available"
  | "reserved"
  | "matching_review"
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
  limitation: string;
};
export type DecisionSupportSignal = {
  id: string;
  tone: AttentionTone;
  priority: "review first" | "high attention" | "monitor";
  title: string;
  summary: string;
  reason: string;
};
export type OperationalReviewPriorityGroup = {
  id: DecisionSupportSignal["priority"];
  title: string;
  description: string;
  rationale: string;
  items: DecisionSupportSignal[];
};
export type OperationalFocusCategory =
  | "reservation risk"
  | "stale operational context"
  | "matching confidence review"
  | "planning availability review"
  | "current planning context";
export type OperationalFocusQueueItem = {
  id: string;
  rank: number;
  category: OperationalFocusCategory;
  title: string;
  reason: string;
  source: string;
  tone: AttentionTone;
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

function matchingContextLabel(matchingFreshnessState: FreshnessState) {
  if (matchingFreshnessState === "stale") return "Stale matching";
  if (matchingFreshnessState === "pending") return "Matching review pending";
  if (matchingFreshnessState === "unavailable") return "Matching context unavailable";
  return "Matching review";
}

function matchingContextReason(matchingFreshnessState: FreshnessState) {
  if (matchingFreshnessState === "stale") {
    return "Fresh matching context is required for reservation selection.";
  }

  if (matchingFreshnessState === "pending") {
    return "Matching context is not ready for reservation selection.";
  }

  return "Matching context is unavailable for reservation selection.";
}

function suggestionNeedsReview(suggestion: SuggestionVisibilityItem) {
  return Boolean(suggestion.staleReason);
}

function confidencePriority(
  matchingFreshness: MatchingFreshnessSnapshot,
): DecisionSupportSignal["priority"] {
  if (["stale", "pending", "unavailable"].includes(matchingFreshness.state)) {
    return "review first";
  }

  if (matchingFreshness.state === "aging") return "monitor";

  return "high attention";
}

function matchingReasoningLimitation(
  matchingFreshness: MatchingFreshnessSnapshot,
) {
  if (matchingFreshness.state === "fresh") {
    return "Context appears current for planning review.";
  }

  if (matchingFreshness.state === "aging") {
    return "Reasoning confidence is limited by aging matching context.";
  }

  if (matchingFreshness.state === "stale") {
    return "Reasoning confidence is limited by stale matching context.";
  }

  if (matchingFreshness.state === "pending") {
    return "Reasoning confidence is limited until matching review is ready.";
  }

  return "Reasoning confidence is limited because matching context is unavailable.";
}

function priorityRank(priority: DecisionSupportSignal["priority"]) {
  if (priority === "review first") return 0;
  if (priority === "high attention") return 1;
  return 2;
}

function decisionSignalRank(signal: DecisionSupportSignal) {
  if (signal.id === "hold-review") return 0;
  if (signal.id === "matching-confidence") return 1;
  if (signal.id === "suggestion-review") return 2;
  if (signal.id === "load-review") return 3;
  if (signal.id === "vehicle-review") return 4;
  return 5;
}

function focusCategoryForSignal(
  signal: DecisionSupportSignal,
): OperationalFocusCategory {
  if (signal.id === "hold-review") return "reservation risk";
  if (signal.id === "matching-confidence") return "matching confidence review";
  if (signal.id === "suggestion-review") return "stale operational context";
  if (signal.id === "load-review" || signal.id === "vehicle-review") {
    return "planning availability review";
  }

  return "current planning context";
}

export function loadReadiness({
  load,
  matchingIsReady,
  matchingFreshnessState,
  hasReservableSuggestion,
}: {
  load: DispatcherLoadView;
  matchingIsReady: boolean;
  matchingFreshnessState: FreshnessState;
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
      status: matchingFreshnessState === "stale" ? "stale" : "matching_review",
      reason: matchingContextReason(matchingFreshnessState),
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
  matchingFreshnessState,
}: {
  vehicle: DispatcherVehicleView;
  hasActiveReservation: boolean;
  matchingIsReady: boolean;
  matchingFreshnessState: FreshnessState;
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
      status:
        matchingFreshnessState === "stale"
          ? "stale_matching_context"
          : "matching_review",
      reason: matchingContextReason(matchingFreshnessState),
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
  matchingFreshnessState,
}: {
  suggestion: DispatcherSuggestionView;
  matchingIsReady: boolean;
  matchingFreshnessState: FreshnessState;
}) {
  if (!matchingIsReady) return matchingContextReason(matchingFreshnessState);
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
  matchingFreshnessState,
  reservationSuggestions,
  vehicleReadinessItems,
}: {
  activeReservations: ReservationVisibilityItem[];
  data: DispatcherCockpitData;
  loadReadinessItems: OperationalReadiness<LoadReadinessStatus>[];
  matchingIsReady: boolean;
  matchingFreshnessState: FreshnessState;
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

  for (const suggestion of reservationSuggestions.filter(suggestionNeedsReview).slice(0, 4)) {
    items.push({
      id: `suggestion:${suggestion.suggestionId}`,
      tone: "gray",
      label: suggestion.isStale ? "Stale matching" : "Review suggestion",
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
        readiness.status === "stale" || readiness.status === "matching_review"
          ? matchingContextLabel(matchingFreshnessState)
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
        readiness.status === "stale_matching_context" ||
        readiness.status === "matching_review"
          ? matchingContextLabel(matchingFreshnessState)
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
      reason: matchingContextReason(matchingFreshnessState),
    });
  }

  return items.slice(0, 8);
}

export function buildMatchingExplanationItems({
  activeReservations,
  data,
  loadReadinessItems,
  matchingIsReady,
  matchingFreshnessState,
  reservationSuggestions,
  vehicleReadinessItems,
}: {
  activeReservations: ReservationVisibilityItem[];
  data: DispatcherCockpitData;
  loadReadinessItems: OperationalReadiness<LoadReadinessStatus>[];
  matchingIsReady: boolean;
  matchingFreshnessState: FreshnessState;
  reservationSuggestions: SuggestionVisibilityItem[];
  vehicleReadinessItems: OperationalReadiness<VehicleReadinessStatus>[];
}) {
  const items: MatchingExplanationItem[] = [];

  if (!matchingIsReady) {
    items.push({
      id: "matching-context",
      tone: "amber",
      subject: "Matching context",
      label: matchingContextLabel(matchingFreshnessState),
      message: `${matchingContextReason(
        matchingFreshnessState,
      )} Reservation readiness requires review.`,
      source: "latest matching run freshness",
    });
  }

  for (const suggestion of reservationSuggestions.filter(suggestionNeedsReview)) {
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
      label:
        readiness.status === "reserved"
          ? "Temporary hold"
          : readiness.status === "stale" ||
              readiness.status === "matching_review"
            ? matchingContextLabel(matchingFreshnessState)
            : readiness.status,
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
        readiness.status === "stale_matching_context" ||
        readiness.status === "matching_review"
          ? matchingContextLabel(matchingFreshnessState)
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
      limitation: matchingReasoningLimitation(matchingFreshness),
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
      limitation:
        suggestionReviewCount > 0
          ? "Visibility reduced until unavailable suggestions are reviewed."
          : "No suggestion-level reasoning limitation is currently visible.",
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
      limitation:
        expiringHoldCount > 0
          ? "Reservation timing reduces planning certainty for affected loads."
          : "No reservation timing limitation is currently visible.",
    },
  ] satisfies OperationalFreshnessItem[];
}

export function buildDispatcherDecisionSupportSignals({
  activeReservations,
  loadReadinessItems,
  matchingFreshness,
  reservationSuggestions,
  vehicleReadinessItems,
}: {
  activeReservations: ReservationVisibilityItem[];
  loadReadinessItems: OperationalReadiness<LoadReadinessStatus>[];
  matchingFreshness: MatchingFreshnessSnapshot;
  reservationSuggestions: SuggestionVisibilityItem[];
  vehicleReadinessItems: OperationalReadiness<VehicleReadinessStatus>[];
}) {
  const signals: DecisionSupportSignal[] = [];
  const expiringHoldCount = activeReservations.filter((item) => item.isStale).length;
  const suggestionReviewCount = reservationSuggestions.filter(suggestionNeedsReview).length;
  const matchingReviewLoadCount = loadReadinessItems.filter((item) =>
    ["stale", "matching_review"].includes(item.status),
  ).length;
  const unavailableLoadCount = loadReadinessItems.filter(
    (item) => item.status === "unavailable",
  ).length;
  const matchingReviewVehicleCount = vehicleReadinessItems.filter((item) =>
    ["stale_matching_context", "matching_review"].includes(item.status),
  ).length;
  const unavailableVehicleCount = vehicleReadinessItems.filter(
    (item) => item.status === "unavailable",
  ).length;

  if (["stale", "pending", "unavailable", "aging"].includes(matchingFreshness.state)) {
    signals.push({
      id: "matching-confidence",
      tone: matchingFreshness.tone === "amber" ? "amber" : "gray",
      priority: confidencePriority(matchingFreshness),
      title: "Matching confidence",
      summary: matchingContextLabel(matchingFreshness.state),
      reason: `${matchingFreshness.detail} ${matchingFreshness.confidenceLabel}.`,
    });
  }

  if (expiringHoldCount > 0) {
    signals.push({
      id: "hold-review",
      tone: "amber",
      priority: "review first",
      title: "Temporary hold review",
      summary: `${expiringHoldCount} active holds near expiration`,
      reason: "Review hold availability first because expiring holds can change reservability soon.",
    });
  }

  if (suggestionReviewCount > 0) {
    signals.push({
      id: "suggestion-review",
      tone: matchingFreshness.state === "stale" ? "amber" : "gray",
      priority: matchingFreshness.state === "stale" ? "review first" : "high attention",
      title: "Suggestion review",
      summary: `${suggestionReviewCount} suggestions unavailable for reservation review`,
      reason: "Review suggested matches with readiness, hold, status, or matching-context issues.",
    });
  }

  if (matchingReviewLoadCount > 0 || unavailableLoadCount > 0) {
    signals.push({
      id: "load-review",
      tone: matchingReviewLoadCount > 0 ? "amber" : "gray",
      priority: matchingReviewLoadCount > 0 ? "high attention" : "monitor",
      title: "Load planning status",
      summary: `${matchingReviewLoadCount} matching review, ${unavailableLoadCount} unavailable`,
      reason: "Review loads blocked by matching context separately from loads unavailable by current load state.",
    });
  }

  if (matchingReviewVehicleCount > 0 || unavailableVehicleCount > 0) {
    signals.push({
      id: "vehicle-review",
      tone: matchingReviewVehicleCount > 0 ? "amber" : "blue",
      priority: matchingReviewVehicleCount > 0 ? "high attention" : "monitor",
      title: "Vehicle planning status",
      summary: `${matchingReviewVehicleCount} matching review, ${unavailableVehicleCount} unavailable`,
      reason: "Review vehicles with matching-context issues separately from vehicles unavailable by current vehicle state.",
    });
  }

  if (signals.length === 0) {
    signals.push({
      id: "current-planning-context",
      tone: "blue",
      priority: "monitor",
      title: "Current planning context",
      summary: "No elevated decision-support signals",
      reason: "Current freshness, readiness, suggestions, and temporary holds do not require elevated review.",
    });
  }

  return [...signals]
    .sort(
      (left, right) =>
        priorityRank(left.priority) - priorityRank(right.priority) ||
        decisionSignalRank(left) - decisionSignalRank(right),
    )
    .slice(0, 5);
}

export function buildOperationalReviewPriorityGroups(
  signals: DecisionSupportSignal[],
) {
  const groupDefinitions: Array<
    Omit<OperationalReviewPriorityGroup, "items">
  > = [
    {
      id: "review first",
      title: "Review First",
      description:
        "Highest planning attention based on freshness confidence, temporary holds, or unavailable suggestions.",
      rationale:
        "Shown first when a planning signal can change reservation readiness soon or reduce confidence in current suggestions.",
    },
    {
      id: "high attention",
      title: "High Attention",
      description:
        "Planning review signals visible before lower-confidence matching context is treated as current.",
      rationale:
        "Shown next when current planning context is usable but still needs dispatcher review before acting on readiness.",
    },
    {
      id: "monitor",
      title: "Monitor",
      description:
        "Lower-pressure planning signals that remain useful for operational awareness.",
      rationale:
        "Shown last when the signal is informative but does not currently block planning visibility.",
    },
  ];

  return groupDefinitions
    .map((group) => ({
      ...group,
      items: signals.filter((signal) => signal.priority === group.id),
    }))
    .filter((group) => group.items.length > 0);
}

export function buildOperationalFocusQueue(
  signals: DecisionSupportSignal[],
) {
  return [...signals]
    .sort(
      (left, right) =>
        priorityRank(left.priority) - priorityRank(right.priority) ||
        decisionSignalRank(left) - decisionSignalRank(right),
    )
    .slice(0, 4)
    .map((signal, index): OperationalFocusQueueItem => ({
      id: signal.id,
      rank: index + 1,
      category: focusCategoryForSignal(signal),
      title: signal.title,
      reason: signal.reason,
      source: signal.summary,
      tone: signal.tone,
    }));
}
