import { z } from "zod";

const uuidSchema = z.string().uuid();
const optionalTextSchema = z.string().trim().max(500).optional();
const moneySchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Expected a positive decimal amount.")
  .optional();
const mileageSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Expected positive mileage.")
  .optional();
const isoDateSchema = z.string().datetime().optional();

export const dispatcherLocationInputSchema = z.object({
  label: optionalTextSchema,
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().min(2).max(64),
  postalCode: optionalTextSchema,
  country: z.string().trim().min(2).max(2).default("US"),
  latitude: z.string().trim().optional(),
  longitude: z.string().trim().optional(),
});

export const dispatcherCreateLoadSchema = z.object({
  organizationId: uuidSchema,
  loadSourceId: uuidSchema.optional(),
  counterpartyId: uuidSchema.optional(),
  referenceNumber: optionalTextSchema,
  equipmentType: z.string().trim().min(1).max(80),
  cargoType: optionalTextSchema,
  weightLbs: z.coerce.number().int().positive().optional(),
  rateAmount: moneySchema,
  currency: z.string().trim().min(3).max(3).default("USD"),
  distanceMiles: mileageSchema,
  pickupStartsAt: isoDateSchema,
  pickupEndsAt: isoDateSchema,
  deliveryStartsAt: isoDateSchema,
  deliveryEndsAt: isoDateSchema,
  pickupLocation: dispatcherLocationInputSchema,
  dropoffLocation: dispatcherLocationInputSchema,
});

export const dispatcherEditLoadSchema = dispatcherCreateLoadSchema
  .partial()
  .extend({
    organizationId: uuidSchema,
    loadId: uuidSchema,
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

export const dispatcherCreateVehicleSchema = z.object({
  organizationId: uuidSchema,
  unitNumber: z.string().trim().min(1).max(80),
  vin: optionalTextSchema,
  equipmentType: z.string().trim().min(1).max(80),
  status: dispatcherVehicleStatusSchema.default("available"),
  expectedAvailableAt: isoDateSchema,
});

export const dispatcherEditVehicleSchema = dispatcherCreateVehicleSchema
  .partial()
  .extend({
    organizationId: uuidSchema,
    vehicleId: uuidSchema,
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
