import { ApiClient } from './apiClient';
import type {
  ProductCost,
  OperationalCost,
  SGLTier,
  ProductMetric,
  LocalShopPriceEntry,
  ProductProfitability,
  ProfitabilityFilters,
  ScenarioParams
} from '../types';
import { calculateProfitability } from './profitabilityCalc';

type VolumeMap = Record<string, number>;
type PriceMap = Record<string, number>;

class DataStoreClass {
  private productCosts: ProductCost[] = [];
  private operationalCosts: OperationalCost[] = [];
  private sglTiers: SGLTier[] = [];
  private productMetrics: ProductMetric[] = [];
  private localShopPrices: LocalShopPriceEntry[] = [];
  private weeklyTotalVolumeMap: VolumeMap = {};
  private weeklySglVolumeMap: VolumeMap = {};
  private weeklyRegularVolumeMap: VolumeMap = {};
  private localShopPriceMap: PriceMap = {};
  private metricsLookbackDays = 30;
  private metricsWindow: { start: string; end: string } | null = null;

  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  async loadAll(force = false): Promise<void> {
    if (force) {
      this.loaded = false;
    }

    if (this.loaded) {
      return;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      try {
        const [costsRes, operationalRes, tiersRes, metricsRes, localPricesRes] = await Promise.all([
          ApiClient.getProductCosts(),
          ApiClient.getOperationalCosts(),
          ApiClient.getSGLTiers(),
          ApiClient.getProductMetrics(),
          ApiClient.getLocalShopPrices()
        ]);

        this.productCosts = costsRes.products ?? [];
        this.operationalCosts = operationalRes.costs ?? [];
        this.sglTiers = tiersRes.tiers ?? [];
        this.productMetrics = metricsRes.metrics ?? [];
        this.metricsLookbackDays = metricsRes.lookback_days ?? 30;
        this.metricsWindow = metricsRes.window ?? null;
        this.localShopPrices = localPricesRes.prices ?? [];

        const { total, sgl, regular } = this.buildWeeklyVolumeMaps();
        this.weeklyTotalVolumeMap = total;
        this.weeklySglVolumeMap = sgl;
        this.weeklyRegularVolumeMap = regular;
        this.localShopPriceMap = this.buildLocalPriceMap();

        this.loaded = true;
      } finally {
        this.loadingPromise = null;
      }
    })();

