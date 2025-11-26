import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../utils/apiClient';
import { DataStore } from '../../utils/dataStore';
import { calculateCompetitivePricing, type CompetitivePricingResult } from '../../utils/pricingOptimizer';
import { formatCurrency, formatPercent } from '../../utils/profitabilityCalc';

export const PricingCompetitive: React.FC = () => {
  const [results, setResults] = useState<CompetitivePricingResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPricingRecommendations();
  }, []);

  const loadPricingRecommendations = async () => {
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

      const pricingResults = productCosts.map(product => {
        const localPrice = localShopPrices[product.product_name] || product.selling_price * 1.5;
        const elasticity = elasticities[product.product_name] ?? -1.5;
        const currentVolume = weeklyVolumes[product.product_name] || 0;
        return calculateCompetitivePricing(product, localPrice, elasticity, currentVolume);
      });

      setResults(pricingResults);
    } catch (error) {
      console.error('Failed to load pricing recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Competitive Pricing Strategy</h4>
        <p className="text-sm text-blue-800">
          Find the optimal price that balances profitability (min 5% margin) with competitiveness (max 15% discount from local shops).
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Product</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Current</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Break-Even</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Recommended</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Local Shop</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">New Discount</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Volume Impact</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
              {results.map((result) => {
              const priceChange = result.recommended_price - result.current_price;
              const priceChangePct = (priceChange / result.current_price) * 100;

              return (
                <tr key={result.product} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{result.product}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(result.current_price)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(result.break_even_price)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${priceChange > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(result.recommended_price)}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">
                      ({priceChange >= 0 ? '+' : ''}{formatPercent(priceChangePct)})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(result.local_shop_price)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={result.recommended_discount_pct < -10 ? 'text-green-600' : 'text-gray-600'}>
                      {formatPercent(result.recommended_discount_pct)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={result.expected_volume_change_pct < 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatPercent(result.expected_volume_change_pct)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {result.is_profitable ? (
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Profitable
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        Loss
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="font-semibold mb-3">Summary Insights</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-red-50 rounded">
            <p className="text-gray-600 mb-1">Products Below Break-Even</p>
            <p className="text-2xl font-bold text-red-600">
              {results.filter(r => r.current_price < r.break_even_price).length}
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded">
            <p className="text-gray-600 mb-1">Will Be Profitable</p>
            <p className="text-2xl font-bold text-green-600">
              {results.filter(r => r.is_profitable).length}
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded">
            <p className="text-gray-600 mb-1">Avg Price Increase Needed</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatPercent(
                results.reduce((sum, r) => sum + ((r.recommended_price - r.current_price) / r.current_price * 100), 0) / results.length
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

