import React, { useState, useEffect } from 'react';
import type {
  ScenarioParams,
  SimulationResult,
  ProductCost,
  SGLTier,
  DeliveryData
} from '../../types';
import { ApiClient } from '../../utils/apiClient';
import { DataStore } from '../../utils/dataStore';
import { ScenarioControls } from './ScenarioControls';
import { ResultsComparison } from './ResultsComparison';

const WAREHOUSE_COORD = {
  lat: 8.992697915198226,
  lon: 38.821279561426266
};
const PICKUP_RADIUS_KM = 0.5;
const LOGISTICS_COST_PER_KG = 6.41;

interface PickupOptimizationResult {
  logisticsMultiplier: number;
  adjustedLogisticsCost: number;
  savingsPerKg: number;
  matchedVolumeKg: number;
  totalNormalVolumeKg: number;
  coveragePct: number;
}

const degToRad = (deg: number) => (deg * Math.PI) / 180;

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = degToRad(lat2 - lat1);
  const dLon = degToRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degToRad(lat1)) * Math.cos(degToRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const computePickupOptimization = (deliveryData: DeliveryData[]): PickupOptimizationResult | null => {
  if (!deliveryData.length) {
    return null;
  }

  const superLeaders = deliveryData.filter(
    leader =>
      leader.group_deal_category === 'SUPER_GROUPS' &&
      typeof leader.latitude === 'number' &&
      typeof leader.longitude === 'number'
  );

  const normalLeaders = deliveryData.filter(
    leader =>
      leader.group_deal_category === 'NORMAL_GROUPS' &&
      typeof leader.latitude === 'number' &&
      typeof leader.longitude === 'number'
  );

  if (!superLeaders.length || !normalLeaders.length) {
    return null;
  }

  let baselineDistanceVolume = 0;
  let optimizedDistanceVolume = 0;
  let matchedVolumeKg = 0;
  let totalNormalVolumeKg = 0;

  const warehouseLat = WAREHOUSE_COORD.lat;
  const warehouseLon = WAREHOUSE_COORD.lon;

  // Precompute super leader distances to warehouse
  const superWarehouseDistances = new Map<string, number>();
  superLeaders.forEach(leader => {
    const volume = leader.total_kg ?? 0;
    if (volume <= 0) {
      return;
    }
    const dist = haversineKm(warehouseLat, warehouseLon, leader.latitude!, leader.longitude!);
    superWarehouseDistances.set(leader.group_created_by, dist);
    baselineDistanceVolume += dist * volume;
    optimizedDistanceVolume += dist * volume;
  });

  // Process normal leaders
  normalLeaders.forEach(leader => {
    const volume = leader.total_kg ?? 0;
    if (volume <= 0) {
      return;
    }
    const leaderDist = haversineKm(warehouseLat, warehouseLon, leader.latitude!, leader.longitude!);
    baselineDistanceVolume += leaderDist * volume;
    totalNormalVolumeKg += volume;

    let assignedDist: number | null = null;
    for (const sgl of superLeaders) {
      const distanceToSGL = haversineKm(leader.latitude!, leader.longitude!, sgl.latitude!, sgl.longitude!);
      if (distanceToSGL <= PICKUP_RADIUS_KM) {
        const sglWarehouseDist =
          superWarehouseDistances.get(sgl.group_created_by) ??
          haversineKm(warehouseLat, warehouseLon, sgl.latitude!, sgl.longitude!);
        assignedDist = sglWarehouseDist;
        break;
      }
    }

    if (assignedDist !== null) {
      optimizedDistanceVolume += assignedDist * volume;
      matchedVolumeKg += volume;
    } else {
      optimizedDistanceVolume += leaderDist * volume;
    }
  });

  if (baselineDistanceVolume <= 0) {
    return null;
  }

  const logisticsMultiplier = optimizedDistanceVolume / baselineDistanceVolume;
  const adjustedLogisticsCost = LOGISTICS_COST_PER_KG * logisticsMultiplier;
  const savingsPerKg = LOGISTICS_COST_PER_KG - adjustedLogisticsCost;
  const coveragePct = totalNormalVolumeKg > 0 ? matchedVolumeKg / totalNormalVolumeKg : 0;

  return {
    logisticsMultiplier,
    adjustedLogisticsCost,
    savingsPerKg,
    matchedVolumeKg,
    totalNormalVolumeKg,
    coveragePct
  };
};

export const PlaygroundPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [scenario, setScenario] = useState<ScenarioParams>({});
  const [results, setResults] = useState<SimulationResult | null>(null);
  const [products, setProducts] = useState<ProductCost[]>([]);
  const [tiers, setTiers] = useState<SGLTier[]>([]);
  const [elasticities, setElasticities] = useState<Record<string, number>>({});
  const [volumeData, setVolumeData] = useState<Record<string, number>>({});
  const [localPrices, setLocalPrices] = useState<Record<string, number>>({});
  const [pickupOptimization, setPickupOptimization] = useState<PickupOptimizationResult | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      runSimulation();
    }
  }, [scenario, products]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (!DataStore.isLoaded()) {
        await DataStore.loadAll();
      }

      const [deliveryDataset, elasticityResponse] = await Promise.all([
        ApiClient.getDeliveryData(),
        ApiClient.getForecastElasticities().catch(() => ({ elasticities: {} }))
      ]);

      const loadedProducts = DataStore.getProductCosts();
      const loadedTiers = DataStore.getSGLTiers();
      const weeklyVolumes = DataStore.getWeeklyVolumeMap();
      const localShopPrices = DataStore.getLocalShopPriceMap();

      setProducts(loadedProducts);
      setTiers(loadedTiers);
      setVolumeData(weeklyVolumes);
      setLocalPrices(localShopPrices);
      setElasticities(elasticityResponse.elasticities || {});
      setPickupOptimization(computePickupOptimization(deliveryDataset.records ?? []));
    } catch (error) {
      console.error('Failed to load playground data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = () => {
    const simulationResults = DataStore.simulateScenario(
      volumeData,
      localPrices,
      elasticities,
      scenario
    );

    setResults(simulationResults);
  };

  const loadPreset = (preset: string) => {
    switch (preset) {
      case 'optimize-potato':
        setScenario({
          priceChanges: { 'Potato': 28 },
          commissionChanges: { 'Potato': 1 }
        });
        break;
      
      case 'sgl-pickup': {
        const tier2Changes: Record<string, string> = {};
        products.forEach(p => {
          tier2Changes[p.product_name] = 'Tier 2 - Pickup';
        });
        setScenario({
          tierChanges: tier2Changes
        });
        break;
      }
      case 'sgl-hub-pickup': {
        if (pickupOptimization) {
          const clampedMultiplier = Math.min(
            1,
            Math.max(0.3, Number(pickupOptimization.logisticsMultiplier.toFixed(3)))
          );
          setScenario({
            operationalCostMultipliers: {
              logistics: clampedMultiplier
            }
          });
        }
        break;
      }
      
      case 'cost-cutting':
        setScenario({
          operationalCostMultipliers: {
            logistics: 0.7,
            packaging: 0.7,
            warehouse: 0.7
          }
        });
        break;
      
      case 'premium': {
        const priceIncreases: Record<string, number> = {};
        products.forEach(p => {
          priceIncreases[p.product_name] = p.selling_price * 1.15;
        });
        setScenario({
          priceChanges: priceIncreases
        });
        break;
      }
      
      default:
        setScenario({});
    }
  };

  const resetScenario = () => {
    setScenario({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-50">
      {/* Left: Controls */}
      <div className="w-[480px] bg-white border-r overflow-y-auto">
        <div className="p-6 border-b bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">Scenario Builder</h2>
          <p className="text-sm text-gray-600 mt-1">Test different strategies and see their impact</p>
          <button
            onClick={resetScenario}
            className="mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
          >
            Reset to Current State
          </button>
        </div>
        <div className="p-6">
          <ScenarioControls
            products={products}
            tiers={tiers}
            scenario={scenario}
            onScenarioChange={setScenario}
            onLoadPreset={loadPreset}
            volumeData={volumeData}
            pickupOptimization={pickupOptimization}
          />
        </div>
      </div>

      {/* Right: Results */}
      <div className="flex-1 overflow-y-auto p-6">
        <ResultsComparison results={results} />
      </div>
    </div>
  );
};

