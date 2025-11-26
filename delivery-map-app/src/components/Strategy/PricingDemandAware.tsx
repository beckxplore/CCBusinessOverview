import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../utils/apiClient';
import { DataStore } from '../../utils/dataStore';
import { calculateDemandAwarePricing, type DemandAwarePricingResult } from '../../utils/pricingOptimizer';
import { formatCurrency, formatPercent, getProfitColor } from '../../utils/profitabilityCalc';
import { TrendingUp } from 'lucide-react';

export const PricingDemandAware: React.FC = () => {
  const [results, setResults] = useState<DemandAwarePricingResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<DemandAwarePricingResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOptimalPricing();
  }, []);

  const loadOptimalPricing = async () => {
    try {
      setLoading(true);
      
      if (!DataStore.isLoaded()) {
        await DataStore.loadAll();
      }

      const productCosts = DataStore.getProductCosts();
      const localShopPrices = DataStore.getLocalShopPriceMap();
      const weeklyVolumes = DataStore.getWeeklyVolumeMap();

      const elasticityResponse = await ApiClient.getForecastElasticities().catch(() => ({
        elasticities: {} as Record<string, number>
      }));
      const elasticities = elasticityResponse.elasticities || {};

      const pricingResults = productCosts
        .filter(product => elasticities[product.product_name] !== undefined)
        .map(product => {
          const localPrice = localShopPrices[product.product_name] || product.selling_price * 1.5;
          const elasticity = elasticities[product.product_name];
          const volume = weeklyVolumes[product.product_name] || 0;
          return calculateDemandAwarePricing(product, localPrice, elasticity, volume);
        });

      setResults(pricingResults);
      if (pricingResults.length > 0) {
        setSelectedProduct(pricingResults[0]);
      }
    } catch (error) {
      console.error('Failed to load demand-aware pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-2 flex items-center">
          <TrendingUp size={18} className="mr-2" />
          Demand-Aware Pricing (Profit Maximization)
        </h4>
        <p className="text-sm text-green-800">
          Find the price that maximizes total profit by balancing margin per unit with sales volume, using measured demand elasticity.
        </p>
      </div>

      {/* Product Selection */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-2">
          {results.map(result => (
            <button
              key={result.product}
              onClick={() => setSelectedProduct(result)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                selectedProduct?.product === result.product
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {result.product}
            </button>
          ))}
        </div>
      </div>

      {/* Detailed View for Selected Product */}
      {selectedProduct && (
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Current vs Optimal */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="font-semibold mb-4">{selectedProduct.product} - Optimization</h4>
            
            <div className="space-y-4">
              {/* Current State */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium text-gray-700 mb-3">Current State</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-semibold">{formatCurrency(selectedProduct.current_price)} ETB/kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Volume:</span>
                    <span className="font-semibold">{formatCurrency(selectedProduct.current_volume, 0)} kg/week</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-medium">Profit:</span>
                    <span className={`font-bold ${getProfitColor(selectedProduct.current_profit)}`}>
                      {formatCurrency(selectedProduct.current_profit, 0)} ETB/week
                    </span>
                  </div>
                </div>
              </div>

              {/* Optimal State */}
              <div className="p-4 bg-green-50 rounded-lg border-2 border-green-300">
                <h5 className="font-medium text-green-800 mb-3">Optimal State</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Price:</span>
                    <span className="font-semibold text-green-900">
                      {formatCurrency(selectedProduct.optimal_price)} ETB/kg
                      <span className="text-xs ml-1">
                        ({selectedProduct.optimal_price > selectedProduct.current_price ? '+' : ''}
                        {formatPercent(((selectedProduct.optimal_price - selectedProduct.current_price) / selectedProduct.current_price) * 100)})
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Volume:</span>
                    <span className="font-semibold text-green-900">
                      {formatCurrency(selectedProduct.optimal_volume, 0)} kg/week
                      <span className="text-xs ml-1">
                        ({formatPercent(((selectedProduct.optimal_volume - selectedProduct.current_volume) / selectedProduct.current_volume) * 100)})
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-green-300">
                    <span className="font-medium text-gray-900">Profit:</span>
                    <span className="font-bold text-green-700 text-lg">
                      {formatCurrency(selectedProduct.optimal_profit, 0)} ETB/week
                    </span>
                  </div>
                </div>
              </div>

              {/* Improvement */}
              <div className={`p-4 rounded-lg ${selectedProduct.profit_improvement > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Profit Improvement</p>
                  <p className={`text-3xl font-bold ${getProfitColor(selectedProduct.profit_improvement)}`}>
                    {selectedProduct.profit_improvement >= 0 ? '+' : ''}{formatCurrency(selectedProduct.profit_improvement, 0)} ETB
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    ({formatPercent(selectedProduct.profit_improvement_pct)})
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Profit Curve */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="font-semibold mb-4">Profit Curve</h4>
            <p className="text-xs text-gray-500 mb-4">How profit changes with price</p>
            
            <div className="relative h-64 border border-gray-200 rounded">
              <svg className="w-full h-full" viewBox="0 0 400 200">
                {/* Grid lines */}
                <g stroke="#e5e7eb" strokeWidth="1">
                  <line x1="0" y1="100" x2="400" y2="100" />
                  <line x1="0" y1="50" x2="400" y2="50" strokeDasharray="4" />
                  <line x1="0" y1="150" x2="400" y2="150" strokeDasharray="4" />
                </g>

                {/* Profit curve */}
                {selectedProduct.price_points.length > 1 && (() => {
                  const maxProfit = Math.max(...selectedProduct.price_points.map(p => p.profit));
                  const minProfit = Math.min(...selectedProduct.price_points.map(p => p.profit));
                  const profitRange = maxProfit - minProfit;
                  const minPrice = Math.min(...selectedProduct.price_points.map(p => p.price));
                  const maxPrice = Math.max(...selectedProduct.price_points.map(p => p.price));
                  const priceRange = maxPrice - minPrice;

                  const points = selectedProduct.price_points.map((point, i) => {
                    const x = ((point.price - minPrice) / priceRange) * 360 + 20;
                    const y = 180 - (((point.profit - minProfit) / profitRange) * 160 + 10);
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ');

                  const optimalPoint = selectedProduct.price_points.find(p => p.price === selectedProduct.optimal_price);
                  const optimalX = optimalPoint ? ((optimalPoint.price - minPrice) / priceRange) * 360 + 20 : 0;
                  const optimalY = optimalPoint ? 180 - (((optimalPoint.profit - minProfit) / profitRange) * 160 + 10) : 0;

                  return (
                    <>
                      <path d={points} fill="none" stroke="#3b82f6" strokeWidth="2" />
                      {/* Optimal point marker */}
                      {optimalPoint && (
                        <circle cx={optimalX} cy={optimalY} r="5" fill="#10b981" stroke="#fff" strokeWidth="2" />
                      )}
                    </>
                  );
                })()}

                {/* Labels */}
                <text x="200" y="15" textAnchor="middle" fontSize="10" fill="#6b7280">Price vs. Profit</text>
                <text x="10" y="195" fontSize="8" fill="#6b7280">Price →</text>
                <text x="390" y="15" fontSize="8" fill="#6b7280" textAnchor="end">Profit ↑</text>
              </svg>
            </div>

            <div className="mt-4 p-3 bg-green-50 rounded text-center">
              <p className="text-xs text-gray-600 mb-1">Optimal Price Point</p>
              <p className="text-lg font-bold text-green-700">
                {formatCurrency(selectedProduct.optimal_price)} ETB/kg
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Maximizes profit at {formatCurrency(selectedProduct.optimal_profit, 0)} ETB/week
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h4 className="font-semibold">All Products - Optimal Pricing</h4>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Product</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Current Profit</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Optimal Price</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Optimal Profit</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Improvement</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {results.map(result => (
              <tr 
                key={result.product}
                className={`hover:bg-gray-50 cursor-pointer ${selectedProduct?.product === result.product ? 'bg-blue-50' : ''}`}
                onClick={() => setSelectedProduct(result)}
              >
                <td className="px-4 py-3 font-medium text-gray-900">{result.product}</td>
                <td className={`px-4 py-3 text-right ${getProfitColor(result.current_profit)}`}>
                  {formatCurrency(result.current_profit, 0)} ETB
                </td>
                <td className="px-4 py-3 text-right font-semibold text-blue-600">
                  {formatCurrency(result.optimal_price)} ETB/kg
                </td>
                <td className="px-4 py-3 text-right font-semibold text-green-600">
                  {formatCurrency(result.optimal_profit, 0)} ETB
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-bold ${getProfitColor(result.profit_improvement)}`}>
                    {result.profit_improvement >= 0 ? '+' : ''}{formatCurrency(result.profit_improvement, 0)}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    ({formatPercent(result.profit_improvement_pct)})
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 border-t-2">
            <tr className="font-bold">
              <td className="px-4 py-3">TOTAL</td>
              <td className={`px-4 py-3 text-right ${getProfitColor(results.reduce((sum, r) => sum + r.current_profit, 0))}`}>
                {formatCurrency(results.reduce((sum, r) => sum + r.current_profit, 0), 0)} ETB
              </td>
              <td className="px-4 py-3 text-right">-</td>
              <td className="px-4 py-3 text-right font-bold text-green-600">
                {formatCurrency(results.reduce((sum, r) => sum + r.optimal_profit, 0), 0)} ETB
              </td>
              <td className="px-4 py-3 text-right font-bold text-blue-600">
                +{formatCurrency(results.reduce((sum, r) => sum + r.profit_improvement, 0), 0)} ETB
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

