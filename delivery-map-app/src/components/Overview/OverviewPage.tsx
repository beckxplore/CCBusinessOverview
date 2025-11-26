import React, { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { DataStore } from '../../utils/dataStore';
import { ApiClient } from '../../utils/apiClient';
import { formatCurrency, getProfitColor } from '../../utils/profitabilityCalc';
import { InfoTooltip } from '../Common/InfoTooltip';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle,
  Building2
} from 'lucide-react';
import type { ProductProfitability, B2BBusinessOverview } from '../../types';
import { LeaderBasketInsights } from './LeaderBasketInsights';
import { StapleProductGrid } from './StapleProductGrid';

const STAPLE_PRODUCTS = [
  'Potato',
  'Avocado',
  'Carrot',
  'Sweet Potato',
  'Beetroot',
  'Papaya',
  'Garlic',
  'Cucumber',
  'Tomato'
];

export const OverviewPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductProfitability[]>([]);
  const [lookbackDays, setLookbackDays] = useState<number>(30);
  const [includeB2B, setIncludeB2B] = useState<boolean>(false);
  const [b2bData, setB2bData] = useState<B2BBusinessOverview | null>(null);
  const [b2bLoading, setB2bLoading] = useState(false);
  const [stapleSummaries, setStapleSummaries] = useState<
    Array<{
      product: string;
      sellingPrice: number | null;
      localBenchmark: number | null;
      procurementCost: number | null;
      totalCost: number | null;
      marginPerKg: number | null;
      benchmarkGap: number | null;
      weeklyVolume: number | null;
    }>
  >([]);

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (includeB2B && DataStore.isLoaded()) {
      loadB2BData();
    } else if (!includeB2B) {
      setB2bData(null);
    }
  }, [includeB2B]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      
      if (!DataStore.isLoaded()) {
        await DataStore.loadAll();
      }

      const volumeData = DataStore.getWeeklyVolumeMap();
      const localPrices = DataStore.getLocalShopPriceMap();

      const profitability = DataStore.getProductProfitability(volumeData, localPrices);
      setProducts(profitability);
      setLookbackDays(DataStore.getMetricsLookbackDays());

      const staples = STAPLE_PRODUCTS.map(productName => {
        const productCost = DataStore.getProductCost(productName);
        const sellingPrice = productCost?.selling_price ?? null;
        const procurementCost = productCost?.procurement_cost ?? null;
        const operationalCost = productCost?.operational_cost ?? null;
        const commission = productCost?.sgl_commission ?? null;
        const totalCost =
          procurementCost !== null &&
          operationalCost !== null &&
          commission !== null
            ? procurementCost + operationalCost + commission
            : null;
        const marginPerKg =
          sellingPrice !== null && totalCost !== null ? sellingPrice - totalCost : null;

        const localBenchmark = typeof localPrices[productName] === 'number'
          ? localPrices[productName]
          : null;
        const benchmarkGap =
          sellingPrice !== null && localBenchmark !== null
            ? sellingPrice - localBenchmark
            : null;

        const weeklyVolume = volumeData[productName] ?? null;

        return {
          product: productName,
          sellingPrice,
          localBenchmark,
          procurementCost,
          totalCost,
          marginPerKg,
          benchmarkGap,
          weeklyVolume
        };
      });
      setStapleSummaries(staples);
      
      // If B2B toggle is already enabled, load B2B data now that DataStore is loaded
      if (includeB2B) {
        loadB2BData();
      }
    } catch (error) {
      console.error('Failed to load overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadB2BData = async () => {
    try {
      setB2bLoading(true);
      
      // Get the same date range as the regular overview metrics
      const metricsWindow = DataStore.getMetricsWindow();
      let dateFrom: string;
      let dateTo: string;
      
      if (metricsWindow && metricsWindow.start && metricsWindow.end) {
        // Use the exact same window as regular metrics
        dateFrom = metricsWindow.start;
        dateTo = metricsWindow.end;
      } else {
        // Fallback: use lookback days if window is not available
        const lookbackDays = DataStore.getMetricsLookbackDays();
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - lookbackDays);
        
        dateFrom = startDate.toISOString().split('T')[0];
        dateTo = today.toISOString().split('T')[0];
      }
      
      const data = await ApiClient.getB2BBusinessOverview(dateFrom, dateTo);
      setB2bData(data);
    } catch (error) {
      console.error('Failed to load B2B data:', error);
      setB2bData(null);
    } finally {
      setB2bLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calculate regular (non-B2B) totals
  const regularRevenue = products.reduce((sum, p) => sum + p.weekly_revenue, 0);
  const regularCost = products.reduce((sum, p) => sum + (p.total_cost * p.weekly_volume_kg), 0);
  const regularProfit = products.reduce((sum, p) => sum + p.weekly_profit, 0);
  const regularVolume = products.reduce((sum, p) => sum + p.weekly_volume_kg, 0);
  
  // Get B2B totals if enabled
  const b2bRevenue = includeB2B && b2bData?.revenue ? b2bData.revenue : 0;
  const b2bOrders = includeB2B && b2bData?.orders ? b2bData.orders : 0;
  const b2bProfit = includeB2B && b2bData?.profit ? b2bData.profit : 0;
  const b2bCost = 0; // B2B costs not available in current interface
  
  // Combined totals
  const totalRevenue = regularRevenue + (includeB2B ? b2bRevenue : 0);
  const totalCost = regularCost + (includeB2B ? b2bCost : 0);
  const totalProfit = regularProfit + (includeB2B ? b2bProfit : 0);
  const totalVolume = regularVolume; // B2B volume is separate, not combined
  
  const profitableCount = products.filter(p => p.margin_per_kg > 0).length;
  const losingCount = products.filter(p => p.margin_per_kg < 0).length;

  const topProfitable = [...products]
    .filter(p => p.margin_per_kg > 0)
    .sort((a, b) => b.weekly_profit - a.weekly_profit)
    .slice(0, 5);

  const topLosses = [...products]
    .filter(p => p.margin_per_kg < 0)
    .sort((a, b) => a.weekly_profit - b.weekly_profit)
    .slice(0, 5);

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6 space-y-6">
      {/* B2B Toggle */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="text-gray-600" size={20} />
          <div>
            <label className="text-sm font-medium text-gray-700 cursor-pointer" htmlFor="b2b-toggle">
              Include B2B Data
            </label>
            <p className="text-xs text-gray-500">
              Add B2B revenue, orders, and profit to overview totals
              {DataStore.getMetricsWindow() && (
                <span className="ml-1">
                  (same time period: {new Date(DataStore.getMetricsWindow()!.start).toLocaleDateString()} - {new Date(DataStore.getMetricsWindow()!.end).toLocaleDateString()})
                </span>
              )}
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            id="b2b-toggle"
            checked={includeB2B}
            onChange={(e) => setIncludeB2B(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
        {includeB2B && b2bLoading && (
          <div className="ml-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          </div>
        )}
        {includeB2B && b2bData && (
          <div className="ml-4 text-sm text-gray-600">
            <span className="font-semibold">B2B:</span> {formatCurrency(b2bRevenue, 0)} ETB revenue, {b2bOrders} orders
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        <KPICard
          title="Weekly Revenue"
          value={`${formatCurrency(totalRevenue, 2)} ETB`}
          subtitle={includeB2B && b2bData ? 
            `${formatCurrency(regularRevenue, 0)} regular + ${formatCurrency(b2bRevenue, 0)} B2B` :
            `${formatCurrency(totalRevenue, 2)} ETB total`}
          icon={DollarSign}
          color="blue"
        />
        <KPICard
          title="Weekly Cost"
          value={`${formatCurrency(totalCost, 2)} ETB`}
          subtitle={includeB2B && b2bData ? 
            `${formatCurrency(regularCost, 0)} regular + ${formatCurrency(b2bCost, 0)} B2B` :
            `${formatCurrency(totalCost, 2)} ETB total`}
          icon={TrendingDown}
          color="purple"
        />
        <KPICard
          title="Weekly Profit/Loss"
          value={`${formatCurrency(totalProfit, 2)} ETB`}
          subtitle={includeB2B && b2bData ? 
            `${formatCurrency(regularProfit, 0)} regular + ${formatCurrency(b2bProfit, 0)} B2B` :
            `${formatCurrency(totalProfit, 2)} ETB total`}
          icon={TrendingUp}
          color={totalProfit >= 0 ? 'green' : 'red'}
        />
        <KPICard
          title="Total Volume"
          value={`${formatCurrency(totalVolume, 2)} kg`}
          subtitle={`${products.length} products`}
          icon={Package}
          color="orange"
        />
      </div>

      {/* Profit Margin Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          Profit Margin Overview
          <InfoTooltip 
            content="Summary of product profitability across your portfolio. Shows how many products are making or losing money, and the average margin per kilogram."
          />
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1 flex items-center justify-center">
              Profitable Products
              <InfoTooltip 
                content="Products with positive margin per kg (selling price exceeds total cost including procurement, operations, and commissions)."
                placement="bottom"
              />
            </p>
            <p className="text-3xl font-bold text-green-600">{profitableCount}</p>
            <p className="text-xs text-gray-500 mt-1">Generating revenue</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1 flex items-center justify-center">
              Losing Products
              <InfoTooltip 
                content="Products with negative margin per kg. These need pricing adjustments, cost reductions, or possibly discontinuation."
                placement="bottom"
              />
            </p>
            <p className="text-3xl font-bold text-red-600">{losingCount}</p>
            <p className="text-xs text-gray-500 mt-1">Needs attention</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1 flex items-center justify-center">
              Avg Margin
              <InfoTooltip 
                content="Average profit per kilogram across all products, weighted by volume. Positive means overall profitability, negative means overall loss."
                placement="bottom"
              />
            </p>
            <p className={`text-3xl font-bold ${getProfitColor(totalVolume > 0 ? totalProfit / totalVolume : 0)}`}>
              {formatCurrency(totalVolume > 0 ? totalProfit / totalVolume : 0, 2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">ETB per kg</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Based on rolling {lookbackDays}-day sales (averaged to weekly volumes).
        </p>
      </div>

      {/* Top Performers and Losses */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Profitable */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b bg-green-50">
            <h3 className="font-semibold text-green-900 flex items-center">
              <TrendingUp size={18} className="mr-2" />
              Top 5 Profitable Products
            </h3>
          </div>
          <div className="p-4">
            {topProfitable.length > 0 ? (
              <div className="space-y-3">
                {topProfitable.map((product, idx) => (
                  <div key={product.product} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-bold text-green-700">#{idx + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900">{product.product}</p>
                        <p className="text-xs text-gray-600">
                          {formatCurrency(product.margin_per_kg)} ETB/kg margin
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        +{formatCurrency(product.weekly_profit, 0)} ETB
                      </p>
                      <p className="text-xs text-gray-600">{formatCurrency(product.weekly_volume_kg, 0)} kg/week</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No profitable products</p>
            )}
          </div>
        </div>

        {/* Top Losses */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b bg-red-50">
            <h3 className="font-semibold text-red-900 flex items-center">
              <AlertTriangle size={18} className="mr-2" />
              Top 5 Loss-Making Products
            </h3>
          </div>
          <div className="p-4">
            {topLosses.length > 0 ? (
              <div className="space-y-3">
                {topLosses.map((product, idx) => (
                  <div key={product.product} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-bold text-red-700">#{idx + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900">{product.product}</p>
                        <p className="text-xs text-gray-600">
                          {formatCurrency(product.margin_per_kg)} ETB/kg margin
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">
                        {formatCurrency(product.weekly_profit, 0)} ETB
                      </p>
                      <p className="text-xs text-gray-600">{formatCurrency(product.weekly_volume_kg, 0)} kg/week</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">All products are profitable!</p>
            )}
          </div>
        </div>
      </div>

      {/* Leader Basket Insights */}
      <LeaderBasketInsights />

      <StapleProductGrid items={stapleSummaries} />

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          Recommended Actions
          <InfoTooltip 
            content="Actionable recommendations based on current profitability data. Click through to relevant sections for detailed analysis and simulation tools."
          />
        </h3>
        <div className="space-y-3">
          {losingCount > 0 && (
            <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="text-red-600 mt-1" size={20} />
              <div className="flex-1">
                <p className="font-semibold text-red-900 flex items-center">
                  Address Loss-Making Products
                  <InfoTooltip 
                    content="Products losing money due to high costs or low prices. Go to Strategy > Competitive Pricing to see recommended price adjustments, or Playground to test scenarios."
                    placement="right"
                  />
                </p>
                <p className="text-sm text-red-700 mt-1">
                  {losingCount} products are losing money. Review pricing and costs in the Strategy section.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <TrendingUp className="text-blue-600 mt-1" size={20} />
            <div className="flex-1">
              <p className="font-semibold text-blue-900 flex items-center">
                Optimize SGL Tiers
                <InfoTooltip 
                  content="Restructure Super Group Leader commission tiers to balance incentives with cost savings. Tier 2 (Pickup Model) can save 4.91 ETB/kg by reducing logistics, packaging, and assistant costs."
                  placement="right"
                />
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Review tier structure to reduce commission costs while maintaining service quality.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <DollarSign className="text-green-600 mt-1" size={20} />
            <div>
              <p className="font-semibold text-green-900">Optimize Operational Costs</p>
              <p className="text-sm text-green-700 mt-1">
                Test cost reduction scenarios in Playground - potential to save 6+ ETB/kg.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

