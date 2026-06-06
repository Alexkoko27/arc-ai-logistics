"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  status?: string;
  loadStatus?: string;
  isReservable: boolean;
  isStale?: boolean;
  staleReason?: string;
};

export type ReservationActionActiveReservation = {
  reservationId: string;
  label: string;
  expiresAt: string;
  status?: string;
  ageLabel?: string;
  countdownLabel?: string;
  isStale?: boolean;
};

type MatchingFreshness = {
  generatedAtLabel: string;
  ageLabel: string;
  isStale: boolean;
};

type ActiveOperation = "reserve" | "release" | null;

function resultClass(result: DispatcherMutationActionResult | null) {
  if (!result) return "hidden";
  return result.success
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-red-200 bg-red-50 text-red-800";
}

function fieldErrorMessages(result: DispatcherMutationActionResult | null) {
  if (!result?.fieldErrors) return [];

  return Object.entries(result.fieldErrors).flatMap(([field, messages]) =>
    messages.map((message) => `${field}: ${message}`),
  );
}

export default function ReservationActionPanel({
  organizationId,
  suggestions,
  activeReservations,
  matchingFreshness,
}: {
  organizationId: string;
  suggestions: ReservationActionSuggestion[];
  activeReservations: ReservationActionActiveReservation[];
  matchingFreshness: MatchingFreshness | null;
}) {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState("");
  const [selectedReservationId, setSelectedReservationId] = useState("");
  const [result, setResult] = useState<DispatcherMutationActionResult | null>(
    null,
  );
  const [activeOperation, setActiveOperation] = useState<ActiveOperation>(null);
  const [isPending, startTransition] = useTransition();
  const isMutating = isPending || activeOperation !== null;
  const reservableSuggestions = useMemo(
    () => suggestions.filter((suggestion) => suggestion.isReservable),
    [suggestions],
  );
  const unavailableSuggestionCount = suggestions.length - reservableSuggestions.length;
  const staleHoldCount = activeReservations.filter(
    (reservation) => reservation.isStale,
  ).length;
  const selectedSuggestion =
    reservableSuggestions.find(
      (suggestion) => suggestion.suggestionId === selectedSuggestionId,
    ) ?? null;
  const selectedReservation =
    activeReservations.find(
      (reservation) => reservation.reservationId === selectedReservationId,
    ) ?? null;
  const suggestionSelectValue = selectedSuggestion ? selectedSuggestionId : "";
  const reservationSelectValue = selectedReservation
    ? selectedReservationId
    : "";
  const resultDetails = fieldErrorMessages(result);

  function submitReserve() {
    if (!selectedSuggestion || isMutating || submitLockRef.current) return;

    submitLockRef.current = true;
    setResult(null);
    setActiveOperation("reserve");
    startTransition(async () => {
      try {
        const actionResult = await reserveDispatcherLoadAction({
          organizationId,
          loadId: selectedSuggestion.loadId,
          vehicleId: selectedSuggestion.vehicleId,
          loadSuggestionId: selectedSuggestion.suggestionId,
        });
        setResult(actionResult);
        if (actionResult.success) {
          setSelectedSuggestionId("");
          router.refresh();
        }
      } finally {
        submitLockRef.current = false;
        setActiveOperation(null);
      }
    });
  }

  function submitRelease() {
    if (!selectedReservation || isMutating || submitLockRef.current) return;

    submitLockRef.current = true;
    setResult(null);
    setActiveOperation("release");
    startTransition(async () => {
      try {
        const actionResult = await releaseDispatcherReservationAction({
          organizationId,
          reservationId: selectedReservation.reservationId,
          releaseReason: "released",
        });
        setResult(actionResult);
        if (actionResult.success) {
          setSelectedReservationId("");
          router.refresh();
        }
      } finally {
        submitLockRef.current = false;
        setActiveOperation(null);
      }
    });
  }

  return (
    <section className="space-y-3 rounded-lg border border-violet-200 bg-violet-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-950">
            Reservation Actions
          </h2>
          <p className="mt-1 text-sm leading-6 text-violet-800">
            Stage 1D-E shows temporary operational hold freshness and matching
            suggestion age. Downstream operational flows and driver response
            flows are intentionally excluded.
          </p>
          {matchingFreshness ? (
            <p className="mt-2 text-xs font-semibold text-violet-900">
              Matching generated {matchingFreshness.generatedAtLabel} ({matchingFreshness.ageLabel})
              {matchingFreshness.isStale ? " - stale for reservation selection" : " - fresh"}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-emerald-700">
            {reservableSuggestions.length} reservable
          </span>
          <span className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-blue-700">
            {activeReservations.length} active holds
          </span>
          {staleHoldCount > 0 ? (
            <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-amber-700">
              {staleHoldCount} stale holds
            </span>
          ) : null}
          {unavailableSuggestionCount > 0 ? (
            <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-gray-600">
              {unavailableSuggestionCount} unavailable
            </span>
          ) : null}
        </div>
      </div>

      <div className={`rounded-md border p-3 text-sm ${resultClass(result)}`}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <p className="font-semibold">{result?.message}</p>
          {result?.code ? (
            <span className="font-mono text-xs uppercase tracking-wide opacity-80">
              {result.code}
            </span>
          ) : null}
        </div>
        {resultDetails.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
            {resultDetails.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="font-bold text-gray-950">Reserve Suggested Load</h3>
            <p className="mt-1 text-sm text-gray-600">
              Reserve an available load from fresh, reservable suggestions.
            </p>
          </div>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-gray-700">Suggestion</span>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 shadow-sm disabled:bg-gray-50 disabled:text-gray-500"
              value={suggestionSelectValue}
              disabled={isMutating || reservableSuggestions.length === 0}
              onChange={(event) => setSelectedSuggestionId(event.target.value)}
            >
              <option value="">
                {reservableSuggestions.length > 0
                  ? "Select suggestion"
                  : "No fresh reservable suggestions"}
              </option>
              {reservableSuggestions.map((suggestion) => (
                <option key={suggestion.suggestionId} value={suggestion.suggestionId}>
                  {suggestion.label} {suggestion.scoreLabel}
                </option>
              ))}
            </select>
          </label>
          {selectedSuggestion ? (
            <div className="rounded-md border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
              <p>
                Load status:{" "}
                <span className="font-semibold">
                  {selectedSuggestion.loadStatus ?? "available"}
                </span>
              </p>
              <p className="mt-1">
                Suggestion status:{" "}
                <span className="font-semibold">
                  {selectedSuggestion.status ?? "suggested"}
                </span>
              </p>
            </div>
          ) : null}
          {unavailableSuggestionCount > 0 ? (
            <div className="rounded-md border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
              <p className="font-semibold text-gray-700">Unavailable suggestions</p>
              <ul className="mt-2 space-y-1">
                {suggestions
                  .filter((suggestion) => !suggestion.isReservable)
                  .slice(0, 4)
                  .map((suggestion) => (
                    <li key={suggestion.suggestionId}>
                      {suggestion.label}: {suggestion.staleReason ?? "not reservable"}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
          <button
            className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isMutating || !selectedSuggestion}
            onClick={submitReserve}
          >
            {activeOperation === "reserve" ? "Reserving..." : "Reserve load"}
          </button>
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="font-bold text-gray-950">Release Reservation</h3>
            <p className="mt-1 text-sm text-gray-600">
              Release an active temporary hold without creating downstream
              operational state.
            </p>
          </div>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-gray-700">Active reservation</span>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 shadow-sm disabled:bg-gray-50 disabled:text-gray-500"
              value={reservationSelectValue}
              disabled={isMutating || activeReservations.length === 0}
              onChange={(event) => setSelectedReservationId(event.target.value)}
            >
              <option value="">
                {activeReservations.length > 0
                  ? "Select active reservation"
                  : "No active reservations"}
              </option>
              {activeReservations.map((reservation) => (
                <option key={reservation.reservationId} value={reservation.reservationId}>
                  {reservation.label} expires {reservation.expiresAt}
                </option>
              ))}
            </select>
          </label>
          {selectedReservation ? (
            <div className="rounded-md border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
              <p>
                Reservation status:{" "}
                <span className="font-semibold">
                  {selectedReservation.status ?? "active"}
                </span>
              </p>
              <p className="mt-1">
                Age: <span className="font-semibold">{selectedReservation.ageLabel ?? "unknown"}</span>
              </p>
              <p className="mt-1">
                Expires: <span className="font-semibold">{selectedReservation.expiresAt}</span>
              </p>
              <p className="mt-1">
                Remaining:{" "}
                <span className={selectedReservation.isStale ? "font-semibold text-amber-700" : "font-semibold"}>
                  {selectedReservation.countdownLabel ?? "unknown"}
                </span>
              </p>
            </div>
          ) : null}
          <button
            className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isMutating || !selectedReservation}
            onClick={submitRelease}
          >
            {activeOperation === "release"
              ? "Releasing..."
              : "Release reservation"}
          </button>
        </div>
      </div>
    </section>
  );
}
