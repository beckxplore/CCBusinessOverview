import React, { useMemo, useState, useEffect } from 'react';
import type { ScenarioParams, ProductCost, SGLTier } from '../../types';
import { InfoTooltip } from '../Common/InfoTooltip';
import { associationRules } from '../../data/associationRules';

const RULE_CATEGORY_LABEL: Record<typeof associationRules[number]['category'], string> = {
  core: 'High-Frequency',
  lift: 'High Lift',
  balanced: 'Balanced'
};

interface PickupOptimizationSummary {
  logisticsMultiplier: number;
  adjustedLogisticsCost: number;
  savingsPerKg: number;
  matchedVolumeKg: number;
  totalNormalVolumeKg: number;
  coveragePct: number;
}

interface ScenarioControlsProps {
  products: ProductCost[];
  tiers: SGLTier[];
  scenario: ScenarioParams;
  onScenarioChange: (_scenario: ScenarioParams) => void;
  onLoadPreset: (_preset: string) => void;
  volumeData: Record<string, number>;
  pickupOptimization?: PickupOptimizationSummary | null;
}

export const ScenarioControls: React.FC<ScenarioControlsProps> = ({
  products,
  tiers,
  scenario,
  onScenarioChange,
  onLoadPreset,
  volumeData,
  pickupOptimization
}) => {
  const [activeProduct, setActiveProduct] = useState<string | null>(null);
  const [latestCosts, setLatestCosts] = useState<{
    warehouse: number;
    fulfilment: number;
    lastMile: number;
  } | null>(null);
  
  // Default values (will be updated from API)
  // Logistics = Last mile + fulfilment combined
  const baseLogisticsCost = latestCosts 
    ? (latestCosts.lastMile + latestCosts.fulfilment) 
    : 6.41;
  const basePackagingCost = 2.86;
  const baseWarehouseCost = latestCosts?.warehouse ?? 3.46;
  
  // Fetch latest operational costs on mount
  useEffect(() => {
    const fetchLatestCosts = async () => {
      try {
        const { ApiClient } = await import('../../utils/apiClient');
        const costs = await ApiClient.getLatestOperationalCosts();
        setLatestCosts({
          warehouse: costs.warehouse_cost_per_kg,
          fulfilment: costs.fulfilment_cost_per_kg,
          lastMile: costs.last_mile_cost_per_kg
        });
      } catch (error) {
        console.error('Failed to fetch latest operational costs:', error);
        // Keep defaults
      }
    };
    fetchLatestCosts();
  }, []);

  const getMultiplier = (type: 'logistics' | 'packaging' | 'warehouse') =>
    scenario.operationalCostMultipliers?.[type] ?? 1;

  const describeChange = (baseCost: number, multiplier: number) => {
    const deltaPct = (1 - multiplier) * 100;
    const direction = deltaPct >= 0 ? `-${deltaPct.toFixed(0)}%` : `+${Math.abs(deltaPct).toFixed(0)}%`;
    return `${(baseCost * multiplier).toFixed(2)} ETB (${direction})`;
  };

  const ruleLookup = useMemo(() => {
    const map: Record<string, typeof associationRules> = {};
    associationRules.forEach(rule => {
      rule.antecedents.forEach(item => {
        map[item] = map[item] ?? [];
        map[item]!.push(rule);
      });
    });
    Object.keys(map).forEach(key => {
      map[key] = [...map[key]!
        .sort((a, b) => (b.lift * b.confidence) - (a.lift * a.confidence))
        .slice(0, 3)
      ];
    });
    return map;
  }, []);

  const updatePrice = (product: string, price: number) => {
    onScenarioChange({
      ...scenario,
      priceChanges: { ...scenario.priceChanges, [product]: price }
    });
  };

  const updateCommission = (product: string, commission: number) => {
    onScenarioChange({
      ...scenario,
      commissionChanges: { ...scenario.commissionChanges, [product]: commission }
    });
  };

  const updateProcurement = (product: string, procurement: number) => {
    onScenarioChange({
      ...scenario,
      procurementChanges: { ...scenario.procurementChanges, [product]: procurement }
    });
  };

  const updateTier = (product: string, tier: string) => {
    onScenarioChange({
      ...scenario,
      tierChanges: { ...scenario.tierChanges, [product]: tier }
    });
  };

  const updateVolume = (product: string, volume: number | null) => {
    const overrides = { ...(scenario.volumeOverrides || {}) };
    if (volume === null) {
      delete overrides[product];
    } else {
      overrides[product] = volume;
    }

    const hasOverrides = Object.keys(overrides).length > 0;

    onScenarioChange({
      ...scenario,
      volumeOverrides: hasOverrides ? overrides : undefined
    });
  };

  const updateOperationalMultiplier = (category: 'logistics' | 'packaging' | 'warehouse', value: number) => {
    onScenarioChange({
      ...scenario,
      operationalCostMultipliers: {
        ...scenario.operationalCostMultipliers,
        [category]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Preset Scenarios */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-4 flex items-center">
          Quick Presets
          <InfoTooltip 
            content="Pre-configured scenarios for common business strategies. Click any preset to instantly apply changes and see the impact on your profitability."
          />
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onLoadPreset('optimize-potato')}
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-left hover:bg-red-100 transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold text-red-900 text-sm">Fix Potato Crisis</p>
                <p className="text-xs text-red-700 mt-1">Cut commission, raise price</p>
              </div>
              <InfoTooltip 
                content="Reduces Potato commission from 2 to 1.5 ETB/kg and increases price to 35 ETB to turn the -112K loss into a smaller loss or profit."
                placement="left"
                size="sm"
              />
            </div>
          </button>
          <button
            onClick={() => onLoadPreset('sgl-pickup')}
            className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold text-blue-900 text-sm">SGL Pickup Model</p>
                <p className="text-xs text-blue-700 mt-1">Apply Tier 2 to all</p>
              </div>
              <InfoTooltip 
                content="Applies Tier 2 (Pickup) to all products. SGLs pick up from hub, saving 8.41 ETB/kg in logistics/packaging costs. Expected profit swing: +355K ETB/week!"
                placement="left"
                size="sm"
              />
            </div>
          </button>
          <button
            onClick={() => pickupOptimization && onLoadPreset('sgl-hub-pickup')}
            disabled={!pickupOptimization}
            className={`p-3 rounded-lg text-left transition ${
              pickupOptimization
                ? 'bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold text-emerald-900 text-sm">SGL Hub Pickup</p>
                <p className="text-xs text-emerald-700 mt-1">
                  0.5 km clustering for normal leaders
                </p>
              </div>
              <InfoTooltip
                content={
                  pickupOptimization
                    ? `Reassigns ${(pickupOptimization.coveragePct * 100).toFixed(
                        1
                      )}% of normal leader volume to nearby SGL hubs (≤0.5 km). Logistics drops to ${pickupOptimization.adjustedLogisticsCost.toFixed(
                        2
                      )} ETB/kg (save ${pickupOptimization.savingsPerKg.toFixed(
                        2
                      )} ETB/kg).`
                    : 'Calculating hub coverage...'
                }
                placement="left"
                size="sm"
              />
            </div>
          </button>
          <button
            onClick={() => onLoadPreset('cost-cutting')}
            className="p-3 bg-green-50 border border-green-200 rounded-lg text-left hover:bg-green-100 transition"
          >
            <p className="font-semibold text-green-900 text-sm">Aggressive Cost Cut</p>
            <p className="text-xs text-green-700 mt-1">Reduce ops costs 30%</p>
          </button>
          <button
            onClick={() => onLoadPreset('premium')}
            className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-left hover:bg-purple-100 transition"
          >
            <p className="font-semibold text-purple-900 text-sm">Premium Positioning</p>
            <p className="text-xs text-purple-700 mt-1">Raise prices 15%</p>
          </button>
        </div>
      </div>

      {/* Operational Cost Adjustments */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-4 flex items-center">
          Operational Cost Optimization
          <InfoTooltip 
            content="Simulate cost reduction initiatives. Adjust sliders to see impact of improved logistics efficiency, bulk packaging discounts, or warehouse optimization."
          />
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              Logistics (Current: {baseLogisticsCost.toFixed(2)} ETB/kg)
              <InfoTooltip 
                content="Includes car rental (3.40 ETB), fuel (3.01 ETB). Reduce by negotiating better rental rates, optimizing routes, or using SGLs for pickup (Tier 2/3 eliminates this cost entirely)."
                placement="right"
              />
            </label>
            <input
              type="range"
              min="0.2"
              max="1.5"
              step="0.01"
              value={getMultiplier('logistics')}
              onChange={(e) => updateOperationalMultiplier('logistics', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>{(baseLogisticsCost * 0.2).toFixed(2)} ETB (-80%)</span>
              <span className="font-medium">
                {describeChange(baseLogisticsCost, getMultiplier('logistics'))}
              </span>
              <span>{(baseLogisticsCost * 1.5).toFixed(2)} ETB (+50%)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              Packaging (Current: {basePackagingCost.toFixed(2)} ETB/kg)
              <InfoTooltip 
                content="Includes PP bags (2.53 ETB), stickers (0.33 ETB). Reduce by bulk purchasing, reusable containers, or SGLs handling packaging (Tier 2 saves 2 ETB, Tier 3 saves 2.86 ETB)."
                placement="right"
              />
            </label>
            <input
              type="range"
              min="0.2"
              max="1.5"
              step="0.01"
              value={getMultiplier('packaging')}
              onChange={(e) => updateOperationalMultiplier('packaging', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>{(basePackagingCost * 0.2).toFixed(2)} ETB (-80%)</span>
              <span className="font-medium">
                {describeChange(basePackagingCost, getMultiplier('packaging'))}
              </span>
              <span>{(basePackagingCost * 1.5).toFixed(2)} ETB (+50%)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Warehouse (Current: {baseWarehouseCost.toFixed(2)} ETB/kg)
            </label>
            <input
              type="range"
              min="0.2"
              max="1.5"
              step="0.01"
              value={getMultiplier('warehouse')}
              onChange={(e) => updateOperationalMultiplier('warehouse', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>{(baseWarehouseCost * 0.2).toFixed(2)} ETB (-80%)</span>
              <span className="font-medium">
                {describeChange(baseWarehouseCost, getMultiplier('warehouse'))}
              </span>
              <span>{(baseWarehouseCost * 1.5).toFixed(2)} ETB (+50%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product-Level Adjustments */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-4">Product-Level Adjustments</h3>
        <div className="max-h-96 overflow-y-auto space-y-3">
          {products.map(product => (
            <div key={product.product_name} className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-sm mb-2">{product.product_name}</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div>
                  <label className="text-xs text-gray-600">Purchase Price (ETB)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={
                      scenario.procurementChanges?.[product.product_name] ??
                      product.procurement_cost
                    }
                    onChange={(e) =>
                      updateProcurement(product.product_name, parseFloat(e.target.value) || 0)
                    }
                    onFocus={() => setActiveProduct(product.product_name)}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Selling Price (ETB)</label>
                  <input
                    type="number"
                    step="1"
                    value={scenario.priceChanges?.[product.product_name] || product.selling_price}
                    onChange={(e) => updatePrice(product.product_name, parseFloat(e.target.value) || 0)}
                    onFocus={() => setActiveProduct(product.product_name)}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Commission (ETB)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={scenario.commissionChanges?.[product.product_name] || product.sgl_commission}
                    onChange={(e) => updateCommission(product.product_name, parseFloat(e.target.value) || 0)}
                    onFocus={() => setActiveProduct(product.product_name)}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">SGL Tier</label>
                  <select
                    value={scenario.tierChanges?.[product.product_name] || ''}
                    onChange={(e) => updateTier(product.product_name, e.target.value)}
                    onFocus={() => setActiveProduct(product.product_name)}
                    className="w-full px-2 py-1 border rounded text-sm"
                  >
                    <option value="">Current</option>
                    {tiers.map(tier => (
                      <option key={tier.tier_name} value={tier.tier_name}>
                        {tier.tier_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Weekly Volume (kg)</label>
                  <input
                    type="number"
                    step="1"
                    value={
                      scenario.volumeOverrides?.[product.product_name] ??
                      volumeData[product.product_name] ??
                      0
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        updateVolume(product.product_name, null);
                        return;
                      }
                      const parsed = parseFloat(val);
                      if (Number.isNaN(parsed)) {
                        updateVolume(product.product_name, null);
                      } else {
                        updateVolume(product.product_name, parsed);
                      }
                    }}
                    onFocus={() => setActiveProduct(product.product_name)}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
              {activeProduct === product.product_name && (ruleLookup[product.product_name] ?? []).length > 0 && (
                <div className="mt-3 bg-white border border-indigo-200 rounded-lg p-3 text-xs text-gray-700 shadow-sm">
                  <div className="flex items-center gap-2 text-indigo-600 font-semibold mb-2">
                    <InfoTooltip content="Based on leader basket associations. High lift indicates strong cross-sell potential." />
                    Related Basket Signals
                  </div>
                  <ul className="space-y-2">
                    {(ruleLookup[product.product_name] ?? []).map(rule => (
                      <li key={rule.id} className="leading-relaxed">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold uppercase tracking-wide text-[10px]">
                          {RULE_CATEGORY_LABEL[rule.category]}
                        </span>
                        <span className="ml-2 font-semibold text-gray-900">
                          {rule.consequents.join(', ')}
                        </span>
                        <span className="text-gray-500"> • </span>
                        <span>Lift {rule.lift.toFixed(2)}× | Confidence {(rule.confidence * 100).toFixed(1)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

