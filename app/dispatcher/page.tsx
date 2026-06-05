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
  type DispatcherSuggestionView,
  type DispatcherVehicleView,
  getDispatcherCockpitData,
} from "@/lib/dispatch/cockpitQueries";

export const dynamic = "force-dynamic";

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

function statusClass(status: string) {
  if (["available", "suggested", "completed", "active"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["reserved", "converted", "booked", "busy"].includes(status)) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (["released", "expired", "cancelled", "dismissed"].includes(status)) {
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

function VehicleCard({ vehicle }: { vehicle: DispatcherVehicleView }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-950">{vehicle.unitNumber}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {vehicle.equipmentType ?? "Equipment unknown"}
          </p>
        </div>
        <StatusBadge status={vehicle.status} />
      </div>
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

function ReservationState({ load }: { load: DispatcherLoadView }) {
  if (!load.activeReservation) {
    return <span className="text-sm text-gray-500">No active reservation</span>;
  }

  return (
    <div className="space-y-1">
      <StatusBadge status={load.activeReservation.status} />
      <p className="text-xs text-gray-500">
        Expires {formatDate(load.activeReservation.expiresAt)}
      </p>
    </div>
  );
}

function LoadTable({ loads }: { loads: DispatcherLoadView[] }) {
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
          {loads.map((load) => (
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
                <StatusBadge status={load.status} />
              </td>
              <td className="px-4 py-4">
                <ReservationState load={load} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SuggestionCard({
  suggestion,
}: {
  suggestion: DispatcherSuggestionView;
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
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={suggestion.row.status} />
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

export default async function DispatcherCockpitPage() {
  const data = await getDispatcherCockpitData();
  const latestRun = data.latestMatchingRun;
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
  const reservationSuggestions: ReservationActionSuggestion[] = data.suggestions.map(
    (suggestion) => ({
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
      isReservable:
        suggestion.row.status === "suggested" &&
        suggestion.load?.status === "available" &&
        !suggestion.activeReservation,
    }),
  );
  const activeReservations: ReservationActionActiveReservation[] = data.loads
    .filter((load) => load.activeReservation)
    .map((load) => ({
      reservationId: load.activeReservation?.id ?? "",
      label: load.referenceNumber ?? load.externalId ?? load.id,
      expiresAt: formatDate(load.activeReservation?.expiresAt ?? null),
    }));

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
        />
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
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Organization</p>
              <p className="mt-2 text-xl font-bold text-gray-950">
                {data.organization.name}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {data.organization.slug}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Vehicles</p>
              <p className="mt-2 text-2xl font-bold text-gray-950">
                {data.vehicles.length}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Fleet records visible to dispatcher matching.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Loads</p>
              <p className="mt-2 text-2xl font-bold text-gray-950">
                {data.loads.length}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Market opportunities, not deals or shipments.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Latest suggestions</p>
              <p className="mt-2 text-2xl font-bold text-gray-950">
                {data.suggestions.length}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Persisted LoadSuggestion records from the latest run.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader
              title="Vehicles"
              description="Vehicle identity, equipment, availability, latest known location, and assigned driver."
            />
            {data.vehicles.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {data.vehicles.map((vehicle) => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
              </div>
            ) : (
              <EmptyState label="No vehicles found for this organization." />
            )}
          </section>

          <section className="space-y-3">
            <SectionHeader
              title="Loads"
              description="Loads are market opportunities. Reservation visibility is shown separately from load status."
            />
            <LoadTable loads={data.loads} />
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
                      <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600">
                        Created {formatDate(latestRun.row.createdAt)}
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
              description="Ranked persisted recommendations. Scores and snapshots are displayed exactly from Stage 1B persistence."
            />
            {data.suggestions.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {data.suggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.row.id}
                    suggestion={suggestion}
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
