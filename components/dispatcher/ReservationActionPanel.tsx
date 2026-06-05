"use client";

import { useMemo, useState, useTransition } from "react";
import {
  releaseDispatcherReservationAction,
  reserveDispatcherLoadAction,
} from "@/app/dispatcher/actions";
import type { DispatcherMutationActionResult } from "@/lib/dispatch/actionResult";

export type ReservationActionSuggestion = {
  suggestionId: string;
  loadId: string;
  vehicleId: string;
  label: string;
  scoreLabel: string;
  isReservable: boolean;
};

export type ReservationActionActiveReservation = {
  reservationId: string;
  label: string;
  expiresAt: string;
};

function resultClass(result: DispatcherMutationActionResult | null) {
  if (!result) return "hidden";
  return result.success
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-red-200 bg-red-50 text-red-700";
}

export default function ReservationActionPanel({
  organizationId,
  suggestions,
  activeReservations,
}: {
  organizationId: string;
  suggestions: ReservationActionSuggestion[];
  activeReservations: ReservationActionActiveReservation[];
}) {
  const [selectedSuggestionId, setSelectedSuggestionId] = useState("");
  const [selectedReservationId, setSelectedReservationId] = useState("");
  const [result, setResult] = useState<DispatcherMutationActionResult | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const reservableSuggestions = useMemo(
    () => suggestions.filter((suggestion) => suggestion.isReservable),
    [suggestions],
  );
  const selectedSuggestion =
    reservableSuggestions.find(
      (suggestion) => suggestion.suggestionId === selectedSuggestionId,
    ) ?? null;

  function submitReserve() {
    if (!selectedSuggestion) return;

    startTransition(async () => {
      const actionResult = await reserveDispatcherLoadAction({
        organizationId,
        loadId: selectedSuggestion.loadId,
        vehicleId: selectedSuggestion.vehicleId,
        loadSuggestionId: selectedSuggestion.suggestionId,
      });
      setResult(actionResult);
      if (actionResult.success) setSelectedSuggestionId("");
    });
  }

  function submitRelease() {
    if (!selectedReservationId) return;

    startTransition(async () => {
      const actionResult = await releaseDispatcherReservationAction({
        organizationId,
        reservationId: selectedReservationId,
        releaseReason: "released",
      });
      setResult(actionResult);
      if (actionResult.success) setSelectedReservationId("");
    });
  }

  return (
    <section className="space-y-3 rounded-lg border border-violet-200 bg-violet-50 p-4">
      <div>
        <h2 className="text-lg font-bold text-gray-950">
          Reservation Actions
        </h2>
        <p className="mt-1 text-sm leading-6 text-violet-800">
          Stage 1D-D-A creates and releases only temporary operational holds on
          loads. Deal, shipment, dispatch, driver assignment, settlement, and
          payment flows are intentionally excluded.
        </p>
      </div>

      <div className={`rounded-md border p-3 text-sm ${resultClass(result)}`}>
        {result?.message}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="font-bold text-gray-950">Reserve Suggested Load</h3>
            <p className="mt-1 text-sm text-gray-600">
              Reserve an available load from the latest matching suggestions.
            </p>
          </div>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-gray-700">Suggestion</span>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 shadow-sm"
              value={selectedSuggestionId}
              onChange={(event) => setSelectedSuggestionId(event.target.value)}
            >
              <option value="">Select suggestion</option>
              {reservableSuggestions.map((suggestion) => (
                <option key={suggestion.suggestionId} value={suggestion.suggestionId}>
                  {suggestion.label} {suggestion.scoreLabel}
                </option>
              ))}
            </select>
          </label>
          <button
            className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            type="button"
            disabled={isPending || !selectedSuggestion}
            onClick={submitReserve}
          >
            Reserve load
          </button>
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="font-bold text-gray-950">Release Reservation</h3>
            <p className="mt-1 text-sm text-gray-600">
              Release an active temporary hold without creating shipment or
              dispatch execution state.
            </p>
          </div>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-gray-700">Active reservation</span>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 shadow-sm"
              value={selectedReservationId}
              onChange={(event) => setSelectedReservationId(event.target.value)}
            >
              <option value="">Select active reservation</option>
              {activeReservations.map((reservation) => (
                <option key={reservation.reservationId} value={reservation.reservationId}>
                  {reservation.label} expires {reservation.expiresAt}
                </option>
              ))}
            </select>
          </label>
          <button
            className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            type="button"
            disabled={isPending || !selectedReservationId}
            onClick={submitRelease}
          >
            Release reservation
          </button>
        </div>
      </div>
    </section>
  );
}
