"use client";

import type { ChangeEvent } from "react";
import Link from "next/link";
import { useMemo, useState } from "react";

type ScenarioLoad = {
  load_id: string;
  origin_city: string;
  origin_state: string;
  origin_lat: number;
  origin_lng: number;
  destination_city: string;
  destination_state: string;
  destination_lat: number;
  destination_lng: number;
  pickup_date: string;
  delivery_date: string;
  miles: number;
  weight_lbs: number;
  rate_usd: number;
  equipment_type: string;
  commodity: string;
  priority: string;
  shipper_name: string;
};

type ScenarioTruck = {
  truck_id: string;
  current_city: string;
  current_state: string;
  current_lat: number;
  current_lng: number;
  available_date: string;
  equipment_type: string;
  max_weight_lbs: number;
  cost_per_mile: number;
  driver_hours_available: number;
  home_base: string;
};

type ParsedCsv = {
  rows: Record<string, string>[];
  warnings: string[];
};

type ParseSummary = {
  sourceLabel: string;
  loadRowsRead: number;
  truckRowsRead: number;
  loadsLoaded: number;
  trucksLoaded: number;
  loadsSkipped: number;
  trucksSkipped: number;
  warnings: number;
};

type Recommendation = {
  load: ScenarioLoad;
  emptyMiles: number;
  estimatedCost: number;
  estimatedProfit: number;
  score: number;
  whyRecommended: string[];
  riskNotes: string[];
};

type RecommendationGroup = {
  truck: ScenarioTruck;
  recommendations: Recommendation[];
};

type ScenarioSource = "sample" | "uploaded";

type FlatRecommendation = {
  truck: ScenarioTruck;
  recommendation: Recommendation;
};

const loadsPath = "/sample-data/sample_loads_50.csv";
const trucksPath = "/sample-data/sample_trucks_5.csv";
const maxUploadBytes = 1024 * 1024;
const maxUploadedRows = 500;
const maxCsvRowLength = 10000;
const supportedEquipmentTypes = new Set(["dry van", "reefer", "flatbed"]);
const supportedEquipmentLabel = "Dry Van, Reefer, or Flatbed";

const allowedCsvMimeTypes = new Set([
  "",
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
]);

const expectedLoadHeaders = [
  "load_id",
  "origin_city",
  "origin_state",
  "origin_lat",
  "origin_lng",
  "destination_city",
  "destination_state",
  "destination_lat",
  "destination_lng",
  "pickup_date",
  "delivery_date",
  "miles",
  "weight_lbs",
  "rate_usd",
  "equipment_type",
  "commodity",
  "priority",
  "shipper_name",
];

const expectedTruckHeaders = [
  "truck_id",
  "current_city",
  "current_state",
  "current_lat",
  "current_lng",
  "available_date",
  "equipment_type",
  "max_weight_lbs",
  "cost_per_mile",
  "driver_hours_available",
  "home_base",
];

const loadFormulaProtectedFields = [
  "load_id",
  "origin_city",
  "origin_state",
  "destination_city",
  "destination_state",
  "equipment_type",
  "commodity",
  "priority",
  "shipper_name",
];

const truckFormulaProtectedFields = [
  "truck_id",
  "current_city",
  "current_state",
  "equipment_type",
  "home_base",
];

const fieldLabels: Record<string, string> = {
  load_id: "load ID",
  origin_city: "origin city",
  origin_state: "origin state",
  origin_lat: "origin latitude",
  origin_lng: "origin longitude",
  destination_city: "destination city",
  destination_state: "destination state",
  destination_lat: "destination latitude",
  destination_lng: "destination longitude",
  pickup_date: "pickup date",
  delivery_date: "delivery date",
  miles: "loaded miles",
  weight_lbs: "load weight",
  rate_usd: "load rate",
  equipment_type: "equipment type",
  commodity: "commodity",
  priority: "priority",
  shipper_name: "shipper name",
  truck_id: "truck ID",
  current_city: "current city",
  current_state: "current state",
  current_lat: "current latitude",
  current_lng: "current longitude",
  available_date: "available date",
  max_weight_lbs: "maximum truck weight",
  cost_per_mile: "truck cost per mile",
  driver_hours_available: "driver hours available",
  home_base: "home base",
};

function fieldLabel(field: string) {
  return fieldLabels[field] ?? field.replaceAll("_", " ");
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let isQuoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && isQuoted && nextCharacter === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      isQuoted = !isQuoted;
    } else if (character === "," && !isQuoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
}

