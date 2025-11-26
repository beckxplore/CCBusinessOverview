import React, { useEffect, useMemo, useState } from 'react';
import { ApiClient } from '../utils/apiClient';
import { DataStore } from '../utils/dataStore';
import { InfoTooltip } from './Common/InfoTooltip';
import type { PersonaDefinition, CommissionData } from '../types';

interface ForecastPageProps {
  onUpdateMultiplier: (_multiplier: number) => void;
}

// Elasticity-based model with persona and product-specific options
// multiplier = 1 + elasticity * sum(share_i * offset_i)
export const ForecastPage: React.FC<ForecastPageProps> = ({ onUpdateMultiplier }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<string[]>([]);
  const [shares, setShares] = useState<Record<string, number>>({});
  const [personas, setPersonas] = useState<PersonaDefinition[]>([]);
  const [productElasticities, setProductElasticities] = useState<Record<string, number>>({});
  const [commissions, setCommissions] = useState<Record<string, CommissionData>>({});
  const [useProductSpecific, setUseProductSpecific] = useState<boolean>(false);
  const [selectedPersona, setSelectedPersona] = useState<string>('Custom');
  const [elasticity, setElasticity] = useState<number>(-1.8);
  const [offsetsPct, setOffsetsPct] = useState<Record<string, number>>({});
  const [showCommissionImpact, setShowCommissionImpact] = useState<boolean>(false);
  const [customCommissions, setCustomCommissions] = useState<Record<string, number>>({});
  const [priceBaselines, setPriceBaselines] = useState<
    Record<string, { selling: number | null; benchmark: number | null }>
  >({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [prodRes, shareRes, elastRes, personaRes, commRes] = await Promise.all([
          ApiClient.getForecastProducts(),
          ApiClient.getForecastShares(),
          ApiClient.getForecastElasticities().catch(() => ({ elasticities: {} as Record<string, number> })),
          ApiClient.getForecastPersonas().catch(() => ({ personas: [] })),
          ApiClient.getForecastCommissions().catch(() => ({ commissions: {} as Record<string, CommissionData> }))
        ]);
        setProducts(prodRes.products);
        setShares(shareRes.shares || {});
        setProductElasticities(elastRes.elasticities || {});
        setPersonas(personaRes.personas || []);
        setCommissions(commRes.commissions || {});
        
        // Initialize custom commissions with recommended values
        const initComm: Record<string, number> = {};
        prodRes.products.forEach(p => { 
          const rec = commRes.commissions?.[p]?.recommended_commission ?? 3.0;
          initComm[p] = rec;
        });
        setCustomCommissions(initComm);
        
        // If personas loaded and default is Aggressive Discounter, set it
        if (personaRes.personas && personaRes.personas.length > 0) {
          const aggressive = personaRes.personas.find(p => p.name === 'Aggressive Discounter');
          if (aggressive) {
            setElasticity(aggressive.elasticity);
            setSelectedPersona(aggressive.name);
          }
        }
        
        // Initialize offsets from current selling vs benchmark data
        const initialOffsets: Record<string, number> = {};
        const baselineMap: Record<string, { selling: number | null; benchmark: number | null }> = {};

        prodRes.products.forEach(p => {
          initialOffsets[p] = 0;
          baselineMap[p] = { selling: null, benchmark: null };
        });

        try {
          if (!DataStore.isLoaded()) {
            await DataStore.loadAll();
          }
          const localPriceMap = DataStore.getLocalShopPriceMap();
          const productCosts = DataStore.getProductCosts();

          prodRes.products.forEach(p => {
            const productCost = productCosts.find(cost => cost.product_name === p);
            const selling = productCost?.selling_price ?? null;
            const benchmark = localPriceMap[p] ?? null;

            baselineMap[p] = {
              selling,
              benchmark: typeof benchmark === 'number' ? benchmark : null
            };

            if (
              typeof benchmark === 'number' &&
              benchmark > 0 &&
              typeof selling === 'number' &&
              selling > 0
            ) {
              const pctDiff = ((selling - benchmark) / benchmark) * 100;
              initialOffsets[p] = Number(pctDiff.toFixed(1));
            }
          });
        } catch (dsError) {
          console.warn('Failed to prefill price offsets from live data:', dsError);
        }

        setOffsetsPct(initialOffsets);
        setPriceBaselines(baselineMap);
      } catch (e: any) {
        setError(e?.message || 'Failed to load forecast metadata');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const weightedOffset = useMemo(() => {
    if (!products.length) return 0;
    
    if (useProductSpecific) {
      // Product-specific elasticity: calculate separate multiplier per product then average weighted by share
      let weightedSum = 0;
      for (const p of products) {
        const share = shares[p] || 0;
        const pct = (offsetsPct[p] || 0) / 100;
        const prodElasticity = productElasticities[p] || elasticity; // fallback to global
        const prodMultiplier = 1 + prodElasticity * pct;
        weightedSum += share * (prodMultiplier - 1); // deviation from baseline
      }
      return weightedSum; // already weighted by share
    } else {
      // Global elasticity: single elasticity applied to weighted price change
      let sum = 0;
      for (const p of products) {
        const share = shares[p] || 0;
        const pct = (offsetsPct[p] || 0) / 100;
        sum += share * pct;
      }
      return sum;
    }
  }, [products, shares, offsetsPct, useProductSpecific, productElasticities, elasticity]);

  const multiplier = useMemo(() => {
    if (useProductSpecific) {
      // Already computed as weighted deviation
      const m = 1 + weightedOffset;
      return m < 0 ? 0 : m;
    } else {
      // Standard global elasticity
      const m = 1 + elasticity * weightedOffset;
      return m < 0 ? 0 : m;
    }
  }, [elasticity, weightedOffset, useProductSpecific]);

  useEffect(() => {
    onUpdateMultiplier(multiplier);
  }, [multiplier, onUpdateMultiplier]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  const handlePersonaChange = (personaName: string) => {
    setSelectedPersona(personaName);
    if (personaName === 'Custom') {
      // Keep current elasticity
      return;
    }
    const persona = personas.find(p => p.name === personaName);
    if (persona) {
      setElasticity(persona.elasticity);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
          Forecast Controls
          <InfoTooltip 
            content="Configure demand forecast parameters based on customer price sensitivity. Adjust prices and see predicted demand impact using measured elasticity from real customer data."
          />
        </h3>
        <div className="space-y-3">
          {/* Persona Selector */}
          {personas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                Customer Persona (Measured)
                <InfoTooltip 
                  content="Pre-defined customer segments based on historical ordering patterns and price sensitivity. Each persona has a measured demand elasticity calculated from real data."
                  placement="right"
                />
              </label>
              <select
                value={selectedPersona}
                onChange={(e) => handlePersonaChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="Custom">Custom Elasticity</option>
                {personas.map(p => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.elasticity.toFixed(2)}) - {p.leader_count} leaders, {p.avg_kg_per_day.toFixed(1)} kg/day avg
                  </option>
                ))}
              </select>
              {selectedPersona !== 'Custom' && (
                <div className="mt-1 text-xs text-blue-600">
                  Using measured elasticity from {personas.find(p => p.name === selectedPersona)?.leader_count} leaders
                </div>
              )}
            </div>
          )}
          
          {/* Elasticity Slider (enabled only for Custom) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              Demand Elasticity {selectedPersona !== 'Custom' && '(Auto from Persona)'}
              <InfoTooltip 
                content="Measures how much demand changes with price. -1.8 means 10% price increase → 18% demand decrease. More negative = more price-sensitive customers."
                placement="right"
              />
            </label>
            <input
              type="range"
              min={-3.5}
              max={0}
              step={0.05}
              value={elasticity}
              onChange={(e) => {
                setElasticity(parseFloat(e.target.value));
                setSelectedPersona('Custom');
              }}
              disabled={selectedPersona !== 'Custom'}
              className="w-full disabled:opacity-50"
            />
            <div className="text-xs text-gray-600 mt-1">Current: {elasticity.toFixed(2)}</div>
          </div>
          
          {/* Product-Specific Toggle */}
          <div className="p-2 bg-blue-50 rounded border border-blue-200">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useProductSpecific}
                onChange={(e) => setUseProductSpecific(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-blue-900">Use Product-Specific Elasticity</span>
            </label>
            <div className="text-xs text-blue-700 mt-1">
              {useProductSpecific 
                ? `Using measured elasticity per product (e.g., Potato: ${(productElasticities['Potato'] || -1.8).toFixed(2)})`
                : 'Using single global elasticity for all products'}
            </div>
          </div>
          
          <div className="p-2 bg-gray-50 rounded border">
            <div className="text-sm">Global multiplier: <span className="font-semibold">{multiplier.toFixed(3)}</span></div>
            <div className="text-xs text-gray-600">Applied to total orders at each location</div>
          </div>
        </div>
      </div>

      {/* Commission Impact Toggle */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Commission Strategy</h3>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showCommissionImpact}
              onChange={(e) => setShowCommissionImpact(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Show Commission Analysis</span>
          </label>
        </div>
        
        {showCommissionImpact && (
          <div className="space-y-2 text-sm">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <div className="font-medium text-yellow-900 mb-1">⚠️ Commission Impact on Elasticity</div>
              <div className="text-xs text-yellow-800">
                Leaders push products with higher commission %. Current 3-5 ETB/kg structure inflates measured elasticity.
              </div>
            </div>
            
            {/* Commission summary stats */}
            {(() => {
              const totalProducts = products.length;
              const avgRecommended = products.reduce((sum, p) => sum + (commissions[p]?.recommended_commission || 3.0), 0) / totalProducts;
              const avgCurrent = 4.0; // Estimated current average (mostly 5, Potato at 3)
              const savingsETB = products.reduce((sum, p) => {
                const current = p === 'Potato' ? 3.0 : 5.0;
                const recommended = commissions[p]?.recommended_commission || 3.0;
                return sum + (current - recommended);
              }, 0);
              
              return (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-blue-50 rounded">
                    <div className="text-gray-600">Avg Current</div>
                    <div className="font-semibold text-blue-900">{avgCurrent.toFixed(2)} ETB/kg</div>
                  </div>
                  <div className="p-2 bg-green-50 rounded">
                    <div className="text-gray-600">Avg Recommended</div>
                    <div className="font-semibold text-green-900">{avgRecommended.toFixed(2)} ETB/kg</div>
                  </div>
                  <div className="p-2 bg-purple-50 rounded">
                    <div className="text-gray-600">Est. Savings</div>
                    <div className="font-semibold text-purple-900">{savingsETB.toFixed(1)} ETB/kg total</div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {showCommissionImpact ? 'Price & Commission Strategy' : 'Price vs Local Shop (%)'}
        </h3>
        <div className="text-xs text-gray-600 mb-3">
          {showCommissionImpact 
            ? 'Adjust price offsets and commission rates. Recommended commissions are margin-based.'
            : 'Auto-filled from current selling vs benchmark data. Enter -15 for 15% below local shop, +8 for 8% above.'}
        </div>
        <div className="max-h-[420px] overflow-y-auto divide-y">
          {products.map((p) => {
            const prodElasticity = productElasticities[p];
            const hasElasticity = prodElasticity !== undefined;
            const commData = commissions[p];
            const currentComm = p === 'Potato' ? 3.0 : 5.0; // Estimated current
            const recommendedComm = commData?.recommended_commission || 3.0;
            const customComm = customCommissions[p] || recommendedComm;
            const commDiff = currentComm - recommendedComm;
            const baseline = priceBaselines[p];
            const sellingPrice =
              baseline && typeof baseline.selling === 'number'
                ? baseline.selling
                : undefined;
            const benchmarkPrice =
              baseline && typeof baseline.benchmark === 'number'
                ? baseline.benchmark
                : undefined;
            
            return (
              <div key={p} className="py-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-3">
                    <div className="text-sm text-gray-800 truncate" title={p}>{p}</div>
                    <div className="flex items-center space-x-2 text-xs">
                      {useProductSpecific && hasElasticity && (
                        <span className="text-blue-600">ε: {prodElasticity.toFixed(2)}</span>
                      )}
                      {showCommissionImpact && commData && (
                        <span className={commDiff > 0 ? 'text-green-600' : commDiff < 0 ? 'text-red-600' : 'text-gray-600'}>
                          {commDiff > 0 ? `↓ Save ${commDiff.toFixed(1)} ETB` : commDiff < 0 ? `↑ Raise ${Math.abs(commDiff).toFixed(1)} ETB` : '✓ Optimal'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={offsetsPct[p] ?? 0}
                      onChange={(e) => setOffsetsPct(prev => ({ ...prev, [p]: parseFloat(e.target.value) || 0 }))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md text-right text-sm"
                      title="Price offset %"
                    />
                    <span className="text-sm text-gray-500">%</span>
                    
                    {showCommissionImpact && (
                      <>
                        <input
                          type="number"
                          step="0.5"
                          value={customComm}
                          onChange={(e) => setCustomCommissions(prev => ({ ...prev, [p]: parseFloat(e.target.value) || 0 }))}
                          className="w-16 px-2 py-1 border border-gray-300 rounded-md text-right text-sm"
                          title="Commission ETB/kg"
                        />
                        <span className="text-xs text-gray-500">ETB</span>
                      </>
                    )}
                  </div>
                </div>
                {(sellingPrice !== undefined || benchmarkPrice !== undefined) && (
                  <div className="mt-1 text-xs text-gray-500">
                    <span>
                      Selling: {sellingPrice !== undefined ? `${sellingPrice.toFixed(1)} ETB` : '—'}
                    </span>
                    <span className="mx-2">•</span>
                    <span>
                      Benchmark: {benchmarkPrice !== undefined ? `${benchmarkPrice.toFixed(1)} ETB` : 'No data'}
                    </span>
                  </div>
                )}
                {showCommissionImpact && commData && commData.notes && (
                  <div className="mt-1 text-xs text-gray-500 italic">{commData.notes}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


