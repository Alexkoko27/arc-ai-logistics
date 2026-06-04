"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createDispatcherLoadAction,
  editDispatcherLoadAction,
} from "@/app/dispatcher/actions";
import type { DispatcherMutationActionResult } from "@/lib/dispatch/actionResult";

export type LoadMutationPanelLoad = {
  id: string;
  label: string;
  referenceNumber: string;
  equipmentType: string;
  cargoType: string;
  weightLbs: string;
  rateAmount: string;
  distanceMiles: string;
  pickupStartsAt: string;
  pickupEndsAt: string;
  deliveryStartsAt: string;
  deliveryEndsAt: string;
  pickupCity: string;
  pickupState: string;
  dropoffCity: string;
  dropoffState: string;
};

type LoadFormState = Omit<LoadMutationPanelLoad, "id" | "label">;

const emptyFormState: LoadFormState = {
  referenceNumber: "",
  equipmentType: "dry_van",
  cargoType: "",
  weightLbs: "",
  rateAmount: "",
  distanceMiles: "",
  pickupStartsAt: "",
  pickupEndsAt: "",
  deliveryStartsAt: "",
  deliveryEndsAt: "",
  pickupCity: "",
  pickupState: "",
  dropoffCity: "",
  dropoffState: "",
};

function toIsoDate(value: string) {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

function resultClass(result: DispatcherMutationActionResult | null) {
  if (!result) return "hidden";
  return result.success
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-red-200 bg-red-50 text-red-700";
}

function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  required = false,
}: {
  label: string;
  name: keyof LoadFormState;
  type?: string;
  value: string;
  onChange: (name: keyof LoadFormState, value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-semibold text-gray-700">{label}</span>
      <input
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 shadow-sm"
        name={name}
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(name, event.target.value)}
      />
    </label>
  );
}

function buildLoadPayload(organizationId: string, form: LoadFormState) {
  return {
    organizationId,
    referenceNumber: form.referenceNumber,
    equipmentType: form.equipmentType,
    cargoType: form.cargoType,
    weightLbs: form.weightLbs,
    rateAmount: form.rateAmount,
    currency: "USD",
    distanceMiles: form.distanceMiles,
    pickupStartsAt: toIsoDate(form.pickupStartsAt),
    pickupEndsAt: toIsoDate(form.pickupEndsAt),
    deliveryStartsAt: toIsoDate(form.deliveryStartsAt),
    deliveryEndsAt: toIsoDate(form.deliveryEndsAt),
    pickupLocation: {
      city: form.pickupCity,
      state: form.pickupState,
      country: "US",
    },
    dropoffLocation: {
      city: form.dropoffCity,
      state: form.dropoffState,
      country: "US",
    },
  };
}

