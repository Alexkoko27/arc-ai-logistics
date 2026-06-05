import Link from "next/link";
import LoadMutationPanel, {
  type LoadMutationPanelLoad,
} from "@/components/dispatcher/LoadMutationPanel";
import ReservationActionPanel, {
  type ReservationActionActiveReservation,
  type ReservationActionSuggestion,
} from "@/components/dispatcher/ReservationActionPanel";
import VehicleMutationPanel, {
  type VehicleMutationPanelVehicle,
} from "@/components/dispatcher/VehicleMutationPanel";
import {
  type DispatcherLoadView,
  type DispatcherReservationActivityItem,
  type DispatcherSuggestionView,
  type DispatcherVehicleView,
  getDispatcherCockpitData,
} from "@/lib/dispatch/cockpitQueries";
import { getLoadSuggestionReservabilityIssue } from "@/lib/dispatch/reservationService";

export const dynamic = "force-dynamic";

const MATCHING_STALE_AFTER_MINUTES = 30;
const HOLD_STALE_REMAINING_MINUTES = 5;
const MINUTE_MS = 60 * 1000;
const operationalVehicleStatuses = ["available", "available_soon"];

type LoadReadinessStatus = "reservable" | "reserved" | "stale" | "unavailable";
type VehicleReadinessStatus =
  | "available"
  | "reserved"
  | "unavailable"
  | "stale_matching_context";

type OperationalReadiness<TStatus extends string> = {
  status: TStatus;
  reason: string;
};
type AttentionTone = "amber" | "gray" | "blue";
type DispatcherAttentionItem = {
  id: string;
  tone: AttentionTone;
  label: string;
  title: string;
  detail: string;
  reason: string;
};
type ExplanationTone = "amber" | "gray" | "blue";
type MatchingExplanationItem = {
  id: string;
  tone: ExplanationTone;
  subject: string;
  label: string;
  message: string;
  source: string;
};
type FreshnessTone = "green" | "amber" | "gray";
type FreshnessState = "fresh" | "aging" | "stale" | "pending" | "unavailable";
type MatchingFreshnessSnapshot = {
  state: FreshnessState;
  tone: FreshnessTone;
  ageLabel: string;
  confidenceLabel: string;
  detail: string;
  generatedAtLabel: string;
  staleDurationLabel: string | null;
};
type OperationalFreshnessItem = {
  id: string;
  tone: FreshnessTone;
  title: string;
  label: string;
  detail: string;
  confidence: string;
};

function formatDate(value: Date | null) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatDateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 16) : "";
}

function formatDuration(ms: number) {
  const absoluteMinutes = Math.max(0, Math.round(Math.abs(ms) / MINUTE_MS));
  if (absoluteMinutes < 60) return `${absoluteMinutes}m`;

  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatCurrency(amount: string | null, currency = "USD") {
  if (!amount) return "Rate unavailable";
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return `${amount} ${currency}`;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numericAmount);
}

function formatMiles(value: string | null) {
  if (!value) return "Mileage unavailable";
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return `${value} mi`;
  return `${numericValue.toFixed(0)} mi`;
}

function formatScore(value: string | null) {
  if (!value) return "No score";
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;
  return numericValue.toFixed(1);
}

