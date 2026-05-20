export function calculateProfit(distanceKm: number) {
  const freightRevenue = 500;
  const fuelCost = distanceKm * 0.35;
  const driverCost = distanceKm * 0.12;

  const profit = freightRevenue - fuelCost - driverCost;

  return {
    revenue: freightRevenue,
    fuelCost: Number(fuelCost.toFixed(2)),
    driverCost: Number(driverCost.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    decision: profit > 100 ? "BOOK" : "SKIP",
  };
}
