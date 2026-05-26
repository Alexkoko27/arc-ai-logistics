export function calculateProfit(distanceMiles: number) {
  const freightRevenue = 500;
  const fuelCost = distanceMiles * 0.58;
  const driverCost = distanceMiles * 0.7;

  const profit = freightRevenue - fuelCost - driverCost;

  return {
    revenue: freightRevenue,
    fuelCost: Number(fuelCost.toFixed(2)),
    driverCost: Number(driverCost.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    decision: profit > 100 ? "BOOK" : "SKIP",
  };
}
