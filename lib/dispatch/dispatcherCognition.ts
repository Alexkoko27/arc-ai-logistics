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

function suggestionNeedsReview(suggestion: SuggestionVisibilityItem) {
  return Boolean(suggestion.staleReason);
}

function matchingContextLabel(matchingFreshnessState: MatchingFreshnessSnapshot["state"]) {
  if (matchingFreshnessState === "stale") return "Stale matching";
  if (matchingFreshnessState === "pending") return "Matching review pending";
  if (matchingFreshnessState === "unavailable") return "Matching context unavailable";
  return "Matching review";
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
