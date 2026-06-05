import { z } from "zod";

const uuidSchema = z.string().uuid();
const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
const optionalTextSchema = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(500).optional(),
);
const positiveIntegerSchema = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().positive().optional(),
);
const moneySchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Expected a positive decimal amount.")
    .refine((value) => Number(value) > 0, "Expected a positive amount.")
    .optional(),
);
const mileageSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Expected positive mileage.")
    .refine((value) => Number(value) > 0, "Expected positive mileage.")
    .optional(),
);
const isoDateSchema = z.preprocess(
  emptyToUndefined,
  z.string().datetime().optional(),
);
const coordinateSchema = z.preprocess(
  emptyToUndefined,
  z.string().trim().optional(),
);

export const dispatcherLocationInputSchema = z.object({
  label: optionalTextSchema,
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().min(2).max(64),
  postalCode: optionalTextSchema,
  country: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.literal("US"))
    .default("US"),
  latitude: coordinateSchema,
  longitude: coordinateSchema,
});

function parseDate(value: string | undefined) {
  return value ? new Date(value).getTime() : null;
}

function validateLoadTiming(
  value: {
    pickupStartsAt?: string;
    pickupEndsAt?: string;
    deliveryStartsAt?: string;
    deliveryEndsAt?: string;
  },
  ctx: z.RefinementCtx,
) {
  const pickupStartsAt = parseDate(value.pickupStartsAt);
  const pickupEndsAt = parseDate(value.pickupEndsAt);
  const deliveryStartsAt = parseDate(value.deliveryStartsAt);
  const deliveryEndsAt = parseDate(value.deliveryEndsAt);

  if (
    pickupStartsAt !== null &&
    pickupEndsAt !== null &&
    pickupStartsAt > pickupEndsAt
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["pickupEndsAt"],
      message: "Pickup end must be after pickup start.",
    });
  }

  if (
    deliveryStartsAt !== null &&
    deliveryEndsAt !== null &&
    deliveryStartsAt > deliveryEndsAt
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["deliveryEndsAt"],
      message: "Delivery end must be after delivery start.",
    });
  }

  if (
    pickupEndsAt !== null &&
    deliveryStartsAt !== null &&
    pickupEndsAt > deliveryStartsAt
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["deliveryStartsAt"],
      message: "Delivery must start after pickup is complete.",
    });
  }
}

const dispatcherLoadMutationFields = z.object({
  loadSourceId: uuidSchema.optional(),
  counterpartyId: uuidSchema.optional(),
  referenceNumber: optionalTextSchema,
  equipmentType: z.string().trim().min(1).max(80),
  cargoType: optionalTextSchema,
  weightLbs: positiveIntegerSchema,
  rateAmount: moneySchema,
  currency: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.literal("USD"))
    .default("USD"),
  distanceMiles: mileageSchema,
  pickupStartsAt: isoDateSchema,
  pickupEndsAt: isoDateSchema,
  deliveryStartsAt: isoDateSchema,
  deliveryEndsAt: isoDateSchema,
  pickupLocation: dispatcherLocationInputSchema,
  dropoffLocation: dispatcherLocationInputSchema,
});

export const dispatcherCreateLoadSchema = dispatcherLoadMutationFields
  .extend({
    organizationId: uuidSchema,
  })
  .superRefine(validateLoadTiming);

export const dispatcherEditLoadSchema = dispatcherLoadMutationFields
  .partial()
  .extend({
    organizationId: uuidSchema,
    loadId: uuidSchema,
  })
  .superRefine((value, ctx) => {
    const changedKeys = Object.keys(value).filter(
      (key) => !["organizationId", "loadId"].includes(key),
    );

    if (changedKeys.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["loadId"],
        message: "At least one load field must be provided for edit.",
      });
    }

    validateLoadTiming(value, ctx);
  });

export const dispatcherVehicleStatusSchema = z.enum([
  "available",
  "busy",
  "available_soon",
  "offline",
  "maintenance",
  "driver_rest",
  "inactive",
]);

const dispatcherVehicleMutationFields = z.object({
  unitNumber: z.string().trim().min(1).max(80),
  vin: optionalTextSchema,
  equipmentType: z.string().trim().min(1).max(80),
  status: dispatcherVehicleStatusSchema,
  expectedAvailableAt: isoDateSchema,
});

function validateVehicleAvailability(
  value: {
    status?: z.infer<typeof dispatcherVehicleStatusSchema>;
    expectedAvailableAt?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (value.status === "available_soon" && !value.expectedAvailableAt) {
    ctx.addIssue({
      code: "custom",
      path: ["expectedAvailableAt"],
      message: "Expected availability time is required for available soon vehicles.",
    });
  }
}

export const dispatcherCreateVehicleSchema = dispatcherVehicleMutationFields
  .extend({
    organizationId: uuidSchema,
    status: dispatcherVehicleStatusSchema.default("available"),
  })
  .superRefine(validateVehicleAvailability);

export const dispatcherEditVehicleSchema = dispatcherVehicleMutationFields
  .partial()
  .extend({
    organizationId: uuidSchema,
    vehicleId: uuidSchema,
  })
  .superRefine((value, ctx) => {
    const changedKeys = Object.keys(value).filter(
      (key) => !["organizationId", "vehicleId"].includes(key),
    );

    if (changedKeys.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["vehicleId"],
        message: "At least one vehicle field must be provided for edit.",
      });
    }

    validateVehicleAvailability(value, ctx);
  });

export const dispatcherReserveLoadSchema = z.object({
  organizationId: uuidSchema,
  loadId: uuidSchema,
  vehicleId: uuidSchema.optional(),
  driverId: uuidSchema.optional(),
  loadSuggestionId: uuidSchema.optional(),
  reservedByUserId: uuidSchema.optional(),
  expiresAt: isoDateSchema,
});

export const dispatcherReleaseReservationSchema = z.object({
  organizationId: uuidSchema,
  reservationId: uuidSchema,
  releaseReason: z.enum(["released", "expired", "cancelled"]).default("released"),
});

export type DispatcherCreateLoadInput = z.infer<
  typeof dispatcherCreateLoadSchema
>;
export type DispatcherEditLoadInput = z.infer<typeof dispatcherEditLoadSchema>;
export type DispatcherLocationInput = z.infer<
  typeof dispatcherLocationInputSchema
>;
export type DispatcherCreateVehicleInput = z.infer<
  typeof dispatcherCreateVehicleSchema
>;
export type DispatcherEditVehicleInput = z.infer<
  typeof dispatcherEditVehicleSchema
>;
export type DispatcherReserveLoadInput = z.infer<
  typeof dispatcherReserveLoadSchema
>;
export type DispatcherReleaseReservationInput = z.infer<
  typeof dispatcherReleaseReservationSchema
>;
