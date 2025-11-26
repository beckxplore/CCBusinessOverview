import type { ProductCost, ProductProfitability, OperationalCost } from '../types';

/**
 * Calculate detailed profitability for a product
 */
export function calculateProfitability(
  product: ProductCost,
  weeklyVolume: number,
  localShopPrice: number,
  options?: {
    sglVolume?: number;
    regularVolume?: number;
    groupType?: 'sgl' | 'regular' | 'mixed';
    includeOperationalCost?: boolean;
  }
): ProductProfitability {
  const groupType = options?.groupType ?? 'sgl';
  const sglVolume = options?.sglVolume ?? (groupType === 'regular' ? 0 : weeklyVolume);
  const regularVolume = options?.regularVolume ?? (groupType === 'regular' ? weeklyVolume : 0);
  const totalVolume = weeklyVolume;
  const includeOperationalCost =
    options?.includeOperationalCost === undefined ? true : options.includeOperationalCost;

  let commissionPerKg: number;
  if (totalVolume > 0) {
    const weightedCommission =
      product.sgl_commission * Math.max(sglVolume, 0) +
      product.regular_commission * Math.max(regularVolume, 0);
    commissionPerKg = weightedCommission / totalVolume;
  } else {
    commissionPerKg = groupType === 'regular' ? product.regular_commission : product.sgl_commission;
  }

  const operationsCost = includeOperationalCost ? product.operational_cost : 0;
  const totalCost = product.procurement_cost + operationsCost + commissionPerKg;
  const marginPerKg = product.selling_price - totalCost;
  const marginPct = totalCost > 0 ? (marginPerKg / totalCost) * 100 : 0;
  const discountPct = localShopPrice > 0 
    ? ((product.selling_price - localShopPrice) / localShopPrice) * 100 
    : 0;

  return {
    product: product.product_name,
    procurement: product.procurement_cost,
    operations: product.operational_cost,
    commission: commissionPerKg,
    total_cost: totalCost,
    selling_price: product.selling_price,
    margin_per_kg: marginPerKg,
    margin_pct: marginPct,
    local_shop_price: localShopPrice,
    discount_pct: discountPct,
    weekly_volume_kg: totalVolume,
    weekly_revenue: product.selling_price * totalVolume,
    weekly_profit: marginPerKg * totalVolume
  };
}

/**
 * Calculate operational cost breakdown
 */
export function getOperationalBreakdown(operationalCosts: OperationalCost[]): {
  logistics: number;
  packaging: number;
  warehouse: number;
  other: number;
  total: number;
} {
  const logistics = operationalCosts
    .filter(c => ['Car Rental', 'Refuel', 'Driver Incentive', 'Assistant Payment', 'Traffic Penalty'].includes(c.cost_category))
    .reduce((sum, c) => sum + c.cost_per_kg, 0);

  const packaging = operationalCosts
    .filter(c => ['PP Bags', 'Stickers'].includes(c.cost_category))
    .reduce((sum, c) => sum + c.cost_per_kg, 0);

  const warehouse = operationalCosts
    .filter(c => ['Warehouse Utilities', 'Warehouse Rent', 'Warehouse Personnel', 'Warehouse OT', 'Loading/Unloading', 'Daily Labour'].includes(c.cost_category))
    .reduce((sum, c) => sum + c.cost_per_kg, 0);

  const other = operationalCosts
    .filter(c => ['Petty Cash', 'Packages'].includes(c.cost_category))
    .reduce((sum, c) => sum + c.cost_per_kg, 0);

  const total = operationalCosts.reduce((sum, c) => sum + c.cost_per_kg, 0);

  return { logistics, packaging, warehouse, other, total };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, decimals: number = 2): string {
  if (!Number.isFinite(amount)) {
    return '—';
  }

  const absAmount = Math.abs(amount);
  let value = amount;
  let suffix = '';

  if (absAmount >= 1_000_000) {
    value = amount / 1_000_000;
    suffix = 'M';
  } else if (absAmount >= 1_000) {
    value = amount / 1_000;
    suffix = 'K';
  }

  return `${value.toFixed(decimals)}${suffix}`;
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * Get color for profit/loss
 */
export function getProfitColor(value: number): string {
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-600';
}

/**
 * Get background color for profit/loss
 */
export function getProfitBgColor(value: number): string {
  if (value > 0) return 'bg-green-50';
  if (value < 0) return 'bg-red-50';
  return 'bg-gray-50';
}

