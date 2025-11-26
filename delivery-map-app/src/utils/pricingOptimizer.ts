import type { ProductCost } from '../types';

export interface CompetitivePricingResult {
  product: string;
  current_price: number;
  local_shop_price: number;
  current_discount_pct: number;
  break_even_price: number;
  recommended_price: number;
  recommended_discount_pct: number;
  expected_volume_change_pct: number;
  expected_volume_change_kg: number;
  expected_volume_after_kg: number;
  expected_profit_per_kg: number;
  is_profitable: boolean;
}

export interface DemandAwarePricingResult {
  product: string;
  current_price: number;
  current_volume: number;
  current_profit: number;
  optimal_price: number;
  optimal_volume: number;
  optimal_profit: number;
  profit_improvement: number;
  profit_improvement_pct: number;
  price_points: Array<{ price: number; volume: number; profit: number }>;
}

/**
 * Calculate competitive pricing recommendation
 */
export function calculateCompetitivePricing(
  product: ProductCost,
  localShopPrice: number,
  elasticity: number = -1.5,
  currentVolume: number = 1000
): CompetitivePricingResult {
  const totalCost = product.procurement_cost + product.operational_cost + product.sgl_commission;
  const breakEvenPrice = totalCost;
  const currentDiscountPct = localShopPrice > 0 
    ? ((product.selling_price - localShopPrice) / localShopPrice) * 100 
    : 0;

  // Strategy: Be profitable while staying competitive
  // At least 5% margin, at most 15% discount from local shops
  const minPriceForMargin = breakEvenPrice * 1.05; // 5% margin minimum
  const maxPriceForCompetitiveness = localShopPrice * 0.85; // 15% discount max

  const recommendedPrice = Math.max(minPriceForMargin, Math.min(maxPriceForCompetitiveness, localShopPrice * 0.90));
  
  const recommendedDiscountPct = localShopPrice > 0 
    ? ((recommendedPrice - localShopPrice) / localShopPrice) * 100 
    : 0;

  // Calculate expected volume change using elasticity
  const priceChangePct = product.selling_price > 0 
    ? ((recommendedPrice - product.selling_price) / product.selling_price) 
    : 0;
  const expectedVolumeChangePct = elasticity * priceChangePct * 100;
  const expectedVolumeChangeMultiplier = 1 + (expectedVolumeChangePct / 100);
  const expectedVolumeAfter = Math.max(0, currentVolume * expectedVolumeChangeMultiplier);
  const expectedVolumeChangeKg = expectedVolumeAfter - currentVolume;

  const expectedProfitPerKg = recommendedPrice - totalCost;
  const isProfitable = expectedProfitPerKg > 0;

  return {
    product: product.product_name,
    current_price: product.selling_price,
    local_shop_price: localShopPrice,
    current_discount_pct: currentDiscountPct,
    break_even_price: breakEvenPrice,
    recommended_price: Number(recommendedPrice.toFixed(2)),
    recommended_discount_pct: recommendedDiscountPct,
    expected_volume_change_pct: expectedVolumeChangePct,
    expected_volume_change_kg: Number(expectedVolumeChangeKg.toFixed(2)),
    expected_volume_after_kg: Number(expectedVolumeAfter.toFixed(2)),
    expected_profit_per_kg: expectedProfitPerKg,
    is_profitable: isProfitable
  };
}

/**
 * Calculate demand-aware pricing (profit maximization)
 */
export function calculateDemandAwarePricing(
  product: ProductCost,
  localShopPrice: number,
  elasticity: number,
  currentVolume: number
): DemandAwarePricingResult {
  const totalCost = product.procurement_cost + product.operational_cost + product.sgl_commission;
  const breakEvenPrice = totalCost;
  
  // Current state
  const currentProfit = (product.selling_price - totalCost) * currentVolume;

  // Test prices from break-even to local shop price
  const pricePoints: Array<{ price: number; volume: number; profit: number }> = [];
  const priceStep = 1; // Test every 1 ETB increment
  const minTestPrice = Math.max(breakEvenPrice * 0.95, 1); // Don't go below 95% of break-even
  const maxTestPrice = Math.min(localShopPrice * 1.1, localShopPrice + 20); // Don't go too far above local

  let optimalPrice = product.selling_price;
  let optimalProfit = currentProfit;
  let optimalVolume = currentVolume;

  for (let testPrice = minTestPrice; testPrice <= maxTestPrice; testPrice += priceStep) {
    // Calculate volume at this price using elasticity
    const priceChangePct = product.selling_price > 0 
      ? (testPrice - product.selling_price) / product.selling_price 
      : 0;
    const volumeMultiplier = 1 + (elasticity * priceChangePct);
    const expectedVolume = Math.max(0, currentVolume * volumeMultiplier);

    // Calculate profit
    const marginPerKg = testPrice - totalCost;
    const profit = marginPerKg * expectedVolume;

    pricePoints.push({
      price: Number(testPrice.toFixed(2)),
      volume: Number(expectedVolume.toFixed(0)),
      profit: Number(profit.toFixed(2))
    });

    // Track optimal
    if (profit > optimalProfit) {
      optimalProfit = profit;
      optimalPrice = testPrice;
      optimalVolume = expectedVolume;
    }
  }

  return {
    product: product.product_name,
    current_price: product.selling_price,
    current_volume: currentVolume,
    current_profit: currentProfit,
    optimal_price: Number(optimalPrice.toFixed(2)),
    optimal_volume: Number(optimalVolume.toFixed(0)),
    optimal_profit: Number(optimalProfit.toFixed(2)),
    profit_improvement: Number((optimalProfit - currentProfit).toFixed(2)),
    profit_improvement_pct: currentProfit !== 0 
      ? Number((((optimalProfit - currentProfit) / Math.abs(currentProfit)) * 100).toFixed(1))
      : 0,
    price_points: pricePoints
  };
}

/**
 * Calculate break-even analysis for a product
 */
export function calculateBreakEven(product: ProductCost): {
  break_even_price: number;
  break_even_volume: number;
  current_margin_per_kg: number;
  units_to_profitability: number;
} {
  const totalCost = product.procurement_cost + product.operational_cost + product.sgl_commission;
  const currentMarginPerKg = product.selling_price - totalCost;
  
  // Fixed costs assumed 0 for per-kg business
  const breakEvenVolume = 0; // Since all costs are variable
  
  return {
    break_even_price: totalCost,
    break_even_volume: breakEvenVolume,
    current_margin_per_kg: currentMarginPerKg,
    units_to_profitability: currentMarginPerKg < 0 
      ? Infinity 
      : 0
  };
}