    await this.loadingPromise;
  }

  async reload(): Promise<void> {
    this.loaded = false;
    this.loadingPromise = null;
    return this.loadAll(true);
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getProductCosts(): ProductCost[] {
    return this.productCosts;
  }

  getOperationalCosts(): OperationalCost[] {
    return this.operationalCosts;
  }

  getSGLTiers(): SGLTier[] {
    return this.sglTiers;
  }

  getProductMetrics(): ProductMetric[] {
    return this.productMetrics;
  }

  getMetricsLookbackDays(): number {
    return this.metricsLookbackDays;
  }

  getMetricsWindow(): { start: string; end: string } | null {
    return this.metricsWindow;
  }

  getWeeklyVolumeMap(): VolumeMap {
    return this.weeklyTotalVolumeMap;
  }

  getWeeklySGLVolumeMap(): VolumeMap {
    return this.weeklySglVolumeMap;
  }

  getWeeklyRegularVolumeMap(): VolumeMap {
    return this.weeklyRegularVolumeMap;
  }

  getLocalShopPriceMap(): PriceMap {
    return this.localShopPriceMap;
  }

  getLocalShopPrices(): LocalShopPriceEntry[] {
    return this.localShopPrices;
  }

  getTotalOperationalCost(): number {
    return this.operationalCosts.reduce((sum, cost) => sum + cost.cost_per_kg, 0);
  }

  getOperationalCostsByCategory(): Record<string, number> {
    return this.operationalCosts.reduce<Record<string, number>>((acc, cost) => {
      acc[cost.cost_category] = cost.cost_per_kg;
      return acc;
    }, {});
  }

  calculateTierNetCost(tier: SGLTier): number {
    const totalSavings = tier.cost_savings_logistics + tier.cost_savings_packaging + tier.cost_savings_assistant;
    return tier.commission_etb_per_kg - totalSavings;
  }

  getProductCost(productName: string): ProductCost | undefined {
    return this.productCosts.find(p => p.product_name === productName);
  }

  getProductProfitability(
    volumeData: VolumeMap = this.weeklyTotalVolumeMap,
    localShopPrices: PriceMap = this.localShopPriceMap,
    filters?: ProfitabilityFilters,
    includeOperationalCost: boolean = true
  ): ProductProfitability[] {
    const results = this.productCosts
      .map(product => {
        const productName = product.product_name;
        const totalVolume = volumeData[productName] ?? 0;
        const sglVolume = this.weeklySglVolumeMap[productName] ?? 0;
        const regularVolume =
          this.weeklyRegularVolumeMap[productName] ??
          Math.max(totalVolume - sglVolume, 0);
        const localPrice =
          localShopPrices[productName] ?? product.selling_price * 1.5;

        const groupType = filters?.groupType ?? 'all';

        if (groupType === 'regular') {
          if (regularVolume <= 0) {
            return null;
          }
          return calculateProfitability(product, regularVolume, localPrice, {
            sglVolume: 0,
            regularVolume,
            groupType: 'regular',
            includeOperationalCost,
          });
        }

        if (groupType === 'sgl') {
          if (sglVolume <= 0) {
            return null;
          }
          return calculateProfitability(product, sglVolume, localPrice, {
            sglVolume,
            regularVolume: 0,
            groupType: 'sgl',
            includeOperationalCost,
          });
        }

        // Mixed view (default)
        return calculateProfitability(product, totalVolume, localPrice, {
          sglVolume,
          regularVolume,
          groupType: 'mixed',
          includeOperationalCost,
        });
      })
      .filter((p): p is ProductProfitability => p !== null);

    if (filters?.sortBy) {
      const multiplier = filters.sortOrder === 'desc' ? -1 : 1;
      return [...results].sort((a, b) => {
        const aVal = a[filters.sortBy!];
        const bVal = b[filters.sortBy!];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * multiplier;
        }
        return 0;
      });
    }

    return results;
  }

  simulateScenario(
    currentVolumeData: VolumeMap,
    localShopPrices: PriceMap,
    elasticities: Record<string, number>,
    scenario: ScenarioParams
  ) {
    const currentProfitability = this.getProductProfitability(currentVolumeData, localShopPrices);
    const currentTotals = {
      total_revenue: currentProfitability.reduce((sum, p) => sum + p.weekly_revenue, 0),
      total_cost: currentProfitability.reduce((sum, p) => sum + p.total_cost * p.weekly_volume_kg, 0),
      total_profit: currentProfitability.reduce((sum, p) => sum + p.weekly_profit, 0),
      products: currentProfitability
    };

    const scenarioCosts = this.productCosts.map(product => {
      const clone: ProductCost = { ...product };

      if (scenario.priceChanges && scenario.priceChanges[product.product_name] !== undefined) {
        clone.selling_price = scenario.priceChanges[product.product_name]!;
      }

      if (scenario.commissionChanges && scenario.commissionChanges[product.product_name] !== undefined) {
        clone.sgl_commission = scenario.commissionChanges[product.product_name]!;
      }

      if (scenario.procurementChanges && scenario.procurementChanges[product.product_name] !== undefined) {
        clone.procurement_cost = Math.max(0, scenario.procurementChanges[product.product_name]!);
      }

      if (scenario.tierChanges && scenario.tierChanges[product.product_name]) {
        const tier = this.getSGLTiers().find(t => t.tier_name === scenario.tierChanges![product.product_name]);
        if (tier) {
          clone.sgl_commission = tier.commission_etb_per_kg;
          const savings = tier.cost_savings_logistics + tier.cost_savings_packaging + tier.cost_savings_assistant;
          clone.operational_cost = Math.max(0, clone.operational_cost - savings);
        }
      }

      if (scenario.operationalCostMultipliers) {
        const multipliers = scenario.operationalCostMultipliers;
        let adjustedOps = clone.operational_cost;

        if (multipliers.logistics !== undefined) {
          adjustedOps *= multipliers.logistics;
        }
        if (multipliers.packaging !== undefined) {
          adjustedOps *= multipliers.packaging;
        }
        if (multipliers.warehouse !== undefined) {
          adjustedOps *= multipliers.warehouse;
        }

        clone.operational_cost = Math.max(0, adjustedOps);
      }

      return clone;
    });

    const scenarioVolumes: VolumeMap = {};
    scenarioCosts.forEach(cost => {
      const baseVolume = currentVolumeData[cost.product_name] ?? 0;
      if (scenario.priceChanges && scenario.priceChanges[cost.product_name] !== undefined) {
        const original = this.productCosts.find(p => p.product_name === cost.product_name);
        if (!original || original.selling_price === 0) {
          scenarioVolumes[cost.product_name] = baseVolume;
          return;
        }
        const priceChange = cost.selling_price - original.selling_price;
        const priceChangePct = priceChange / original.selling_price;
        const elasticity = elasticities[cost.product_name] ?? -1.5;
        const multiplier = 1 + elasticity * priceChangePct;
        scenarioVolumes[cost.product_name] = Math.max(0, baseVolume * multiplier);
      } else {
        scenarioVolumes[cost.product_name] = baseVolume;
      }

      if (scenario.volumeOverrides && scenario.volumeOverrides[cost.product_name] !== undefined) {
        const override = scenario.volumeOverrides[cost.product_name]!;
        scenarioVolumes[cost.product_name] = Math.max(0, override);
      }
    });

    const scenarioProfitability = scenarioCosts.map(cost => {
      const productName = cost.product_name;
      const volume = scenarioVolumes[productName] ?? 0;
      const localPrice =
        localShopPrices[productName] ?? cost.selling_price * 1.5;

      const baseTotal = this.weeklyTotalVolumeMap[productName] ?? 0;
      const baseSgl = this.weeklySglVolumeMap[productName] ?? 0;
      const sglShare =
        baseTotal > 0 ? Math.min(Math.max(baseSgl / baseTotal, 0), 1) : 0;
      const scenarioSglVolume = volume * sglShare;
      const scenarioRegularVolume = volume - scenarioSglVolume;

      let groupType: 'sgl' | 'regular' | 'mixed' = 'mixed';
      if (scenarioSglVolume <= 0 && scenarioRegularVolume > 0) {
        groupType = 'regular';
      } else if (scenarioRegularVolume <= 0 && scenarioSglVolume > 0) {
        groupType = 'sgl';
      }

      return calculateProfitability(cost, volume, localPrice, {
        sglVolume: scenarioSglVolume,
        regularVolume: scenarioRegularVolume,
        groupType
      });
    });

    const scenarioTotals = {
      total_revenue: scenarioProfitability.reduce((sum, p) => sum + p.weekly_revenue, 0),
      total_cost: scenarioProfitability.reduce((sum, p) => sum + p.total_cost * p.weekly_volume_kg, 0),
      total_profit: scenarioProfitability.reduce((sum, p) => sum + p.weekly_profit, 0),
      products: scenarioProfitability
    };

    return {
      current: currentTotals,
      scenario: scenarioTotals,
      delta: {
        revenue_change: scenarioTotals.total_revenue - currentTotals.total_revenue,
        cost_change: scenarioTotals.total_cost - currentTotals.total_cost,
        profit_change: scenarioTotals.total_profit - currentTotals.total_profit,
        profit_change_pct:
          currentTotals.total_profit !== 0
            ? ((scenarioTotals.total_profit - currentTotals.total_profit) / Math.abs(currentTotals.total_profit)) * 100
            : 0
      }
    };
  }

  private buildWeeklyVolumeMaps(): { total: VolumeMap; sgl: VolumeMap; regular: VolumeMap } {
    if (!this.productMetrics.length || this.metricsLookbackDays <= 0) {
      return { total: {}, sgl: {}, regular: {} };
    }

    const weeks = this.metricsLookbackDays / 7;
    const divisor = weeks > 0 ? weeks : 1;

    const total: VolumeMap = {};
    const sgl: VolumeMap = {};
    const regular: VolumeMap = {};

    this.productMetrics.forEach(metric => {
      const name = metric.product_name;
      const totalVolume = metric.total_volume_kg ?? 0;
      const sglVolume = metric.sgl_volume_kg ?? 0;
      const remainderVolume = totalVolume - sglVolume;
      let normalVolume = metric.normal_volume_kg ?? remainderVolume;
      if (remainderVolume > 0 && (!metric.normal_volume_kg || Math.abs(normalVolume - remainderVolume) > 1e-6)) {
        normalVolume = remainderVolume;
      }
      if (normalVolume < 0) {
        normalVolume = 0;
      }

      total[name] = totalVolume / divisor;
      sgl[name] = sglVolume / divisor;
      regular[name] = normalVolume / divisor;
    });

    return { total, sgl, regular };
  }

  private buildLocalPriceMap(): PriceMap {
    const map: PriceMap = {};
    this.localShopPrices.forEach(entry => {
      if (entry.price > 0) {
        map[entry.product_name] = entry.price;
      }
    });
    return map;
  }
}

export const DataStore = new DataStoreClass();