function parseCsv(text: string, fileLabel: string, expectedHeaders: string[]): ParsedCsv {
  const warnings: string[] = [];
  const trimmedText = text.trim();

  if (!trimmedText) {
    return { rows: [], warnings: [`${fileLabel}: file is empty.`] };
  }

  const [rawHeaderLine, ...rawRows] = trimmedText.split(/\r?\n/);
  const headerLine = rawHeaderLine.replace(/^\uFEFF/, "");
  const expectedHeaderLine = expectedHeaders.join(",");

  if (headerLine.trim() !== expectedHeaderLine) {
    return {
      rows: [],
      warnings: [
        `${fileLabel}: header row does not match the expected Scenario Lab schema. Please start from the sample CSV.`,
        `${fileLabel}: expected ${expectedHeaderLine}`,
      ],
    };
  }

  const rows = rawRows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => row.trim().length > 0);

  return {
    rows: rows.map(({ row, rowNumber }) => {
      const values = splitCsvLine(row);

      if (values.length !== expectedHeaders.length) {
        warnings.push(
          `${fileLabel} row ${rowNumber} warning: expected ${expectedHeaders.length} columns but found ${values.length}.`,
        );
      }

      return expectedHeaders.reduce<Record<string, string>>((record, header, index) => {
        record[header] = values[index] ?? "";
        return record;
      }, {});
    }),
    warnings,
  };
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isDateLike(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function validateText(row: Record<string, string>, fields: string[]) {
  return fields
    .filter((field) => !row[field]?.trim())
    .map((field) => `missing ${fieldLabel(field)}`);
}

function collectNumericIssues(row: Record<string, string>, fields: string[]) {
  return fields
    .map((field) => {
      const rawValue = row[field] ?? "";
      const value = parseNumber(rawValue);

      return {
        field,
        value,
        issue: rawValue.trim() ? null : `missing ${fieldLabel(field)}`,
      };
    })
    .map((result) => ({
      ...result,
      issue: result.issue ?? (result.value === null ? `invalid ${fieldLabel(result.field)}` : null),
    }));
}

function startsWithSpreadsheetFormula(value: string) {
  return /^[=+\-@]/.test(value.trim());
}

function collectFormulaIssues(row: Record<string, string>, fields: string[]) {
  return fields
    .filter((field) => startsWithSpreadsheetFormula(row[field] ?? ""))
    .map((field) => `${fieldLabel(field)} starts with a spreadsheet formula character`);
}

function isSupportedEquipmentType(value: string) {
  return supportedEquipmentTypes.has(value.trim().toLowerCase());
}

function collectCoordinateRangeIssues(numbers: Record<string, number | null>, fields: string[], min: number, max: number) {
  return fields
    .filter((field) => numbers[field] !== null && (numbers[field] < min || numbers[field] > max))
    .map((field) => `${fieldLabel(field)} must be between ${min} and ${max}`);
}

function validateLoad(row: Record<string, string>, rowNumber: number, fileLabel: string, protectFormulaText = false) {
  const issues = validateText(row, [
    "load_id",
    "origin_city",
    "origin_state",
    "destination_city",
    "destination_state",
    "equipment_type",
    "commodity",
    "priority",
    "shipper_name",
  ]);

  if (protectFormulaText) {
    issues.push(...collectFormulaIssues(row, loadFormulaProtectedFields));
  }

  if (row.equipment_type?.trim() && !isSupportedEquipmentType(row.equipment_type)) {
    issues.push(`equipment type is not supported. Use ${supportedEquipmentLabel}`);
  }

  const numericFields = [
    "origin_lat",
    "origin_lng",
    "destination_lat",
    "destination_lng",
    "miles",
    "weight_lbs",
    "rate_usd",
  ];
  const numericResults = collectNumericIssues(row, numericFields);
  const numbers = Object.fromEntries(
    numericResults.map((result) => [result.field, result.value]),
  ) as Record<string, number | null>;

  numericResults.forEach((result) => {
    if (result.issue) issues.push(result.issue);
  });

  issues.push(...collectCoordinateRangeIssues(numbers, ["origin_lat", "destination_lat"], -90, 90));
  issues.push(...collectCoordinateRangeIssues(numbers, ["origin_lng", "destination_lng"], -180, 180));

  ["miles", "weight_lbs", "rate_usd"].forEach((field) => {
    if (numbers[field] !== null && numbers[field] <= 0) {
      issues.push(`${fieldLabel(field)} must be greater than 0`);
    }
  });

  if (!row.pickup_date?.trim()) issues.push("missing pickup date");
  else if (!isDateLike(row.pickup_date)) issues.push("invalid pickup date, expected YYYY-MM-DD");

  if (!row.delivery_date?.trim()) issues.push("missing delivery date");
  else if (!isDateLike(row.delivery_date)) issues.push("invalid delivery date, expected YYYY-MM-DD");

  if (issues.length > 0) {
    return {
      load: null,
      warning: `Row ${rowNumber} skipped in ${fileLabel}: ${issues.join("; ")}.`,
    };
  }

  return {
    load: {
      load_id: row.load_id,
      origin_city: row.origin_city,
      origin_state: row.origin_state,
      origin_lat: numbers.origin_lat ?? 0,
      origin_lng: numbers.origin_lng ?? 0,
      destination_city: row.destination_city,
      destination_state: row.destination_state,
      destination_lat: numbers.destination_lat ?? 0,
      destination_lng: numbers.destination_lng ?? 0,
      pickup_date: row.pickup_date,
      delivery_date: row.delivery_date,
      miles: numbers.miles ?? 0,
      weight_lbs: numbers.weight_lbs ?? 0,
      rate_usd: numbers.rate_usd ?? 0,
      equipment_type: row.equipment_type,
      commodity: row.commodity,
      priority: row.priority,
      shipper_name: row.shipper_name,
    },
    warning: null,
  };
}

function validateTruck(row: Record<string, string>, rowNumber: number, fileLabel: string, protectFormulaText = false) {
  const issues = validateText(row, [
    "truck_id",
    "current_city",
    "current_state",
    "available_date",
    "equipment_type",
    "home_base",
  ]);

  if (protectFormulaText) {
    issues.push(...collectFormulaIssues(row, truckFormulaProtectedFields));
  }

  if (row.equipment_type?.trim() && !isSupportedEquipmentType(row.equipment_type)) {
    issues.push(`equipment type is not supported. Use ${supportedEquipmentLabel}`);
  }

  const numericFields = [
    "current_lat",
    "current_lng",
    "max_weight_lbs",
    "cost_per_mile",
    "driver_hours_available",
  ];
  const numericResults = collectNumericIssues(row, numericFields);
  const numbers = Object.fromEntries(
    numericResults.map((result) => [result.field, result.value]),
  ) as Record<string, number | null>;

  numericResults.forEach((result) => {
    if (result.issue) issues.push(result.issue);
  });

  issues.push(...collectCoordinateRangeIssues(numbers, ["current_lat"], -90, 90));
  issues.push(...collectCoordinateRangeIssues(numbers, ["current_lng"], -180, 180));

  ["max_weight_lbs", "cost_per_mile", "driver_hours_available"].forEach((field) => {
    if (numbers[field] !== null && numbers[field] <= 0) {
      issues.push(`${fieldLabel(field)} must be greater than 0`);
    }
  });

  if (!row.available_date?.trim()) issues.push("missing available date");
  else if (!isDateLike(row.available_date)) issues.push("invalid available date, expected YYYY-MM-DD");

  if (issues.length > 0) {
    return {
      truck: null,
      warning: `Row ${rowNumber} skipped in ${fileLabel}: ${issues.join("; ")}.`,
    };
  }

  return {
    truck: {
      truck_id: row.truck_id,
      current_city: row.current_city,
      current_state: row.current_state,
      current_lat: numbers.current_lat ?? 0,
      current_lng: numbers.current_lng ?? 0,
      available_date: row.available_date,
      equipment_type: row.equipment_type,
      max_weight_lbs: numbers.max_weight_lbs ?? 0,
      cost_per_mile: numbers.cost_per_mile ?? 0,
      driver_hours_available: numbers.driver_hours_available ?? 0,
      home_base: row.home_base,
    },
    warning: null,
  };
}

function mapValidatedLoads(rows: Record<string, string>[], fileLabel: string, protectFormulaText = false) {
  const warnings: string[] = [];
  const loads: ScenarioLoad[] = [];

  rows.forEach((row, index) => {
    const result = validateLoad(row, index + 2, fileLabel, protectFormulaText);
    if (result.load) loads.push(result.load);
    if (result.warning) warnings.push(result.warning);
  });

  return { loads, warnings };
}

function mapValidatedTrucks(rows: Record<string, string>[], fileLabel: string, protectFormulaText = false) {
  const warnings: string[] = [];
  const trucks: ScenarioTruck[] = [];

  rows.forEach((row, index) => {
    const result = validateTruck(row, index + 2, fileLabel, protectFormulaText);
    if (result.truck) trucks.push(result.truck);
    if (result.warning) warnings.push(result.warning);
  });

  return { trucks, warnings };
}

function validateUploadedFileMetadata(file: File) {
  const hasCsvExtension = file.name.toLowerCase().endsWith(".csv");

  if (!hasCsvExtension) {
    return "Only plain CSV files are supported. Please upload a .csv file exported from a spreadsheet editor.";
  }

  if (file.size > maxUploadBytes) {
    return "CSV files must be 1 MB or smaller for this browser-side demo.";
  }

  if (!allowedCsvMimeTypes.has(file.type)) {
    return "Only plain CSV files are supported. Please upload a .csv file exported from a spreadsheet editor.";
  }

  return null;
}

function validateUploadedCsvText(text: string, fileLabel: string, expectedHeaders: string[]) {
  if (text.includes("\0")) {
    return `${fileLabel}: this file appears to contain binary data. Please upload a plain .csv file.`;
  }

  const trimmedText = text.trimStart();
  const lowerText = trimmedText.toLowerCase();

  if (lowerText.startsWith("<!doctype html") || lowerText.startsWith("<html") || lowerText.includes("<script")) {
    return `${fileLabel}: this file looks like HTML, not CSV. Please upload a plain .csv file.`;
  }

  const [rawHeaderLine, ...rawRows] = text.trim().split(/\r?\n/);
  const headerLine = rawHeaderLine?.replace(/^\uFEFF/, "") ?? "";

  if (headerLine.trim() !== expectedHeaders.join(",")) {
    return `${fileLabel}: header row does not match the expected Scenario Lab schema. Please start from the sample CSV.`;
  }

  const dataRows = rawRows.filter((row) => row.trim().length > 0);

  if (dataRows.length > maxUploadedRows) {
    return `${fileLabel}: too many rows. This MVP supports up to ${maxUploadedRows} data rows per uploaded CSV.`;
  }

  if (dataRows.some((row) => row.length > maxCsvRowLength)) {
    return `${fileLabel}: one or more rows are unusually long. Please upload a plain CSV with normal row lengths.`;
  }

  return null;
}

async function readUploadedCsv(file: File, fileLabel: string, expectedHeaders: string[]) {
  const metadataError = validateUploadedFileMetadata(file);
  if (metadataError) throw new Error(metadataError);

  const text = await file.text();
  const contentError = validateUploadedCsvText(text, fileLabel, expectedHeaders);
  if (contentError) throw new Error(contentError);

  return text;
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function haversineMiles(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earthRadiusMiles = 3958.8;
  const latDelta = degreesToRadians(toLat - fromLat);
  const lngDelta = degreesToRadians(toLng - fromLng);
  const startLat = degreesToRadians(fromLat);
  const endLat = degreesToRadians(toLat);
  const a = clamp(
    Math.sin(latDelta / 2) ** 2 +
      Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) ** 2,
    0,
    1,
  );
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMiles * c;
}

function priorityScore(priority: string) {
  const normalized = priority.toLowerCase();
  if (normalized === "expedited" || normalized === "high") return 10;
  if (normalized === "standard" || normalized === "medium") return 6;
  return 3;
}

function buildRecommendation(truck: ScenarioTruck, load: ScenarioLoad): Recommendation | null {
  if (truck.equipment_type !== load.equipment_type) return null;
  if (load.weight_lbs > truck.max_weight_lbs) return null;

  const emptyMiles = haversineMiles(
    truck.current_lat,
    truck.current_lng,
    load.origin_lat,
    load.origin_lng,
  );
  const estimatedCost = (load.miles + emptyMiles) * truck.cost_per_mile;
  const estimatedProfit = load.rate_usd - estimatedCost;

  if (estimatedProfit <= 0) return null;

  const margin = estimatedProfit / load.rate_usd;
  const profitScore = clamp(margin * 100, 0, 40);
  const emptyMilesScore = clamp(15 - (emptyMiles / 250) * 15, 0, 15);
  const score = Math.round(
    profitScore + emptyMilesScore + 20 + 15 + priorityScore(load.priority),
  );

  if (score < 60) return null;

  const whyRecommended = [
    `${truck.equipment_type} equipment matches the load requirement.`,
    `Projected profit is ${formatCurrency(estimatedProfit)} after loaded and empty miles.`,
    `${load.priority} priority adds transparent dispatch score value.`,
  ];
  const riskNotes = [
    emptyMiles > 200
      ? `Empty miles are high at ${formatMiles(emptyMiles)}, so dispatcher review is recommended.`
      : `Empty miles are controlled at ${formatMiles(emptyMiles)}.`,
    margin < 0.18
      ? `Profit margin is modest at ${formatPercent(margin)}.`
      : `Profit margin is healthy at ${formatPercent(margin)}.`,
    `Contact with ${load.shipper_name} is simulated in this MVP.`,
  ];

  return {
    load,
    emptyMiles,
    estimatedCost,
    estimatedProfit,
    score,
    whyRecommended,
    riskNotes,
  };
}

function runMatching(loads: ScenarioLoad[], trucks: ScenarioTruck[]): RecommendationGroup[] {
  return trucks.map((truck) => ({
    truck,
    recommendations: loads
      .map((load) => buildRecommendation(truck, load))
      .filter((recommendation): recommendation is Recommendation => recommendation !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3),
  }));
}

function flattenRecommendations(groups: RecommendationGroup[]) {
  return groups.flatMap((group) =>
    group.recommendations.map((recommendation) => ({ truck: group.truck, recommendation })),
  );
}

function dispatcherNote(recommendation: Recommendation) {
  if (recommendation.emptyMiles > 200) return "Review due to high empty miles";
  if (recommendation.score >= 82 && recommendation.emptyMiles <= 150) return "Strong match";
  if (recommendation.score < 75 && recommendation.load.rate_usd >= 3000) return "Strategic / repositioning candidate";
  return "Review manually";
}

function whyThisMatch(truck: ScenarioTruck, recommendation: Recommendation) {
  const scoreQuality = recommendation.score >= 85 ? "High" : recommendation.score >= 75 ? "Solid" : "Moderate";
  const proximity = recommendation.emptyMiles <= 100
    ? "near the pickup origin"
    : recommendation.emptyMiles <= 200
      ? "within a workable empty-mile range"
      : "requires a longer repositioning move";
  const profitQuality = recommendation.estimatedProfit >= 1500 ? "strong profit" : "positive profit";

  return `${scoreQuality} score because ${truck.equipment_type} equipment fits, the truck is ${proximity}, and the lane shows ${profitQuality} on ${formatCurrency(recommendation.load.rate_usd)} revenue.`;
}

function escapeCsvCell(value: string | number) {
  const rawValue = String(value ?? "");
  const formulaSafeValue = startsWithSpreadsheetFormula(rawValue) ? `'${rawValue}` : rawValue;
  return `"${formulaSafeValue.replaceAll('"', '""')}"`;
}

function buildMatchingResultsCsv(items: FlatRecommendation[]) {
  const header = [
    "truck_id",
    "load_id",
    "origin",
    "destination",
    "equipment_type",
    "score",
    "empty_miles",
    "revenue_usd",
    "dispatcher_note",
    "why_summary",
  ];
  const rows = items.map(({ truck, recommendation }) => [
    truck.truck_id,
    recommendation.load.load_id,
    `${recommendation.load.origin_city}, ${recommendation.load.origin_state}`,
    `${recommendation.load.destination_city}, ${recommendation.load.destination_state}`,
    recommendation.load.equipment_type,
    recommendation.score,
    Math.round(recommendation.emptyMiles),
    recommendation.load.rate_usd,
    dispatcherNote(recommendation),
    whyThisMatch(truck, recommendation),
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyWithCents(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMiles(value: number) {
  return `${Math.round(value).toLocaleString()} mi`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatLane(load: ScenarioLoad) {
  return `${load.origin_city}, ${load.origin_state} -> ${load.destination_city}, ${load.destination_state}`;
}

export default function ScenarioLabPage() {
  const [loads, setLoads] = useState<ScenarioLoad[]>([]);
  const [trucks, setTrucks] = useState<ScenarioTruck[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [parseSummary, setParseSummary] = useState<ParseSummary | null>(null);
  const [recommendationGroups, setRecommendationGroups] = useState<RecommendationGroup[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "matching" | "matched">("idle");
  const [error, setError] = useState<string | null>(null);
  const [uploadedLoadsFile, setUploadedLoadsFile] = useState<File | null>(null);
  const [uploadedTrucksFile, setUploadedTrucksFile] = useState<File | null>(null);
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const [activeSource, setActiveSource] = useState<ScenarioSource | null>(null);
  const [isDispatcherHelpOpen, setIsDispatcherHelpOpen] = useState(false);

  const summary = useMemo(() => {
    const equipmentTypes = Array.from(
      new Set([...loads.map((load) => load.equipment_type), ...trucks.map((truck) => truck.equipment_type)]),
    ).sort();
    const totalRevenue = loads.reduce((sum, load) => sum + load.rate_usd, 0);

    return {
      equipmentTypes,
      totalRevenue,
    };
  }, [loads, trucks]);

  const flatRecommendations = useMemo(
    () => flattenRecommendations(recommendationGroups),
    [recommendationGroups],
  );

  const matchingMetrics = useMemo(() => {
    const totalRecommendations = flatRecommendations.length;
    const matchedTrucks = recommendationGroups.filter((group) => group.recommendations.length > 0).length;
    const totalScore = flatRecommendations.reduce((sum, item) => sum + item.recommendation.score, 0);
    const potentialMatchedRevenue = flatRecommendations.reduce(
      (sum, item) => sum + item.recommendation.load.rate_usd,
      0,
    );
    const totalEmptyMiles = flatRecommendations.reduce((sum, item) => sum + item.recommendation.emptyMiles, 0);

    return {
      matchedTrucks,
      totalRecommendations,
      averageScore: totalRecommendations > 0 ? Math.round(totalScore / totalRecommendations) : 0,
      potentialMatchedRevenue,
      averageEmptyMiles: totalRecommendations > 0 ? totalEmptyMiles / totalRecommendations : 0,
    };
  }, [flatRecommendations, recommendationGroups]);

  function resetScenario() {
    setLoads([]);
    setTrucks([]);
    setValidationWarnings([]);
    setParseSummary(null);
    setRecommendationGroups([]);
    setStatus("idle");
    setError(null);
    setUploadedLoadsFile(null);
    setUploadedTrucksFile(null);
    setUploadInputKey((key) => key + 1);
    setActiveSource(null);
  }

  function applyParsedScenario(
    parsedLoads: ParsedCsv,
    parsedTrucks: ParsedCsv,
    source: ScenarioSource,
    loadFileLabel: string,
    truckFileLabel: string,
    protectFormulaText = false,
  ) {
    const loadResults = mapValidatedLoads(parsedLoads.rows, loadFileLabel, protectFormulaText);
    const truckResults = mapValidatedTrucks(parsedTrucks.rows, truckFileLabel, protectFormulaText);
    const warnings = [
      ...parsedLoads.warnings,
      ...parsedTrucks.warnings,
      ...loadResults.warnings,
      ...truckResults.warnings,
    ];
    const nextParseSummary = {
      sourceLabel: source === "sample" ? "Sample CSV data" : "Uploaded CSV data",
      loadRowsRead: parsedLoads.rows.length,
      truckRowsRead: parsedTrucks.rows.length,
      loadsLoaded: loadResults.loads.length,
      trucksLoaded: truckResults.trucks.length,
      loadsSkipped: Math.max(parsedLoads.rows.length - loadResults.loads.length, 0),
      trucksSkipped: Math.max(parsedTrucks.rows.length - truckResults.trucks.length, 0),
      warnings: warnings.length,
    };

    setLoads(loadResults.loads);
    setTrucks(truckResults.trucks);
    setValidationWarnings(warnings);
    setParseSummary(nextParseSummary);
    setRecommendationGroups([]);
    setActiveSource(source);

    if (loadResults.loads.length === 0 || truckResults.trucks.length === 0) {
      setError("No valid scenario rows were available to match.");
      setStatus("idle");
      return;
    }

    setStatus("loaded");
  }

  async function loadSampleScenario() {
    setStatus("loading");
    setError(null);
    setValidationWarnings([]);
    setParseSummary(null);
    setRecommendationGroups([]);

    try {
      const [loadsResponse, trucksResponse] = await Promise.all([
        fetch(loadsPath),
        fetch(trucksPath),
      ]);

      if (!loadsResponse.ok || !trucksResponse.ok) {
        throw new Error("Unable to load sample scenario CSV files.");
      }

      const [loadsText, trucksText] = await Promise.all([
        loadsResponse.text(),
        trucksResponse.text(),
      ]);
      const parsedLoads = parseCsv(loadsText, "sample_loads_50.csv", expectedLoadHeaders);
      const parsedTrucks = parseCsv(trucksText, "sample_trucks_5.csv", expectedTruckHeaders);

      applyParsedScenario(parsedLoads, parsedTrucks, "sample", "sample_loads_50.csv", "sample_trucks_5.csv");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load sample scenario.");
      setStatus("idle");
    }
  }

  async function loadUploadedScenario() {
    if (!uploadedLoadsFile || !uploadedTrucksFile) {
      setError("Please choose one loads CSV and one trucks CSV before loading uploaded data.");
      return;
    }

    setStatus("loading");
    setError(null);
    setValidationWarnings([]);
    setParseSummary(null);
    setRecommendationGroups([]);

    try {
      const [loadsText, trucksText] = await Promise.all([
        readUploadedCsv(uploadedLoadsFile, "uploaded loads CSV", expectedLoadHeaders),
        readUploadedCsv(uploadedTrucksFile, "uploaded trucks CSV", expectedTruckHeaders),
      ]);
      const parsedLoads = parseCsv(loadsText, "uploaded loads CSV", expectedLoadHeaders);
      const parsedTrucks = parseCsv(trucksText, "uploaded trucks CSV", expectedTruckHeaders);

      applyParsedScenario(parsedLoads, parsedTrucks, "uploaded", "uploaded loads CSV", "uploaded trucks CSV", true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load uploaded CSV files.");
      setStatus("idle");
    }
  }

  function handleLoadsUpload(event: ChangeEvent<HTMLInputElement>) {
    setUploadedLoadsFile(event.target.files?.[0] ?? null);
    setError(null);
  }

  function handleTrucksUpload(event: ChangeEvent<HTMLInputElement>) {
    setUploadedTrucksFile(event.target.files?.[0] ?? null);
    setError(null);
  }

  function runScenarioMatching() {
    setStatus("matching");
    setError(null);
    setRecommendationGroups(runMatching(loads, trucks));
    setStatus("matched");
  }

  function exportMatchingResults() {
    if (flatRecommendations.length === 0) return;

    const csv = buildMatchingResultsCsv(flatRecommendations);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "scenario_lab_matching_results.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="space-y-7 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Demo sandbox
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold sm:text-3xl">Scenario Lab</h1>
            <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
              Experimental / WIP
            </span>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-gray-600 sm:text-base">
            Test truck-to-load matching with sample or uploaded CSV data.
          </p>
          <section className="mx-auto max-w-4xl rounded-xl border border-lime-200 bg-lime-50/70 p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-lime-800">
              Dispatcher guide
            </p>
            <button
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() => setIsDispatcherHelpOpen((isOpen) => !isOpen)}
              type="button"
            >
              <span>
                <span className="block text-sm font-bold text-gray-900">How does this help dispatchers?</span>
                <span className="block text-sm leading-6 text-gray-600">See which truck fits which load — and why.</span>
              </span>
              <span className="rounded border border-lime-300 bg-white/70 px-2 py-1 text-xs font-semibold text-lime-800">
                {isDispatcherHelpOpen ? "Hide" : "Show"}
              </span>
            </button>
            {isDispatcherHelpOpen && (
              <div className="mt-4 grid gap-3 text-sm leading-6 text-gray-700 md:grid-cols-2">
                <div>
                  <p className="font-semibold text-gray-900">What this page does</p>
                  <p>Scenario Lab lets you test how Arc AI Logistics matches available trucks with open loads.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">How to test it</p>
                  <p>Use sample CSVs or upload your own loads and trucks CSVs. The page compares location, origin, equipment, empty miles, revenue, and score.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">What it proves</p>
                  <p>It shows how the app can support dispatchers before connecting to real GPS, ELD, TMS, or load-board APIs.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Important</p>
                  <p>This is a manual simulation of an operational feed, not live GPS integration. Uploaded CSVs stay local in the browser and are not saved to Neon, sent to Gemini, or connected to Circle payments.</p>
                </div>
              </div>
            )}
          </section>
          <p className="max-w-3xl rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-800">
            Scenario Lab is a local sandbox for testing CSV-based truck/load matching. In v0.0.5.a, matching runs in the browser and does not create a paid agent run.
          </p>
          <p className="max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
            This is a demo sandbox using sample CSV data. It does not contact real brokers or shippers.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="text-sm font-semibold underline underline-offset-4" href="/">
            Back to demo
          </Link>
          <Link className="text-sm font-semibold underline underline-offset-4" href="/dashboard">
            Agent dashboard
          </Link>
        </div>
      </header>

      <section className="space-y-4 rounded-xl border p-4">
        <div className="space-y-2">
          <h2 className="font-bold">Prepare CSV files</h2>
          <p className="text-sm leading-6 text-gray-700">
            Start by downloading the sample loads CSV and sample trucks CSV. Edit copies in Google Sheets, Excel, or LibreOffice, then export or save them as plain CSV files.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-gray-700">
            <li>Do not change column names or remove required columns.</li>
            <li>Use one CSV for loads and one CSV for trucks.</li>
            <li>Dates must use YYYY-MM-DD.</li>
            <li>Coordinates, miles, weight, rates, cost per mile, and driver hours must be numbers.</li>
            <li>Only plain .csv files are supported. Do not upload .xlsx, .xls, PDF, ZIP, HTML, images, or any other file type.</li>
          </ul>
          <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-800">
            Uploaded CSV files are parsed locally in the browser. They are not sent to the server, not saved to Neon, do not create Circle payments, do not call Gemini, and do not create dashboard records.
          </p>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-bold">Sample Scenario</h2>
            <p className="text-sm text-gray-600">
              Loads and trucks are fetched from public sample CSV files bundled with the app.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="w-fit rounded border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              download="sample_loads_50.csv"
              href={loadsPath}
            >
              Download sample loads CSV
            </a>
            <a
              className="w-fit rounded border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              download="sample_trucks_5.csv"
              href={trucksPath}
            >
              Download sample trucks CSV
            </a>
            <button
              className="w-fit rounded border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
              disabled={status === "loading"}
              onClick={resetScenario}
              type="button"
            >
              Reset scenario
            </button>
            <button
              className="w-fit rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              disabled={status === "loading"}
              onClick={loadSampleScenario}
              type="button"
            >
              {status === "loading" ? "Loading sample scenario..." : "Load sample scenario"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-2 text-sm font-semibold">
            <span>Upload loads CSV</span>
            <input
              key={`loads-${uploadInputKey}`}
              accept=".csv,text/csv"
              className="block w-full text-sm font-normal text-gray-700 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold"
              onChange={handleLoadsUpload}
              type="file"
            />
            <span className="block font-normal text-gray-600">
              {uploadedLoadsFile ? uploadedLoadsFile.name : "No loads CSV selected"}
            </span>
          </label>
          <label className="space-y-2 text-sm font-semibold">
            <span>Upload trucks CSV</span>
            <input
              key={`trucks-${uploadInputKey}`}
              accept=".csv,text/csv"
              className="block w-full text-sm font-normal text-gray-700 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold"
              onChange={handleTrucksUpload}
              type="file"
            />
            <span className="block font-normal text-gray-600">
              {uploadedTrucksFile ? uploadedTrucksFile.name : "No trucks CSV selected"}
            </span>
          </label>
          <div className="flex items-end">
            <button
              className="w-fit rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              disabled={status === "loading" || !uploadedLoadsFile || !uploadedTrucksFile}
              onClick={loadUploadedScenario}
              type="button"
            >
              Load uploaded CSVs
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {parseSummary && (
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-gray-500">Data source</p>
              <p className="font-bold">{parseSummary.sourceLabel}</p>
            </div>
            <div>
              <p className="text-gray-500">Loads loaded</p>
              <p className="font-bold">{parseSummary.loadsLoaded} of {parseSummary.loadRowsRead}</p>
            </div>
            <div>
              <p className="text-gray-500">Trucks loaded</p>
              <p className="font-bold">{parseSummary.trucksLoaded} of {parseSummary.truckRowsRead}</p>
            </div>
            <div>
              <p className="text-gray-500">Skipped rows</p>
              <p className="font-bold">{parseSummary.loadsSkipped + parseSummary.trucksSkipped}</p>
            </div>
            <div>
              <p className="text-gray-500">Warnings</p>
              <p className="font-bold">{parseSummary.warnings}</p>
            </div>
          </div>
        )}
        {validationWarnings.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-semibold">CSV validation warnings</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {validationWarnings.slice(0, 8).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            {validationWarnings.length > 8 && (
              <p className="mt-2">{validationWarnings.length - 8} additional warnings hidden.</p>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h2 className="font-bold">Next step</h2>
        <p className="mt-2 text-sm leading-6 text-gray-700">
          Next: connect Scenario Lab runs to the existing paid agent workflow, payment records, and dashboard observability.
        </p>
      </section>

      {loads.length > 0 && trucks.length > 0 && (
        <>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-gray-500">Total loads</p>
              <p className="mt-2 text-2xl font-bold">{loads.length}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-gray-500">Total trucks</p>
              <p className="mt-2 text-2xl font-bold">{trucks.length}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-gray-500">Equipment types detected</p>
              <p className="mt-2 text-lg font-bold">{summary.equipmentTypes.join(", ")}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-gray-500">Total available load revenue</p>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-3 rounded-xl border p-4">
              <div>
                <h2 className="font-bold">Loads preview</h2>
                <p className="text-sm text-gray-600">
                  {activeSource === "uploaded" ? "First 10 rows from uploaded loads CSV." : "First 10 rows from sample_loads_50.csv."}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-left text-xs">
                  <thead className="border-b border-gray-200 text-gray-500">
                    <tr>
                      <th className="py-2 pr-3">Load ID</th>
                      <th className="py-2 pr-3">Lane</th>
                      <th className="py-2 pr-3">Pickup</th>
                      <th className="py-2 pr-3">Delivery</th>
                      <th className="py-2 pr-3">Equipment</th>
                      <th className="py-2 pr-3">Commodity</th>
                      <th className="py-2 pr-3">Weight</th>
                      <th className="py-2 pr-3">Miles</th>
                      <th className="py-2 pr-3">Rate</th>
                      <th className="py-2 pr-3">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loads.slice(0, 10).map((load) => (
                      <tr key={load.load_id}>
                        <td className="py-2 pr-3 font-semibold">{load.load_id}</td>
                        <td className="py-2 pr-3">{formatLane(load)}</td>
                        <td className="py-2 pr-3">{load.pickup_date}</td>
                        <td className="py-2 pr-3">{load.delivery_date}</td>
                        <td className="py-2 pr-3">{load.equipment_type}</td>
                        <td className="py-2 pr-3">{load.commodity}</td>
                        <td className="py-2 pr-3">{load.weight_lbs.toLocaleString()} lbs</td>
                        <td className="py-2 pr-3">{formatMiles(load.miles)}</td>
                        <td className="py-2 pr-3">{formatCurrency(load.rate_usd)}</td>
                        <td className="py-2 pr-3">{load.priority}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border p-4">
              <div>
                <h2 className="font-bold">Trucks preview</h2>
                <p className="text-sm text-gray-600">
                  {activeSource === "uploaded" ? "Rows from uploaded trucks CSV." : "All 5 rows from sample_trucks_5.csv."}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-xs">
                  <thead className="border-b border-gray-200 text-gray-500">
                    <tr>
                      <th className="py-2 pr-3">Truck ID</th>
                      <th className="py-2 pr-3">Current location</th>
                      <th className="py-2 pr-3">Available</th>
                      <th className="py-2 pr-3">Equipment</th>
                      <th className="py-2 pr-3">Max weight</th>
                      <th className="py-2 pr-3">Cost per mile</th>
                      <th className="py-2 pr-3">Hours</th>
                      <th className="py-2 pr-3">Home base</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {trucks.map((truck) => (
                      <tr key={truck.truck_id}>
                        <td className="py-2 pr-3 font-semibold">{truck.truck_id}</td>
                        <td className="py-2 pr-3">{truck.current_city}, {truck.current_state}</td>
                        <td className="py-2 pr-3">{truck.available_date}</td>
                        <td className="py-2 pr-3">{truck.equipment_type}</td>
                        <td className="py-2 pr-3">{truck.max_weight_lbs.toLocaleString()} lbs</td>
                        <td className="py-2 pr-3">{formatCurrencyWithCents(truck.cost_per_mile)}</td>
                        <td className="py-2 pr-3">{truck.driver_hours_available}</td>
                        <td className="py-2 pr-3">{truck.home_base}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="font-bold">Scenario Matching</h2>
              <p className="text-sm text-gray-600">
                Local matching checks equipment, weight, empty miles, estimated cost, profit, priority, and score.
              </p>
              <p className="text-sm text-gray-600">
                Local simulation - no Circle payment, Gemini call, Neon persistence, or dashboard record is created in this MVP.
              </p>
            </div>
            <button
              className="w-fit rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              disabled={status === "matching"}
              onClick={runScenarioMatching}
              type="button"
            >
              {status === "matching" ? "Running scenario matching..." : "Run Scenario Matching"}
            </button>
          </section>
        </>
      )}

      {recommendationGroups.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h2 className="font-bold">Matching Results</h2>
              <p className="text-sm text-gray-600">
                Recommendations are grouped by truck and limited to 0-3 positive-profit matches per truck.
              </p>
            </div>
            <button
              className="w-fit rounded border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
              disabled={flatRecommendations.length === 0}
              onClick={exportMatchingResults}
              type="button"
            >
              Export matching results as CSV
            </button>
          </div>

          <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-800">
            These recommendations are generated by local matching logic in the browser. They are not yet persisted to Neon, do not call Gemini, and do not appear in the Agent Economics Dashboard.
          </p>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-gray-500">Matched trucks</p>
              <p className="mt-2 text-2xl font-bold">{matchingMetrics.matchedTrucks}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-gray-500">Total recommendations</p>
              <p className="mt-2 text-2xl font-bold">{matchingMetrics.totalRecommendations}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-gray-500">Average score</p>
              <p className="mt-2 text-2xl font-bold">{matchingMetrics.averageScore}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-gray-500">Potential matched revenue</p>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(matchingMetrics.potentialMatchedRevenue)}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm text-gray-500">Average empty miles</p>
              <p className="mt-2 text-2xl font-bold">{formatMiles(matchingMetrics.averageEmptyMiles)}</p>
            </div>
          </section>

          {recommendationGroups.map((group) => (
            <div className="space-y-4 rounded-xl border p-4" key={group.truck.truck_id}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div>
                  <p className="text-sm text-gray-500">Truck ID</p>
                  <p className="font-bold">{group.truck.truck_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current city/state</p>
                  <p className="font-bold">{group.truck.current_city}, {group.truck.current_state}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Equipment type</p>
                  <p className="font-bold">{group.truck.equipment_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Recommendations found</p>
                  <p className="font-bold">{group.recommendations.length}</p>
                </div>
              </div>

              {group.recommendations.length === 0 ? (
                <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                  No positive-profit recommendations scored 60 or higher for this truck.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                  {group.recommendations.map((recommendation) => (
                    <article className="space-y-3 rounded-lg border border-gray-200 p-4" key={`${group.truck.truck_id}-${recommendation.load.load_id}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-gray-500">Load ID</p>
                          <h3 className="text-lg font-bold">{recommendation.load.load_id}</h3>
                        </div>
                        <span className="rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                          Score {recommendation.score}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm">
                        <p className="font-semibold">
                          {recommendation.load.origin_city}, {recommendation.load.origin_state} -&gt; {recommendation.load.destination_city}, {recommendation.load.destination_state}
                        </p>
                        <p className="text-gray-600">{recommendation.load.commodity} for {recommendation.load.shipper_name}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                        <p>Rate: <span className="font-semibold">{formatCurrency(recommendation.load.rate_usd)}</span></p>
                        <p>Loaded miles: <span className="font-semibold">{formatMiles(recommendation.load.miles)}</span></p>
                        <p>Empty miles: <span className="font-semibold">{formatMiles(recommendation.emptyMiles)}</span></p>
                        <p>Estimated cost: <span className="font-semibold">{formatCurrency(recommendation.estimatedCost)}</span></p>
                        <p>Estimated profit: <span className="font-semibold">{formatCurrency(recommendation.estimatedProfit)}</span></p>
                        <p>Priority: <span className="font-semibold">{recommendation.load.priority}</span></p>
                      </div>

                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                        <p className="font-semibold">Dispatcher note</p>
                        <p className="mt-1 text-gray-700">{dispatcherNote(recommendation)}</p>
                      </div>

                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                        <p className="font-semibold">Why this match?</p>
                        <p className="mt-1 text-gray-700">{whyThisMatch(group.truck, recommendation)}</p>
                      </div>

                      <div className="space-y-2 text-sm">
                        <p className="font-semibold">Why recommended</p>
                        <ul className="list-disc space-y-1 pl-5 text-gray-700">
                          {recommendation.whyRecommended.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2 text-sm">
                        <p className="font-semibold">Risk notes</p>
                        <ul className="list-disc space-y-1 pl-5 text-gray-700">
                          {recommendation.riskNotes.map((note) => (
                            <li key={note}>{note}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2 border-t border-gray-200 pt-3">
                        <button
                          className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                          disabled
                          type="button"
                        >
                          Contact shipper
                        </button>
                        <p className="text-xs leading-5 text-gray-500">
                          Simulated action - real shipper contact is not enabled in this MVP.
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