function LoadFields({
  form,
  onChange,
}: {
  form: LoadFormState;
  onChange: (name: keyof LoadFormState, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Field
        label="Reference"
        name="referenceNumber"
        value={form.referenceNumber}
        onChange={onChange}
      />
      <Field
        label="Equipment"
        name="equipmentType"
        value={form.equipmentType}
        onChange={onChange}
        required
      />
      <Field
        label="Cargo"
        name="cargoType"
        value={form.cargoType}
        onChange={onChange}
      />
      <Field
        label="Weight lbs"
        name="weightLbs"
        type="number"
        value={form.weightLbs}
        onChange={onChange}
      />
      <Field
        label="Rate USD"
        name="rateAmount"
        type="number"
        value={form.rateAmount}
        onChange={onChange}
      />
      <Field
        label="Distance miles"
        name="distanceMiles"
        type="number"
        value={form.distanceMiles}
        onChange={onChange}
      />
      <Field
        label="Pickup city"
        name="pickupCity"
        value={form.pickupCity}
        onChange={onChange}
        required
      />
      <Field
        label="Pickup state"
        name="pickupState"
        value={form.pickupState}
        onChange={onChange}
        required
      />
      <Field
        label="Dropoff city"
        name="dropoffCity"
        value={form.dropoffCity}
        onChange={onChange}
        required
      />
      <Field
        label="Dropoff state"
        name="dropoffState"
        value={form.dropoffState}
        onChange={onChange}
        required
      />
      <Field
        label="Pickup start"
        name="pickupStartsAt"
        type="datetime-local"
        value={form.pickupStartsAt}
        onChange={onChange}
      />
      <Field
        label="Pickup end"
        name="pickupEndsAt"
        type="datetime-local"
        value={form.pickupEndsAt}
        onChange={onChange}
      />
      <Field
        label="Delivery start"
        name="deliveryStartsAt"
        type="datetime-local"
        value={form.deliveryStartsAt}
        onChange={onChange}
      />
      <Field
        label="Delivery end"
        name="deliveryEndsAt"
        type="datetime-local"
        value={form.deliveryEndsAt}
        onChange={onChange}
      />
    </div>
  );
}

export default function LoadMutationPanel({
  organizationId,
  editableLoads,
}: {
  organizationId: string;
  editableLoads: LoadMutationPanelLoad[];
}) {
  const [createForm, setCreateForm] = useState<LoadFormState>(emptyFormState);
  const [editForm, setEditForm] = useState<LoadFormState>(emptyFormState);
  const [selectedLoadId, setSelectedLoadId] = useState("");
  const [result, setResult] = useState<DispatcherMutationActionResult | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const selectedLoad = useMemo(
    () => editableLoads.find((load) => load.id === selectedLoadId) ?? null,
    [editableLoads, selectedLoadId],
  );

  function updateCreateForm(name: keyof LoadFormState, value: string) {
    setCreateForm((current) => ({ ...current, [name]: value }));
  }

  function updateEditForm(name: keyof LoadFormState, value: string) {
    setEditForm((current) => ({ ...current, [name]: value }));
  }

  function selectLoad(loadId: string) {
    setSelectedLoadId(loadId);
    const load = editableLoads.find((candidate) => candidate.id === loadId);
    if (!load) {
      setEditForm(emptyFormState);
      return;
    }

    setEditForm({
      referenceNumber: load.referenceNumber,
      equipmentType: load.equipmentType,
      cargoType: load.cargoType,
      weightLbs: load.weightLbs,
      rateAmount: load.rateAmount,
      distanceMiles: load.distanceMiles,
      pickupStartsAt: load.pickupStartsAt,
      pickupEndsAt: load.pickupEndsAt,
      deliveryStartsAt: load.deliveryStartsAt,
      deliveryEndsAt: load.deliveryEndsAt,
      pickupCity: load.pickupCity,
      pickupState: load.pickupState,
      dropoffCity: load.dropoffCity,
      dropoffState: load.dropoffState,
    });
  }

  function submitCreate() {
    startTransition(async () => {
      const actionResult = await createDispatcherLoadAction(
        buildLoadPayload(organizationId, createForm),
      );
      setResult(actionResult);
      if (actionResult.success) setCreateForm(emptyFormState);
    });
  }

  function submitEdit() {
    if (!selectedLoad) return;

    startTransition(async () => {
      const actionResult = await editDispatcherLoadAction({
        ...buildLoadPayload(organizationId, editForm),
        loadId: selectedLoad.id,
      });
      setResult(actionResult);
    });
  }

  return (
    <section className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div>
        <h2 className="text-lg font-bold text-gray-950">
          Load Create/Edit Operations
        </h2>
        <p className="mt-1 text-sm leading-6 text-blue-800">
          Stage 1D-B mutates only Load and pickup/dropoff LoadStops. Status,
          reservation, vehicle, deal, shipment, dispatch, and settlement flows are
          intentionally excluded.
        </p>
      </div>

      <div className={`rounded-md border p-3 text-sm ${resultClass(result)}`}>
        {result?.message}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="font-bold text-gray-950">Create Load</h3>
            <p className="mt-1 text-sm text-gray-600">
              New loads are created as available market opportunities.
            </p>
          </div>
          <LoadFields form={createForm} onChange={updateCreateForm} />
          <button
            className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            type="button"
            disabled={isPending}
            onClick={submitCreate}
          >
            Create load
          </button>
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="font-bold text-gray-950">Edit Available Load</h3>
            <p className="mt-1 text-sm text-gray-600">
              Only available loads without active reservations are editable.
            </p>
          </div>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-gray-700">Load</span>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 shadow-sm"
              value={selectedLoadId}
              onChange={(event) => selectLoad(event.target.value)}
            >
              <option value="">Select available load</option>
              {editableLoads.map((load) => (
                <option key={load.id} value={load.id}>
                  {load.label}
                </option>
              ))}
            </select>
          </label>
          <LoadFields form={editForm} onChange={updateEditForm} />
          <button
            className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            type="button"
            disabled={isPending || !selectedLoad}
            onClick={submitEdit}
          >
            Save load edits
          </button>
        </div>
      </div>
    </section>
  );
}
