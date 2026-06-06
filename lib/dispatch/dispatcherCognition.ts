import type {
  AttentionTone,
  FreshnessTone,
  LoadReadinessStatus,
  MatchingFreshnessSnapshot,
  OperationalReadiness,
  VehicleReadinessStatus,
} from "./dispatcherVisibility";

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

export type OperationalFreshnessItem = {
  id: string;
  tone: FreshnessTone;
  title: string;
  label: string;
  detail: string;
  confidence: string;
  limitation: string;
};

type DecisionSignalId =
  | "hold-review"
  | "matching-confidence"
  | "suggestion-review"
  | "load-review"
  | "vehicle-review"
  | "current-planning-context";

type DecisionSignalPriority = "review first" | "high attention" | "monitor";

export type DecisionSupportSignal = {
  id: DecisionSignalId;
  tone: AttentionTone;
  priority: DecisionSignalPriority;
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

const operationalReasoningText = {
  currentPlanningContext: "Current planning context",
  currentPlanningContextCategory: "current planning context",
  elevatedDecisionSupportSignals: "No elevated decision-support signals",
  matchingConfidence: "Matching confidence",
  matchingContextUnavailable: "Matching context unavailable",
  matchingConfidenceReview: "matching confidence review",
  matchingReview: "Matching review",
  matchingReviewPending: "Matching review pending",
  noVisibleReservationTimingLimitation:
    "No reservation timing limitation is currently visible.",
  noVisibleSuggestionLimitation:
    "No suggestion-level reasoning limitation is currently visible.",
  planningAvailabilityReview: "planning availability review",
  planningConfidenceLimited: "Planning confidence is limited",
  reservationRisk: "reservation risk",
  reservationTimingUncertainty:
    "Reservation timing uncertainty reduces planning confidence for affected loads.",
  staleMatching: "Stale matching",
  staleOperationalContext: "stale operational context",
  temporaryHoldReview: "Temporary hold review",
  visibilityReduced:
    "Planning visibility is reduced until unavailable suggestions are reviewed.",
} as const;

const priorityRankBySignalPriority: Record<DecisionSignalPriority, number> = {
  "review first": 0,
  "high attention": 1,
  monitor: 2,
};

const signalRankById: Record<DecisionSignalId, number> = {
  "hold-review": 0,
  "matching-confidence": 1,
  "suggestion-review": 2,
  "load-review": 3,
  "vehicle-review": 4,
  "current-planning-context": 5,
};

const focusCategoryBySignalId: Record<
  DecisionSignalId,
  OperationalFocusCategory
> = {
  "hold-review": operationalReasoningText.reservationRisk,
  "matching-confidence": operationalReasoningText.matchingConfidenceReview,
  "suggestion-review": operationalReasoningText.staleOperationalContext,
  "load-review": operationalReasoningText.planningAvailabilityReview,
  "vehicle-review": operationalReasoningText.planningAvailabilityReview,
  "current-planning-context": operationalReasoningText.currentPlanningContextCategory,
};

const reviewPriorityGroupDefinitions: Array<
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
      "Shown next when current planning context is usable but still needs dispatcher review before relying on readiness.",
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

function suggestionNeedsReview(suggestion: SuggestionVisibilityItem) {
  return Boolean(suggestion.staleReason);
}

function matchingContextLabel(matchingFreshnessState: MatchingFreshnessSnapshot["state"]) {
  if (matchingFreshnessState === "stale") return operationalReasoningText.staleMatching;
  if (matchingFreshnessState === "pending") {
    return operationalReasoningText.matchingReviewPending;
  }
  if (matchingFreshnessState === "unavailable") {
    return operationalReasoningText.matchingContextUnavailable;
  }
  return operationalReasoningText.matchingReview;
}

function confidencePriority(
  matchingFreshness: MatchingFreshnessSnapshot,
): DecisionSignalPriority {
  if (["stale", "pending", "unavailable"].includes(matchingFreshness.state)) {
    return "review first";
  }

  if (matchingFreshness.state === "aging") return "monitor";

  return "high attention";
}

function suggestionReviewPriority(
  matchingFreshness: MatchingFreshnessSnapshot,
): DecisionSignalPriority {
  return matchingFreshness.state === "stale" ? "review first" : "high attention";
}

function reviewAvailabilityPriority(
  matchingReviewCount: number,
): DecisionSignalPriority {
  return matchingReviewCount > 0 ? "high attention" : "monitor";
}

function matchingConfidenceTone(
  matchingFreshness: MatchingFreshnessSnapshot,
): AttentionTone {
  return matchingFreshness.tone === "amber" ? "amber" : "gray";
}

function suggestionReviewTone(matchingFreshness: MatchingFreshnessSnapshot) {
  return matchingFreshness.state === "stale" ? "amber" : "gray";
}

function matchingReasoningLimitation(
  matchingFreshness: MatchingFreshnessSnapshot,
) {
  if (matchingFreshness.state === "fresh") {
    return "Context appears current for planning review.";
  }

  if (matchingFreshness.state === "aging") {
    return `${operationalReasoningText.planningConfidenceLimited} by aging matching context.`;
  }

  if (matchingFreshness.state === "stale") {
    return `${operationalReasoningText.planningConfidenceLimited} by stale operational context.`;
  }

  if (matchingFreshness.state === "pending") {
    return `${operationalReasoningText.planningConfidenceLimited} until matching review is ready.`;
  }

  return `${operationalReasoningText.planningConfidenceLimited} because matching context is unavailable.`;
}

function decisionSignalRank(signal: DecisionSupportSignal) {
  return signalRankById[signal.id];
}

function focusCategoryForSignal(signal: DecisionSupportSignal) {
  return focusCategoryBySignalId[signal.id];
}

function sortDecisionSignals(signals: DecisionSupportSignal[]) {
  return [...signals].sort(
    (left, right) =>
      priorityRankBySignalPriority[left.priority] -
        priorityRankBySignalPriority[right.priority] ||
      decisionSignalRank(left) - decisionSignalRank(right),
  );
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
          ? operationalReasoningText.visibilityReduced
          : operationalReasoningText.noVisibleSuggestionLimitation,
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
          ? operationalReasoningText.reservationTimingUncertainty
          : operationalReasoningText.noVisibleReservationTimingLimitation,
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
      tone: matchingConfidenceTone(matchingFreshness),
      priority: confidencePriority(matchingFreshness),
      title: operationalReasoningText.matchingConfidence,
      summary: matchingContextLabel(matchingFreshness.state),
      reason: `${matchingFreshness.detail} ${matchingFreshness.confidenceLabel}.`,
    });
  }

  if (expiringHoldCount > 0) {
    signals.push({
      id: "hold-review",
      tone: "amber",
      priority: "review first",
      title: operationalReasoningText.temporaryHoldReview,
      summary: `${expiringHoldCount} active holds near expiration`,
      reason:
        "Operational review should consider temporary hold availability before reservation timing changes reservability.",
    });
  }

  if (suggestionReviewCount > 0) {
    signals.push({
      id: "suggestion-review",
      tone: suggestionReviewTone(matchingFreshness),
      priority: suggestionReviewPriority(matchingFreshness),
      title: "Suggestion review",
      summary: `${suggestionReviewCount} suggestions unavailable for reservation review`,
      reason:
        "Operational review should consider suggested matches with readiness, hold, status, or matching-context limitations.",
    });
  }

  if (matchingReviewLoadCount > 0 || unavailableLoadCount > 0) {
    signals.push({
      id: "load-review",
      tone: matchingReviewLoadCount > 0 ? "amber" : "gray",
      priority: reviewAvailabilityPriority(matchingReviewLoadCount),
      title: "Load planning status",
      summary: `${matchingReviewLoadCount} matching review, ${unavailableLoadCount} unavailable`,
      reason:
        "Operational review should separate loads limited by matching context from loads unavailable by current load state.",
    });
  }

  if (matchingReviewVehicleCount > 0 || unavailableVehicleCount > 0) {
    signals.push({
      id: "vehicle-review",
      tone: matchingReviewVehicleCount > 0 ? "amber" : "blue",
      priority: reviewAvailabilityPriority(matchingReviewVehicleCount),
      title: "Vehicle planning status",
      summary: `${matchingReviewVehicleCount} matching review, ${unavailableVehicleCount} unavailable`,
      reason:
        "Operational review should separate vehicles limited by matching context from vehicles unavailable by current vehicle state.",
    });
  }

  if (signals.length === 0) {
    signals.push({
      id: "current-planning-context",
      tone: "blue",
      priority: "monitor",
      title: operationalReasoningText.currentPlanningContext,
      summary: operationalReasoningText.elevatedDecisionSupportSignals,
      reason: "Current freshness, readiness, suggestions, and temporary holds do not require elevated review.",
    });
  }

  return sortDecisionSignals(signals).slice(0, 5);
}

export function buildOperationalReviewPriorityGroups(
  signals: DecisionSupportSignal[],
) {
  return reviewPriorityGroupDefinitions
    .map((group) => ({
      ...group,
      items: signals.filter((signal) => signal.priority === group.id),
    }))
    .filter((group) => group.items.length > 0);
}

export function buildOperationalFocusQueue(
  signals: DecisionSupportSignal[],
) {
  return sortDecisionSignals(signals)
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