function matchingFreshnessSnapshot({
  ageMs,
  isCompleted,
  latestRun,
}: {
  ageMs: number | null;
  isCompleted: boolean;
  latestRun: Awaited<ReturnType<typeof getDispatcherCockpitData>>["latestMatchingRun"];
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

  const staleDurationMs = ageMs - MATCHING_STALE_AFTER_MINUTES * MINUTE_MS;

  if (!isCompleted) {
    return {
      state: "pending",
      tone: "gray",
      ageLabel: `${formatDuration(ageMs)} old`,
      confidenceLabel: "Matching run not ready",
      detail: "Matching run has not completed, so freshness age is informational only.",
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
      staleDurationLabel:
        staleDurationMs > 0 ? `stale for ${formatDuration(staleDurationMs)}` : null,
    };
  }

  if (ageMs > MATCHING_STALE_AFTER_MINUTES * MINUTE_MS * 0.5) {
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

function locationLabel(
  location: DispatcherVehicleView["latestLocation"] | null,
) {
  if (!location) return "Location unavailable";
  const cityState = [location.city, location.state].filter(Boolean).join(", ");
  return [location.label, cityState].filter(Boolean).join(" - ");
}

function loadStopLabel(load: DispatcherLoadView, stopType: "pickup" | "dropoff") {
  const stop = load.stops.find((candidate) => candidate.stopType === stopType);
  if (!stop?.location) return "Unknown";
  return locationLabel(stop.location);
}

function loadReadiness({
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

function vehicleReadiness({
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

function statusClass(status: string) {
  if (["available", "reservable", "suggested", "completed", "active", "fresh"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["reserved", "busy"].includes(status)) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (["stale", "stale_matching_context", "expiring"].includes(status)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["released", "expired", "cancelled", "dismissed", "unavailable", "pending"].includes(status)) {
    return "border-gray-200 bg-gray-50 text-gray-600";
  }

  if (["maintenance", "offline", "inactive"].includes(status)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(
        status,
      )}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-gray-600">{description}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-500">
      {label}
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-950">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  );
}

function freshnessToneClass(tone: FreshnessTone) {
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-gray-200 bg-gray-50 text-gray-600";
}

function OperationalFreshnessSection({
  items,
}: {
  items: OperationalFreshnessItem[];
}) {
  return (
    <section className="space-y-3">
      <SectionHeader
        title="Operational Freshness"
        description="Read-only matching freshness age with adjacent suggestion readiness and temporary hold availability indicators."
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-bold text-gray-950">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {item.detail}
                </p>
              </div>
              <span
                className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${freshnessToneClass(
                  item.tone,
                )}`}
              >
                {item.label}
              </span>
            </div>
            <p className="mt-3 text-xs font-semibold text-gray-500">
              {item.confidence}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function attentionToneClass(tone: AttentionTone) {
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-800";
  if (tone === "blue") return "border-blue-200 bg-blue-50 text-blue-800";
  return "border-gray-200 bg-gray-50 text-gray-700";
}

function DispatcherAttentionSection({
  items,
}: {
  items: DispatcherAttentionItem[];
}) {
  return (
    <section className="space-y-3">
      <SectionHeader
        title="Dispatcher Attention"
        description="Read-only operational review list derived from current readiness, suggestions, and reservation activity."
      />
      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-bold text-gray-950">{item.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{item.detail}</p>
                </div>
                <span
                  className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${attentionToneClass(
                    item.tone,
                  )}`}
                >
                  {item.label}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-gray-500">{item.reason}</p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState label="No current attention items." />
      )}
    </section>
  );
}

function explanationToneClass(tone: ExplanationTone) {
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-800";
  if (tone === "blue") return "border-blue-200 bg-blue-50 text-blue-800";
  return "border-gray-200 bg-gray-50 text-gray-700";
}

function MatchingExplanationSection({
  items,
}: {
  items: MatchingExplanationItem[];
}) {
  return (
    <section className="space-y-3">
      <SectionHeader
        title="Matching Explanations"
        description="Read-only reasons derived from current matching freshness, readiness, suggestion validity, and temporary hold state."
      />
      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-bold text-gray-950">{item.subject}</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    {item.message}
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${explanationToneClass(
                    item.tone,
                  )}`}
                >
                  {item.label}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-gray-500">
                Derived from {item.source}.
              </p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState label="No current explanations." />
      )}
    </section>
  );
}

function VehicleCard({
  vehicle,
  readiness,
}: {
  vehicle: DispatcherVehicleView;
  readiness: OperationalReadiness<VehicleReadinessStatus>;
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-950">{vehicle.unitNumber}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {vehicle.equipmentType ?? "Equipment unknown"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={vehicle.status} />
          <StatusBadge status={readiness.status} />
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-500">{readiness.reason}</p>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="font-semibold text-gray-700">Latest location</dt>
          <dd className="mt-1 text-gray-600">
            {locationLabel(vehicle.latestLocation)}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-700">Last seen</dt>
          <dd className="mt-1 text-gray-600">
            {formatDate(vehicle.latestLocationSeenAt)}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-700">Assigned driver</dt>
          <dd className="mt-1 text-gray-600">
            {vehicle.assignedDriver?.name ?? "No active assignment"}
          </dd>
        </div>
        {vehicle.expectedAvailableAt ? (
          <div>
            <dt className="font-semibold text-gray-700">Expected available</dt>
            <dd className="mt-1 text-gray-600">
              {formatDate(vehicle.expectedAvailableAt)}
            </dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

function ReservationState({
  load,
  now,
}: {
  load: DispatcherLoadView;
  now: Date;
}) {
  if (!load.activeReservation) {
    return <span className="text-sm text-gray-500">No active reservation</span>;
  }

  const remainingMs = load.activeReservation.expiresAt.getTime() - now.getTime();
  const isStale = remainingMs <= HOLD_STALE_REMAINING_MINUTES * MINUTE_MS;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={load.activeReservation.status} />
        {isStale ? <StatusBadge status="expiring" /> : null}
      </div>
      <p className="text-xs text-gray-500">
        Age {formatDuration(now.getTime() - load.activeReservation.reservedAt.getTime())}
      </p>
      <p className="text-xs text-gray-500">
        Expires {formatDate(load.activeReservation.expiresAt)}
      </p>
      <p className={isStale ? "text-xs font-semibold text-amber-700" : "text-xs text-gray-500"}>
        {formatDuration(remainingMs)} remaining
      </p>
    </div>
  );
}

function LoadTable({
  loads,
  now,
  matchingIsReady,
  reservableLoadIds,
}: {
  loads: DispatcherLoadView[];
  now: Date;
  matchingIsReady: boolean;
  reservableLoadIds: Set<string>;
}) {
  if (loads.length === 0) {
    return <EmptyState label="No loads found for this organization." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Load</th>
            <th className="px-4 py-3">Lane</th>
            <th className="px-4 py-3">Timing</th>
            <th className="px-4 py-3">Economics</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Reservation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loads.map((load) => {
            const readiness = loadReadiness({
              load,
              matchingIsReady,
              hasReservableSuggestion: reservableLoadIds.has(load.id),
            });

            return (
              <tr key={load.id} className="align-top">
                <td className="px-4 py-4">
                  <p className="font-semibold text-gray-950">
                    {load.referenceNumber ?? load.externalId ?? "Load"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {load.sourceName ?? "Source unknown"} |{" "}
                    {load.equipmentType ?? "Equipment unknown"}
                  </p>
                </td>
                <td className="px-4 py-4 text-gray-600">
                  <p>{loadStopLabel(load, "pickup")}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    to {loadStopLabel(load, "dropoff")}
                  </p>
                </td>
                <td className="px-4 py-4 text-gray-600">
                  <p>Pickup {formatDate(load.pickupStartsAt)}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Delivery {formatDate(load.deliveryEndsAt)}
                  </p>
                </td>
                <td className="px-4 py-4 text-gray-600">
                  <p>{formatCurrency(load.rateAmount, load.currency)}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatMiles(load.distanceMiles)}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={load.status} />
                      <StatusBadge status={readiness.status} />
                    </div>
                    <p className="max-w-52 text-xs text-gray-500">
                      {readiness.reason}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <ReservationState load={load} now={now} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  matchingFreshness,
}: {
  suggestion: DispatcherSuggestionView;
  matchingFreshness: MatchingFreshnessSnapshot;
}) {
  const activeReservation = suggestion.activeReservation;
  const reservationLabel = activeReservation
    ? `Active reservation until ${formatDate(activeReservation.expiresAt)}`
    : "No active reservation";

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Rank {suggestion.row.rank ?? "-"} recommendation
          </p>
          <h3 className="mt-1 font-bold text-gray-950">
            {suggestion.vehicle?.unitNumber ?? "Vehicle"} for{" "}
            {suggestion.load?.referenceNumber ??
              suggestion.load?.externalId ??
              "load"}
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Suggestion persisted {formatDate(suggestion.row.createdAt)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Matching age {matchingFreshness.ageLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={suggestion.row.status} />
          <span
            className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${freshnessToneClass(
              matchingFreshness.tone,
            )}`}
          >
            {matchingFreshness.state}
          </span>
          {activeReservation ? (
            <StatusBadge status={activeReservation.status} />
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Score
          </p>
          <p className="mt-1 text-xl font-bold text-gray-950">
            {formatScore(suggestion.row.scoreTotal)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Deadhead
          </p>
          <p className="mt-1 font-semibold text-gray-950">
            {formatMiles(suggestion.row.estimatedDeadheadMiles)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Estimated profit
          </p>
          <p className="mt-1 font-semibold text-gray-950">
            {formatCurrency(suggestion.row.estimatedProfit, "USD")}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Reservation
          </p>
          <p className="mt-1 font-semibold text-gray-950">{reservationLabel}</p>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-gray-500">
        {matchingFreshness.confidenceLabel}
      </p>

      <div className="mt-4 grid gap-3 text-sm lg:grid-cols-2">
        <div>
          <p className="font-semibold text-gray-700">Explanation</p>
          <p className="mt-1 leading-6 text-gray-600">
            {suggestion.row.explanation ?? "No explanation stored."}
          </p>
        </div>
        <div>
          <p className="font-semibold text-gray-700">Score breakdown</p>
          <p className="mt-1 leading-6 text-gray-600">
            {suggestion.scoreBreakdownSummary}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-xs text-gray-600 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-100 p-3">
          <p className="font-semibold text-gray-700">LoadSuggestion.load_snapshot</p>
          <p className="mt-1 leading-5">{suggestion.loadSnapshotSummary}</p>
        </div>
        <div className="rounded-lg border border-gray-100 p-3">
          <p className="font-semibold text-gray-700">
            LoadSuggestion.vehicle_snapshot
          </p>
          <p className="mt-1 leading-5">{suggestion.vehicleSnapshotSummary}</p>
        </div>
      </div>
    </article>
  );
}

function ReservationActivityList({
  title,
  items,
}: {
  title: string;
  items: DispatcherReservationActivityItem[];
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="font-bold text-gray-950">{title}</h3>
      {items.length > 0 ? (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <article key={item.reservationId} className="rounded-md bg-gray-50 p-3 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-gray-950">{item.loadReference}</p>
                  <p className="mt-1 font-mono text-xs text-gray-500">
                    {item.suggestionReference}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <dl className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
                <div>
                  <dt className="font-semibold text-gray-700">Created</dt>
                  <dd className="mt-1">{formatDate(item.createdAt)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-700">Updated</dt>
                  <dd className="mt-1">{formatDate(item.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-700">Released/expired</dt>
                  <dd className="mt-1">{formatDate(item.releasedAt)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-500">No recent records.</p>
      )}
    </div>
  );
}

function ReservationActivitySection({
  activity,
}: {
  activity: {
    active: DispatcherReservationActivityItem[];
    released: DispatcherReservationActivityItem[];
    expired: DispatcherReservationActivityItem[];
  };
}) {
  return (
    <section className="space-y-3">
      <SectionHeader
        title="Reservation Activity"
        description="Read-only lifecycle visibility for temporary operational holds. Released and expired records are history only."
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <ReservationActivityList title="Recent Active" items={activity.active} />
        <ReservationActivityList title="Recent Released" items={activity.released} />
        <ReservationActivityList title="Recent Expired" items={activity.expired} />
      </div>
    </section>
  );
}

function staleReasonForSuggestion({
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

function buildDispatcherAttentionItems({
  activeReservations,
  data,
  loadReadinessItems,
  matchingIsReady,
  reservationSuggestions,
  vehicleReadinessItems,
}: {
  activeReservations: ReservationActionActiveReservation[];
  data: Awaited<ReturnType<typeof getDispatcherCockpitData>>;
  loadReadinessItems: OperationalReadiness<LoadReadinessStatus>[];
  matchingIsReady: boolean;
  reservationSuggestions: ReservationActionSuggestion[];
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

function buildMatchingExplanationItems({
  activeReservations,
  data,
  loadReadinessItems,
  matchingIsReady,
  reservationSuggestions,
  vehicleReadinessItems,
}: {
  activeReservations: ReservationActionActiveReservation[];
  data: Awaited<ReturnType<typeof getDispatcherCockpitData>>;
  loadReadinessItems: OperationalReadiness<LoadReadinessStatus>[];
  matchingIsReady: boolean;
  reservationSuggestions: ReservationActionSuggestion[];
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

function buildOperationalFreshnessItems({
  activeReservations,
  matchingFreshness,
  suggestionReviewCount,
  suggestionCount,
}: {
  activeReservations: ReservationActionActiveReservation[];
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

export default async function DispatcherCockpitPage() {
  const data = await getDispatcherCockpitData();
  const now = new Date();
  const latestRun = data.latestMatchingRun;
  const matchingAgeMs = latestRun
    ? now.getTime() - latestRun.row.createdAt.getTime()
    : null;
  const matchingIsCompleted = latestRun?.row.status === "completed";
  const matchingIsStale =
    matchingAgeMs !== null &&
    matchingAgeMs > MATCHING_STALE_AFTER_MINUTES * MINUTE_MS;
  const matchingIsReady = latestRun !== null && matchingIsCompleted && !matchingIsStale;
  const matchingFreshnessSnapshotValue = matchingFreshnessSnapshot({
    ageMs: matchingAgeMs,
    isCompleted: matchingIsCompleted,
    latestRun,
  });
  const reservationMatchingFreshness = latestRun && matchingIsCompleted
    ? {
        generatedAtLabel: formatDate(latestRun.row.createdAt),
        ageLabel: `${formatDuration(matchingAgeMs ?? 0)} old`,
        isStale: matchingIsStale,
      }
    : null;
  const activeReservationByVehicleId = new Map(
    data.loads
      .map((load) => load.activeReservation)
      .filter((reservation): reservation is NonNullable<typeof reservation> =>
        Boolean(reservation?.vehicleId),
      )
      .map((reservation) => [reservation.vehicleId, reservation]),
  );
  const reservationSuggestions: ReservationActionSuggestion[] = data.suggestions.map(
    (suggestion) => {
      const staleReason = staleReasonForSuggestion({ suggestion, matchingIsReady });

      return {
        suggestionId: suggestion.row.id,
        loadId: suggestion.row.loadId,
        vehicleId: suggestion.row.vehicleId,
        label: [
          suggestion.vehicle?.unitNumber ?? "Vehicle",
          suggestion.load?.referenceNumber ?? suggestion.load?.externalId ?? "load",
        ].join(" for "),
        scoreLabel: suggestion.row.scoreTotal
          ? `(score ${formatScore(suggestion.row.scoreTotal)})`
          : "",
        status: suggestion.row.status,
        loadStatus: suggestion.load?.status ?? "unknown",
        isReservable: staleReason === null,
        isStale: staleReason !== null,
        staleReason: staleReason ?? undefined,
      };
    },
  );
  const reservableSuggestionCount = reservationSuggestions.filter(
    (suggestion) => suggestion.isReservable,
  ).length;
  const suggestionReviewCount = reservationSuggestions.length - reservableSuggestionCount;
  const reservableLoadIds = new Set(
    reservationSuggestions
      .filter((suggestion) => suggestion.isReservable)
      .map((suggestion) => suggestion.loadId),
  );
  const loadReadinessItems = data.loads.map((load) =>
    loadReadiness({
      load,
      matchingIsReady,
      hasReservableSuggestion: reservableLoadIds.has(load.id),
    }),
  );
  const vehicleReadinessItems = data.vehicles.map((vehicle) =>
    vehicleReadiness({
      vehicle,
      hasActiveReservation: activeReservationByVehicleId.has(vehicle.id),
      matchingIsReady,
    }),
  );
  const readyLoadCount = loadReadinessItems.filter(
    (readiness) => readiness.status === "reservable",
  ).length;
  const blockedLoadCount = data.loads.length - readyLoadCount;
  const readyVehicleCount = vehicleReadinessItems.filter(
    (readiness) => readiness.status === "available",
  ).length;
  const blockedVehicleCount = data.vehicles.length - readyVehicleCount;
  const editableVehicles: VehicleMutationPanelVehicle[] = data.vehicles.map(
    (vehicle) => ({
      id: vehicle.id,
      label: [vehicle.unitNumber, vehicle.equipmentType]
        .filter(Boolean)
        .join(" | "),
      unitNumber: vehicle.unitNumber,
      vin: vehicle.vin ?? "",
      equipmentType: vehicle.equipmentType ?? "",
      status: vehicle.status,
      expectedAvailableAt: formatDateInput(vehicle.expectedAvailableAt),
    }),
  );
  const editableLoads: LoadMutationPanelLoad[] = data.loads
    .filter((load) => load.status === "available" && !load.activeReservation)
    .map((load) => {
      const pickup = load.stops.find((stop) => stop.stopType === "pickup");
      const dropoff = load.stops.find((stop) => stop.stopType === "dropoff");

      return {
        id: load.id,
        label: load.referenceNumber ?? load.externalId ?? load.id,
        referenceNumber: load.referenceNumber ?? "",
        equipmentType: load.equipmentType ?? "",
        cargoType: load.cargoType ?? "",
        weightLbs: load.weightLbs ? load.weightLbs.toString() : "",
        rateAmount: load.rateAmount ?? "",
        distanceMiles: load.distanceMiles ?? "",
        pickupStartsAt: formatDateInput(load.pickupStartsAt),
        pickupEndsAt: formatDateInput(load.pickupEndsAt),
        deliveryStartsAt: formatDateInput(load.deliveryStartsAt),
        deliveryEndsAt: formatDateInput(load.deliveryEndsAt),
        pickupCity: pickup?.location?.city ?? "",
        pickupState: pickup?.location?.state ?? "",
        dropoffCity: dropoff?.location?.city ?? "",
        dropoffState: dropoff?.location?.state ?? "",
      };
    });
  const activeReservations: ReservationActionActiveReservation[] = data.loads
    .filter((load) => load.activeReservation)
    .map((load) => {
      const reservation = load.activeReservation;
      const remainingMs = reservation
        ? reservation.expiresAt.getTime() - now.getTime()
        : 0;

      return {
        reservationId: reservation?.id ?? "",
        label: load.referenceNumber ?? load.externalId ?? load.id,
        expiresAt: formatDate(reservation?.expiresAt ?? null),
        status: reservation?.status,
        ageLabel: reservation
          ? formatDuration(now.getTime() - reservation.reservedAt.getTime())
          : "unknown",
        countdownLabel: reservation ? `${formatDuration(remainingMs)} remaining` : "unknown",
        isStale: remainingMs <= HOLD_STALE_REMAINING_MINUTES * MINUTE_MS,
      };
    });
  const attentionItems = buildDispatcherAttentionItems({
    activeReservations,
    data,
    loadReadinessItems,
    matchingIsReady,
    reservationSuggestions,
    vehicleReadinessItems,
  });
  const matchingExplanationItems = buildMatchingExplanationItems({
    activeReservations,
    data,
    loadReadinessItems,
    matchingIsReady,
    reservationSuggestions,
    vehicleReadinessItems,
  });
  const operationalFreshnessItems = buildOperationalFreshnessItems({
    activeReservations,
    matchingFreshness: matchingFreshnessSnapshotValue,
    suggestionReviewCount,
    suggestionCount: reservationSuggestions.length,
  });

  return (
    <main className="mx-auto w-full max-w-7xl space-y-7 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Stage 1D Dispatcher Operations
          </p>
          <h1 className="text-2xl font-bold text-gray-950 sm:text-3xl">
            Dispatcher Operations Cockpit
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-gray-600 sm:text-base">
            Operations view for Stage 1B vehicles, loads, matching runs, load
            suggestions, and load reservations, with dispatcher-only load and
            vehicle resource mutations. Load, LoadSuggestion, LoadReservation,
            Deal, Shipment, Dispatch, and Settlement remain separate concepts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Dispatcher mutations guarded
          </span>
          {latestRun ? (
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${freshnessToneClass(
                matchingFreshnessSnapshotValue.tone,
              )}`}
            >
              Matching {matchingFreshnessSnapshotValue.state}
            </span>
          ) : null}
          <Link
            className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            href="/"
          >
            Back to MVP
          </Link>
        </div>
      </header>

      {data.organization ? (
        <ReservationActionPanel
          organizationId={data.organization.id}
          suggestions={reservationSuggestions}
          activeReservations={activeReservations}
          matchingFreshness={reservationMatchingFreshness}
        />
      ) : null}

      {data.organization ? (
        <ReservationActivitySection activity={data.reservationActivity} />
      ) : null}

      {data.organization ? (
        <VehicleMutationPanel
          organizationId={data.organization.id}
          editableVehicles={editableVehicles}
        />
      ) : null}

      {data.organization ? (
        <LoadMutationPanel
          organizationId={data.organization.id}
          editableLoads={editableLoads}
        />
      ) : null}

      {!data.isConfigured ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Dispatcher cockpit data is not configured in this runtime. Set the dev
          or preview database environment locally, seed Stage 1B data, and run a
          matching pass before opening this page.
        </section>
      ) : null}

      {data.isConfigured && !data.organization ? (
        <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
          No dispatcher organization was found. Seed Stage 1B mock data to
          populate this cockpit.
        </section>
      ) : null}

      {data.organization ? (
        <>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Organization"
              value={data.organization.name}
              description={data.organization.slug}
            />
            <MetricCard
              label="Vehicles"
              value={data.vehicles.length}
              description="Fleet records visible to dispatcher matching."
            />
            <MetricCard
              label="Loads"
              value={data.loads.length}
              description="Market opportunities, not deals or shipments."
            />
            <MetricCard
              label="Latest suggestions"
              value={data.suggestions.length}
              description="Persisted records from the latest run."
            />
            <MetricCard
              label="Ready loads"
              value={readyLoadCount}
              description="Reservable only with a current fresh suggestion."
            />
            <MetricCard
              label="Blocked loads"
              value={blockedLoadCount}
              description="Reserved, stale, unavailable, or missing a suggestion."
            />
            <MetricCard
              label="Ready vehicles"
              value={readyVehicleCount}
              description="Available vehicles in fresh matching context."
            />
            <MetricCard
              label="Blocked vehicles"
              value={blockedVehicleCount}
              description="Reserved, unavailable, or stale matching context."
            />
            <MetricCard
              label="Active holds"
              value={data.reservationSummary.activeHolds}
              description="Unexpired temporary operational holds."
            />
            <MetricCard
              label="Expired holds"
              value={data.reservationSummary.expiredHolds}
              description="Historical holds no longer blocking reservations."
            />
            <MetricCard
              label="Reservable suggestions"
              value={reservableSuggestionCount}
              description="Fresh suggested loads without active holds."
            />
            <MetricCard
              label="Suggestions needing review"
              value={suggestionReviewCount}
              description="Unavailable due to readiness, hold, status, or matching context."
            />
          </section>

          <DispatcherAttentionSection items={attentionItems} />

          <OperationalFreshnessSection items={operationalFreshnessItems} />

          <MatchingExplanationSection items={matchingExplanationItems} />

          <section className="space-y-3">
            <SectionHeader
              title="Vehicles"
              description="Vehicle identity, equipment, availability, latest known location, and read-only operational readiness."
            />
            {data.vehicles.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {data.vehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    readiness={vehicleReadiness({
                      vehicle,
                      hasActiveReservation: activeReservationByVehicleId.has(vehicle.id),
                      matchingIsReady,
                    })}
                  />
                ))}
              </div>
            ) : (
              <EmptyState label="No vehicles found for this organization." />
            )}
          </section>

          <section className="space-y-3">
            <SectionHeader
              title="Loads"
              description="Loads are market opportunities. Readiness is derived from load state, active holds, matching freshness, and current suggestions."
            />
            <LoadTable
              loads={data.loads}
              now={now}
              matchingIsReady={matchingIsReady}
              reservableLoadIds={reservableLoadIds}
            />
          </section>

          <section className="space-y-3">
            <SectionHeader
              title="Latest Matching Run"
              description="Persisted matching run metadata and immutable input snapshot summary."
            />
            {latestRun ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-mono text-xs text-gray-500">
                      {latestRun.row.id}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge status={latestRun.row.status} />
                      <StatusBadge status={matchingFreshnessSnapshotValue.state} />
                      <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600">
                        Created {formatDate(latestRun.row.createdAt)}
                      </span>
                      <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600">
                        {formatDuration(matchingAgeMs ?? 0)} old
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 md:text-right">
                    <p>{latestRun.row.modelProvider ?? "Provider unknown"}</p>
                    <p className="mt-1">
                      {latestRun.row.modelName ?? "Model unknown"}{" "}
                      {latestRun.row.modelVersion
                        ? `(${latestRun.row.modelVersion})`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Vehicles evaluated
                    </p>
                    <p className="mt-1 text-xl font-bold text-gray-950">
                      {latestRun.vehiclesEvaluated ?? "Unknown"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Loads evaluated
                    </p>
                    <p className="mt-1 text-xl font-bold text-gray-950">
                      {latestRun.loadsEvaluated ?? "Unknown"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Suggestions created
                    </p>
                    <p className="mt-1 text-xl font-bold text-gray-950">
                      {latestRun.suggestionsCreated ?? data.suggestions.length}
                    </p>
                  </div>
                </div>
                {latestRun.row.explanation ? (
                  <p className="mt-4 text-sm leading-6 text-gray-600">
                    {latestRun.row.explanation}
                  </p>
                ) : null}
              </div>
            ) : (
              <EmptyState label="No matching run found. Run Stage 1B matching to populate suggestions." />
            )}
          </section>

          <section className="space-y-3">
            <SectionHeader
              title="Load Suggestions"
              description="Ranked persisted recommendations. Stale matching output is visible but not offered as reservable."
            />
            {data.suggestions.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {data.suggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.row.id}
                    suggestion={suggestion}
                    matchingFreshness={matchingFreshnessSnapshotValue}
                  />
                ))}
              </div>
            ) : (
              <EmptyState label="No load suggestions found for the latest matching run." />
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
