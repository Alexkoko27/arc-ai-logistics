"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createDispatcherVehicleAction,
  editDispatcherVehicleAction,
} from "@/app/dispatcher/actions";
import type { DispatcherMutationActionResult } from "@/lib/dispatch/actionResult";

export type VehicleMutationPanelVehicle = {
  id: string;
  label: string;
  unitNumber: string;
  vin: string;
  equipmentType: string;
  status: string;
  expectedAvailableAt: string;
};

type VehicleFormState = Omit<VehicleMutationPanelVehicle, "id" | "label">;

const vehicleStatuses = [
  "available",
  "available_soon",
  "busy",
  "offline",
  "maintenance",
  "driver_rest",
  "inactive",
];

const emptyFormState: VehicleFormState = {
  unitNumber: "",
  vin: "",
  equipmentType: "dry_van",
  status: "available",
  expectedAvailableAt: "",
};

function toIsoDate(value: string) {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

function dateFromVehicleValue(value: string) {
  if (!value) return null;
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  const date = new Date(hasTimezone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateTimeLocalValue(value: string) {
  const date = dateFromVehicleValue(value);
  if (!date) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
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
  name: keyof VehicleFormState;
  type?: string;
  value: string;
  onChange: (name: keyof VehicleFormState, value: string) => void;
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

function StatusField({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: keyof VehicleFormState, value: string) => void;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-semibold text-gray-700">Availability status</span>
      <select
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 shadow-sm"
        value={value}
        onChange={(event) => onChange("status", event.target.value)}
      >
        {vehicleStatuses.map((status) => (
          <option key={status} value={status}>
            {status.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function buildVehiclePayload(organizationId: string, form: VehicleFormState) {
  return {
    organizationId,
    unitNumber: form.unitNumber,
    vin: form.vin,
    equipmentType: form.equipmentType,
    status: form.status,
    expectedAvailableAt: toIsoDate(form.expectedAvailableAt),
  };
}

function VehicleFields({
  form,
  onChange,
}: {
  form: VehicleFormState;
  onChange: (name: keyof VehicleFormState, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      <Field
        label="Unit number"
        name="unitNumber"
        value={form.unitNumber}
        onChange={onChange}
        required
      />
      <Field label="VIN" name="vin" value={form.vin} onChange={onChange} />
      <Field
        label="Equipment"
        name="equipmentType"
        value={form.equipmentType}
        onChange={onChange}
        required
      />
      <StatusField value={form.status} onChange={onChange} />
      <Field
        label="Expected available"
        name="expectedAvailableAt"
        type="datetime-local"
        value={form.expectedAvailableAt}
        onChange={onChange}
      />
    </div>
  );
}

export default function VehicleMutationPanel({
  organizationId,
  editableVehicles,
}: {
  organizationId: string;
  editableVehicles: VehicleMutationPanelVehicle[];
}) {
  const [createForm, setCreateForm] = useState<VehicleFormState>(emptyFormState);
  const [editForm, setEditForm] = useState<VehicleFormState>(emptyFormState);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [result, setResult] = useState<DispatcherMutationActionResult | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const selectedVehicle = useMemo(
    () => editableVehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [editableVehicles, selectedVehicleId],
  );

  function updateCreateForm(name: keyof VehicleFormState, value: string) {
    setCreateForm((current) => ({ ...current, [name]: value }));
  }

  function updateEditForm(name: keyof VehicleFormState, value: string) {
    setEditForm((current) => ({ ...current, [name]: value }));
  }

  function selectVehicle(vehicleId: string) {
    setSelectedVehicleId(vehicleId);
    const vehicle = editableVehicles.find((candidate) => candidate.id === vehicleId);
    if (!vehicle) {
      setEditForm(emptyFormState);
      return;
    }

    setEditForm({
      unitNumber: vehicle.unitNumber,
      vin: vehicle.vin,
      equipmentType: vehicle.equipmentType,
      status: vehicle.status,
      expectedAvailableAt: toDateTimeLocalValue(vehicle.expectedAvailableAt),
    });
  }

  function submitCreate() {
    startTransition(async () => {
      const actionResult = await createDispatcherVehicleAction(
        buildVehiclePayload(organizationId, createForm),
      );
      setResult(actionResult);
      if (actionResult.success) setCreateForm(emptyFormState);
    });
  }

  function submitEdit() {
    if (!selectedVehicle) return;

    startTransition(async () => {
      const actionResult = await editDispatcherVehicleAction({
        ...buildVehiclePayload(organizationId, editForm),
        vehicleId: selectedVehicle.id,
      });
      setResult(actionResult);
    });
  }

  return (
    <section className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div>
        <h2 className="text-lg font-bold text-gray-950">
          Vehicle Create/Edit Operations
        </h2>
        <p className="mt-1 text-sm leading-6 text-emerald-800">
          Stage 1D-C mutates only Vehicle operational resource records. Driver
          assignment, reservation, dispatch, shipment, deal, settlement, GPS, and
          rematching flows are intentionally excluded.
        </p>
      </div>

      <div className={`rounded-md border p-3 text-sm ${resultClass(result)}`}>
        {result?.message}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="font-bold text-gray-950">Create Vehicle</h3>
            <p className="mt-1 text-sm text-gray-600">
              New vehicles are dispatcher-managed operational resources.
            </p>
          </div>
          <VehicleFields form={createForm} onChange={updateCreateForm} />
          <button
            className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            type="button"
            disabled={isPending}
            onClick={submitCreate}
          >
            Create vehicle
          </button>
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="font-bold text-gray-950">Edit Vehicle</h3>
            <p className="mt-1 text-sm text-gray-600">
              Update vehicle identity, equipment, and availability fields only.
            </p>
          </div>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-gray-700">Vehicle</span>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 shadow-sm"
              value={selectedVehicleId}
              onChange={(event) => selectVehicle(event.target.value)}
            >
              <option value="">Select vehicle</option>
              {editableVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.label}
                </option>
              ))}
            </select>
          </label>
          <VehicleFields form={editForm} onChange={updateEditForm} />
          <button
            className="rounded-md bg-gray-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            type="button"
            disabled={isPending || !selectedVehicle}
            onClick={submitEdit}
          >
            Save vehicle edits
          </button>
        </div>
      </div>
    </section>
  );
}
