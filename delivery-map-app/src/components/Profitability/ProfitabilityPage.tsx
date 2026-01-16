import React, { useState, useEffect, useCallback } from 'react';
import type { ProductProfitability, DailyProductProfitability } from '../../types';
import { DataStore } from '../../utils/dataStore';
import { ApiClient } from '../../utils/apiClient';
import { ProductTable } from './ProductTable';
import { CostWaterfall } from './CostWaterfall';
import { PriceForecastTab } from './PriceForecastTab';
import { formatCurrency } from '../../utils/profitabilityCalc';
import { DateRangePicker } from '../DateRangePicker';

type ViewMode = 'weekly' | 'daily';
type TabMode = 'profitability' | 'forecast';

export const ProfitabilityPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductProfitability[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductProfitability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const metricsWindow = DataStore.getMetricsWindow();
  const [includeOpsCost, setIncludeOpsCost] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [activeTab, setActiveTab] = useState<TabMode>('profitability');
  
  // Date range for daily view
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  const [dateFrom, setDateFrom] = useState(
    lastWeek.toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(
    today.toISOString().split('T')[0]
  );

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

  // Convert daily profitability data to ProductProfitability format
  const convertDailyToProductProfitability = (
    dailyProducts: DailyProductProfitability[]
  ): ProductProfitability[] => {
    // Group by product name and aggregate
    const productMap = new Map<string, {
      total_volume_kg: number;
      total_revenue_etb: number;
      total_profit_etb: number;
      total_cost_etb: number;
      total_purchase_cost_etb: number;
      total_commission_etb: number;
      selling_price_per_kg: number;
      purchase_price_per_kg: number;
      local_shop_price: number;
      dates: string[];
    }>();

    dailyProducts.forEach(daily => {
      const existing = productMap.get(daily.product_name) || {
        total_volume_kg: 0,
        total_revenue_etb: 0,
        total_profit_etb: 0,
        total_cost_etb: 0,
        total_purchase_cost_etb: 0,
        total_commission_etb: 0,
        weighted_selling_price: 0, // Weighted by volume
        weighted_purchase_price: 0, // Weighted by volume
        latest_selling_price: 0,
        latest_purchase_price: 0,
        local_shop_price: 0,
        dates: []
      };

      existing.total_volume_kg += daily.total_volume_kg;
      existing.total_revenue_etb += daily.total_revenue_etb;
      existing.total_profit_etb += daily.profit_etb;
      existing.total_cost_etb += daily.total_cost_etb;
      existing.total_purchase_cost_etb += daily.total_purchase_cost_etb;
      existing.total_commission_etb += daily.super_group_commission_etb;
      
      // Calculate weighted average prices (weighted by volume)
      if (daily.total_volume_kg > 0) {
        const volumeWeight = daily.total_volume_kg;
        if (daily.selling_price_per_kg > 0) {
          existing.weighted_selling_price += daily.selling_price_per_kg * volumeWeight;
          existing.latest_selling_price = daily.selling_price_per_kg; // Keep latest for fallback
        }
        if (daily.purchase_price_per_kg > 0) {
          existing.weighted_purchase_price += daily.purchase_price_per_kg * volumeWeight;
          existing.latest_purchase_price = daily.purchase_price_per_kg; // Keep latest for fallback
        }
      }
      
      existing.dates.push(daily.date);

      productMap.set(daily.product_name, existing);
    });

    // Convert to ProductProfitability format
    const result: ProductProfitability[] = [];
    productMap.forEach((data, productName) => {
      // CRITICAL FIX: Only include products that have sales in the date range
      // Filter out products with zero volume to ensure we only show active products
      if (data.total_volume_kg <= 0) {
        return; // Skip products with no sales
      }
      
      const avgVolumePerDay = data.dates.length > 0 ? data.total_volume_kg / data.dates.length : 0;
      const weeklyVolume = avgVolumePerDay * 7;
      const weeklyRevenue = data.dates.length > 0 ? (data.total_revenue_etb / data.dates.length) * 7 : 0;
      const weeklyProfit = data.dates.length > 0 ? (data.total_profit_etb / data.dates.length) * 7 : 0;
      
      // Calculate average cost per kg
      const avgCostPerKg = data.total_volume_kg > 0 
        ? data.total_cost_etb / data.total_volume_kg 
        : 0;
      const avgPurchasePerKg = data.total_volume_kg > 0
        ? data.total_purchase_cost_etb / data.total_volume_kg
        : 0;
      const avgCommissionPerKg = data.total_volume_kg > 0
        ? data.total_commission_etb / data.total_volume_kg
        : 0;
      
      // Calculate weighted average selling price (or use revenue/volume ratio if available)
      let sellingPricePerKg = 0;
      if (data.total_volume_kg > 0) {
        // First try: weighted average from daily prices
        if (data.weighted_selling_price > 0) {
          sellingPricePerKg = data.weighted_selling_price / data.total_volume_kg;
        }
        // Second try: calculate from total revenue (more accurate)
        else if (data.total_revenue_etb > 0) {
          sellingPricePerKg = data.total_revenue_etb / data.total_volume_kg;
        }
        // Fallback: use latest price
        else if (data.latest_selling_price > 0) {
          sellingPricePerKg = data.latest_selling_price;
        }
      }
      
      // Calculate weighted average purchase price (or use cost/volume ratio if available)
      let purchasePricePerKg = avgPurchasePerKg;
      if (purchasePricePerKg === 0 && data.total_volume_kg > 0) {
        if (data.weighted_purchase_price > 0) {
          purchasePricePerKg = data.weighted_purchase_price / data.total_volume_kg;
        } else if (data.latest_purchase_price > 0) {
          purchasePricePerKg = data.latest_purchase_price;
        }
      }
      
      // Estimate operational cost (this might need adjustment based on your data)
      const operations = includeOpsCost ? Math.max(0, avgCostPerKg - purchasePricePerKg - avgCommissionPerKg) : 0;
      
      // Calculate margin
      const marginPerKg = sellingPricePerKg - avgCostPerKg;
      const marginPct = sellingPricePerKg > 0 
        ? (marginPerKg / sellingPricePerKg) * 100 
        : 0;
      
      // Estimate local shop price (10% markup, or use a better source if available)
      const localShopPrice = sellingPricePerKg > 0 ? sellingPricePerKg * 1.1 : 0;
      const discountPct = localShopPrice > 0
        ? ((localShopPrice - sellingPricePerKg) / localShopPrice) * 100
        : 0;

      result.push({
        product: productName,
        procurement: purchasePricePerKg,
        operations: operations,
        commission: avgCommissionPerKg,
        total_cost: avgCostPerKg,
        selling_price: sellingPricePerKg,
        margin_per_kg: marginPerKg,
        margin_pct: marginPct,
        local_shop_price: localShopPrice,
        discount_pct: discountPct,
        weekly_volume_kg: weeklyVolume,
        weekly_revenue: weeklyRevenue,
        weekly_profit: weeklyProfit
      });
    });

    return result.sort((a, b) => a.weekly_profit - b.weekly_profit);
  };

  const loadWeeklyProfitability = useCallback(async () => {
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

  const loadDailyProfitability = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await ApiClient.getDailyProductProfitability(dateFrom, dateTo);
      
      if (response.daily_products && response.daily_products.length > 0) {
        const profitability = convertDailyToProductProfitability(response.daily_products);
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
      } else {
        setProducts([]);
        setSelectedProduct(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load daily profitability data');
      console.error('Daily profitability load error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, includeOpsCost]);

  const loadProfitability = useCallback(async () => {
    if (viewMode === 'weekly') {
      await loadWeeklyProfitability();
    } else {
      await loadDailyProfitability();
    }
  }, [viewMode, loadWeeklyProfitability, loadDailyProfitability]);

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">View Mode:</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setViewMode('weekly')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'weekly'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setViewMode('daily')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'daily'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Daily
                </button>
              </div>
            </div>
            {viewMode === 'daily' && (
              <div className="flex items-center gap-2">
                <DateRangePicker
                  fromDate={dateFrom}
                  toDate={dateTo}
                  onFromDateChange={setDateFrom}
                  onToDateChange={setDateTo}
                  label="Date Range"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
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
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {viewMode === 'weekly' ? 'Weekly' : 'Period'} Revenue
            </p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue, 2)} ETB</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {viewMode === 'weekly' ? 'Weekly' : 'Period'} Cost
            </p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost, 2)} ETB</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {viewMode === 'weekly' ? 'Weekly' : 'Period'} Profit
            </p>
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
        {viewMode === 'weekly' ? (
          <>
            <p className="text-xs text-gray-500 mt-3">
              Metrics computed using the last {lookbackDays} days of sales data (averaged to weekly figures).
            </p>
            {formatWeekWindow(metricsWindow) && (
              <p className="text-xs text-gray-400">
                Week window {formatWeekWindow(metricsWindow)}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-500 mt-3">
            Daily profitability data from {dateFrom} to {dateTo} (aggregated and projected to weekly figures).
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-6">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('profitability')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'profitability'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Profitability Analysis
          </button>
          <button
            onClick={() => setActiveTab('forecast')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'forecast'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Price Forecasting
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'profitability' ? (
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
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <PriceForecastTab
            products={products.map(p => ({
              product_name: p.product,
              // Use selling_price, or fallback to local_shop_price, or calculate from weekly_revenue/weekly_volume
              latest_selling_price: p.selling_price > 0 
                ? p.selling_price 
                : (p.local_shop_price > 0 
                  ? p.local_shop_price 
                  : (p.weekly_volume_kg > 0 && p.weekly_revenue > 0 
                    ? p.weekly_revenue / p.weekly_volume_kg 
                    : undefined))
            }))}
          />
        </div>
      )}
    </div>
  );
};

