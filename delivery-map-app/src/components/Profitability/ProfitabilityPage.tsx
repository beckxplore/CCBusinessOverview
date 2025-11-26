import React, { useState, useEffect, useCallback } from 'react';
import type { ProductProfitability } from '../../types';
import { DataStore } from '../../utils/dataStore';
import { ProductTable } from './ProductTable';
import { CostWaterfall } from './CostWaterfall';
import { formatCurrency } from '../../utils/profitabilityCalc';

export const ProfitabilityPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductProfitability[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductProfitability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const metricsWindow = DataStore.getMetricsWindow();
  const [includeOpsCost, setIncludeOpsCost] = useState(true);

  const formatWeekWindow = (window?: { start: string; end: string } | null): string | null => {
    if (!window) {
      return null;
    }
    const formatter = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    return `${formatter.format(new Date(window.start))} – ${formatter.format(new Date(window.end))}`;
  };

  const loadProfitability = useCallback(async () => {
    try {
      setLoading(true);
      
      // Ensure DataStore is loaded
      if (!DataStore.isLoaded()) {
        await DataStore.loadAll();
      }

      const volumeData = DataStore.getWeeklyVolumeMap();
      const localPrices = DataStore.getLocalShopPriceMap();

      const profitability = DataStore.getProductProfitability(volumeData, localPrices, {
        sortBy: 'weekly_profit',
        sortOrder: 'asc'
      }, includeOpsCost);

      setProducts(profitability);
      setSelectedProduct(prev => {
        if (!profitability.length) {
          return null;
        }
        if (!prev) {
          return profitability[0];
        }
        return profitability.find(p => p.product === prev.product) ?? profitability[0];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profitability data');
      console.error('Profitability load error:', err);
    } finally {
      setLoading(false);
    }
  }, [includeOpsCost]);

  useEffect(() => {
    loadProfitability();
  }, [loadProfitability]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profitability data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={loadProfitability}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalRevenue = products.reduce((sum, p) => sum + p.weekly_revenue, 0);
  const totalProfit = products.reduce((sum, p) => sum + p.weekly_profit, 0);
  const totalCost = products.reduce((sum, p) => sum + (p.total_cost * p.weekly_volume_kg), 0);
  const profitableProducts = products.filter(p => p.margin_per_kg > 0).length;
  const losingProducts = products.filter(p => p.margin_per_kg < 0).length;

  const lookbackDays = DataStore.getMetricsLookbackDays();

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Summary Cards */}
      <div className="bg-white border-b p-6">
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">Weekly Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue, 0)} ETB</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Weekly Cost</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost, 0)} ETB</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Weekly Profit</p>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalProfit, 0)} ETB
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Profitable Products</p>
            <p className="text-2xl font-bold text-green-600">{profitableProducts}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Losing Products</p>
            <p className="text-2xl font-bold text-red-600">{losingProducts}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Metrics computed using the last {lookbackDays} days of sales data (averaged to weekly figures).
        </p>
        {formatWeekWindow(metricsWindow) && (
          <p className="text-xs text-gray-400">
            Week window {formatWeekWindow(metricsWindow)}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2 text-sm">
          <label className="inline-flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              checked={includeOpsCost}
              onChange={() => setIncludeOpsCost(prev => !prev)}
            />
            Include operational cost in totals
          </label>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex p-6 space-x-6">
        {/* Product Table */}
        <div className="flex-1 overflow-auto">
          <ProductTable
            products={products}
            onProductSelect={setSelectedProduct}
            selectedProduct={selectedProduct?.product || null}
          />
        </div>

        {/* Cost Breakdown */}
        <div className="w-[400px] overflow-auto">
          {selectedProduct ? (
            <CostWaterfall product={selectedProduct} />
          ) : (
            <div className="bg-white rounded-lg shadow p-6 h-full flex items-center justify-center">
              <p className="text-gray-500">Select a product to see cost breakdown</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

