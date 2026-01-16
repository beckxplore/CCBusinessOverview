/**
 * Price Forecasting Tab for Profitability Page
 * 
 * Displays price forecasts for products using:
 * - 15-year seasonality data
 * - Market-specific adjustments (holidays, paydays, supply)
 * - Confidence intervals
 * - Recommendations (BUY/WAIT/HOLD)
 */

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../utils/apiClient';
import { TrendingUp, TrendingDown, AlertTriangle, Info, Calendar, DollarSign } from 'lucide-react';
import { InfoTooltip } from '../Common/InfoTooltip';

interface PriceForecast {
  product: string;
  current_price: number;
  current_date: string;
  base_forecast: {
    method: string;
    predicted_price: number;
    percent_change: number;
    seasonality_ratio: number;
    confidence: string;
  };
  adjusted_forecast: {
    predicted_price: number;
    percent_change: number;
    adjustments?: {
      holiday?: number;
      payday?: number;
      supply?: number;
      volatility?: number;
      total?: number;
    };
  };
  confidence_intervals: {
    '50%': [number, number];
    '80%': [number, number];
    '95%': [number, number];
  };
  recommendation: {
    action: string;
    sentiment: string;
    urgency: string;
    color_code: string;
    reasoning: string;
    percent_change: number;
  };
  multi_horizon?: {
    '1_month'?: {
      predicted_price: number;
      percent_change: number;
      recommendation: string;
      target_month_name: string;
    };
    '2_month'?: {
      predicted_price: number;
      percent_change: number;
      recommendation: string;
      target_month_name: string;
    };
    '3_month'?: {
      predicted_price: number;
      percent_change: number;
      recommendation: string;
      target_month_name: string;
    };
  };
  weekly_forecast?: Array<{
    week: number;
    week_start_date: string;
    predicted_price: number;
    percent_change: number;
    week_over_week_change: number;
    recommendation: string;
    month: number;
    month_name: string;
  }>;
  risk_indicators: {
    volatility_level: string;
    manipulation_risk: number;
    supply_risk: number;
    holiday_impact: number;
  };
}

interface PriceForecastTabProps {
  products: Array<{ product_name: string; latest_selling_price?: number }>;
}

export const PriceForecastTab: React.FC<PriceForecastTabProps> = ({ products }) => {
  const [loading, setLoading] = useState(true);
  const [forecasts, setForecasts] = useState<Record<string, PriceForecast>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [forecastDate, setForecastDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [forecastHorizon, setForecastHorizon] = useState<number>(30);
  const [productPrices, setProductPrices] = useState<Record<string, number>>({});

  // Load product prices from API
  useEffect(() => {
    const loadProductPrices = async () => {
      try {
        // Try to get prices from product costs API
        const costsResponse = await ApiClient.getProductCosts();
        const pricesMap: Record<string, number> = {};
        
        costsResponse.products.forEach((cost: any) => {
          if (cost.selling_price && cost.selling_price > 0) {
            pricesMap[cost.product_name] = cost.selling_price;
          }
        });
        
        // Also try local shop prices as fallback
        try {
          const localPricesResponse = await ApiClient.getLocalShopPrices();
          localPricesResponse.prices.forEach((price: any) => {
            if (price.price && price.price > 0 && !pricesMap[price.product_name]) {
              pricesMap[price.product_name] = price.price;
            }
          });
        } catch (e) {
          // Ignore local prices errors
        }
        
        setProductPrices(pricesMap);
      } catch (err) {
        console.warn('Failed to load product prices:', err);
      }
    };
    
    loadProductPrices();
  }, []);

  useEffect(() => {
    loadForecasts();
  }, [forecastDate, forecastHorizon, productPrices]);

  const loadForecasts = async () => {
    if (products.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const forecastPromises = products.map(async (product) => {
        // Try multiple sources for price
        let currentPrice = product.latest_selling_price || 0;
        
        // Fallback to product prices from API
        if (currentPrice <= 0 && productPrices[product.product_name]) {
          currentPrice = productPrices[product.product_name];
        }
        
        // Fallback: For products with seasonality data, use a reasonable default price
        // This allows testing even when prices aren't available in profitability data
        const seasonalityProducts = ['Red Onion', 'Tomato', 'Potato', 'Avocado', 'Banana'];
        if (currentPrice <= 0 && seasonalityProducts.includes(product.product_name)) {
          // Use default prices for known products (for testing)
          const defaultPrices: Record<string, number> = {
            'Red Onion': 80.0,
            'Tomato': 50.0,
            'Potato': 30.0,
            'Avocado': 100.0,
            'Banana': 25.0
          };
          currentPrice = defaultPrices[product.product_name] || 0;
        }
        
        // If still no price, skip this product
        if (currentPrice <= 0) {
          return null;
        }

        try {
          const result = await ApiClient.getPriceForecast(
            product.product_name,
            currentPrice,
            forecastDate,
            forecastHorizon,
            true // include adjustments
          );
          
          // Handle API response structure
          if (result.error) {
            console.warn(`Forecast error for ${product.product_name}:`, result.error);
            return null;
          }
          
          const forecast = result.forecast;
          if (!forecast) {
            return null;
          }
          
          return { productName: product.product_name, forecast };
        } catch (err: any) {
          console.warn(`Failed to get forecast for ${product.product_name}:`, err);
          return null;
        }
      });

      const results = await Promise.all(forecastPromises);
      const forecastMap: Record<string, PriceForecast> = {};

      results.forEach((result) => {
        if (result && result.forecast && !result.forecast.error) {
          forecastMap[result.productName] = result.forecast as PriceForecast;
        }
      });

      setForecasts(forecastMap);
      
      // Auto-select first product with forecast
      if (!selectedProduct && Object.keys(forecastMap).length > 0) {
        setSelectedProduct(Object.keys(forecastMap)[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load price forecasts');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (action: string) => {
    switch (action) {
      case 'BUY NOW':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'WAIT / DE-STOCK':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'HOLD':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

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

  const forecastProducts = Object.keys(forecasts);
  const selectedForecast = selectedProduct ? forecasts[selectedProduct] : null;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <TrendingUp className="mr-2" size={24} />
            Price Forecasting
            <InfoTooltip
              content="Price forecasts based on 15-year seasonality data combined with market-specific factors (holidays, paydays, supply signals). Forecasts include confidence intervals and actionable recommendations."
            />
          </h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar size={16} className="text-gray-500" />
              <input
                type="date"
                value={forecastDate}
                onChange={(e) => setForecastDate(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Horizon:</span>
              <select
                value={forecastHorizon}
                onChange={(e) => setForecastHorizon(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>
        </div>

        {forecastProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No price forecasts available.</p>
            <p className="text-sm mt-2">Ensure products have current prices set.</p>
          </div>
        )}
      </div>

      {forecastProducts.length > 0 && (
        <>
          {/* Product List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Products</h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {forecastProducts.map((productName) => {
                const forecast = forecasts[productName];
                if (!forecast) return null;
                const isSelected = selectedProduct === productName;
                const rec = forecast.recommendation || {};

                return (
                  <button
                    key={productName}
                    onClick={() => setSelectedProduct(productName)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{productName}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Current: {forecast.current_price.toFixed(2)} ETB
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getRecommendationColor(rec.action || 'HOLD')}`}>
                          {rec.action || 'HOLD'}
                        </div>
                        <div className={`text-sm font-semibold ${(rec.percent_change || 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {(rec.percent_change || 0) >= 0 ? '+' : ''}{((rec.percent_change || 0)).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Forecast View */}
          {selectedForecast && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Main Forecast Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Forecast Details: {selectedProduct}
                </h3>

                {/* Current Price */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Current Price</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {selectedForecast.current_price.toFixed(2)} ETB
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Date: {new Date(selectedForecast.current_date).toLocaleDateString()}
                  </div>
                </div>

                {/* Base Forecast */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-blue-900">Base Forecast (Seasonality)</div>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {selectedForecast.base_forecast.confidence} Confidence
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 mt-2">
                    {selectedForecast.base_forecast.predicted_price.toFixed(2)} ETB
                  </div>
                  <div className={`text-sm font-semibold mt-1 ${
                    selectedForecast.base_forecast.percent_change >= 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {selectedForecast.base_forecast.percent_change >= 0 ? '+' : ''}
                    {selectedForecast.base_forecast.percent_change.toFixed(1)}%
                  </div>
                  <div className="text-xs text-blue-700 mt-2">
                    Based on 15-year seasonality pattern
                  </div>
                </div>

                {/* Adjusted Forecast */}
                <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-sm font-medium text-purple-900 mb-2">
                    Adjusted Forecast (With Market Factors)
                  </div>
                  <div className="text-2xl font-bold text-purple-900 mt-2">
                    {selectedForecast.adjusted_forecast.predicted_price.toFixed(2)} ETB
                  </div>
                  <div className={`text-sm font-semibold mt-1 ${
                    selectedForecast.adjusted_forecast.percent_change >= 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {selectedForecast.adjusted_forecast.percent_change >= 0 ? '+' : ''}
                    {selectedForecast.adjusted_forecast.percent_change.toFixed(1)}%
                  </div>
                  
                  {selectedForecast.adjusted_forecast.adjustments && (
                    <div className="mt-3 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-purple-700">Holiday impact:</span>
                        <span className="font-medium">
                          {((selectedForecast.adjusted_forecast.adjustments.holiday || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">Payday risk:</span>
                        <span className="font-medium">
                          {((selectedForecast.adjusted_forecast.adjustments.payday || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">Supply signal:</span>
                        <span className="font-medium">
                          {((selectedForecast.adjusted_forecast.adjustments.supply || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommendation */}
                <div className={`p-4 rounded-lg border-2 ${getRecommendationColor(selectedForecast.recommendation.action)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-lg">
                      {selectedForecast.recommendation.action}
                    </div>
                    <div className={`text-sm font-medium ${
                      selectedForecast.recommendation.urgency === 'High' ? 'text-red-600' :
                      selectedForecast.recommendation.urgency === 'Medium' ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {selectedForecast.recommendation.urgency} Urgency
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 mt-2">
                    {selectedForecast.recommendation.reasoning}
                  </div>
                </div>
              </div>

              {/* Confidence Intervals & Risk Indicators */}
              <div className="space-y-6">
                {/* Confidence Intervals */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Info size={20} className="mr-2" />
                    Confidence Intervals
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded border">
                      <div className="text-sm text-gray-600 mb-1">50% Confidence</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {selectedForecast.confidence_intervals['50%'][0].toFixed(2)} - {selectedForecast.confidence_intervals['50%'][1].toFixed(2)} ETB
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Most likely range</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded border">
                      <div className="text-sm text-gray-600 mb-1">80% Confidence</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {selectedForecast.confidence_intervals['80%'][0].toFixed(2)} - {selectedForecast.confidence_intervals['80%'][1].toFixed(2)} ETB
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Probable range</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded border">
                      <div className="text-sm text-gray-600 mb-1">95% Confidence</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {selectedForecast.confidence_intervals['95%'][0].toFixed(2)} - {selectedForecast.confidence_intervals['95%'][1].toFixed(2)} ETB
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Possible range</div>
                    </div>
                  </div>
                </div>

                {/* Risk Indicators */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <AlertTriangle size={20} className="mr-2" />
                    Risk Indicators
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Volatility Level</span>
                      <span className={`text-sm font-semibold ${getRiskLevelColor(selectedForecast.risk_indicators.volatility_level)}`}>
                        {selectedForecast.risk_indicators.volatility_level.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Manipulation Risk</span>
                      <span className={`text-sm font-semibold ${
                        selectedForecast.risk_indicators.manipulation_risk > 0.5 ? 'text-red-600' :
                        selectedForecast.risk_indicators.manipulation_risk > 0.3 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {(selectedForecast.risk_indicators.manipulation_risk * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Supply Risk</span>
                      <span className={`text-sm font-semibold ${
                        selectedForecast.risk_indicators.supply_risk > 0.5 ? 'text-red-600' :
                        selectedForecast.risk_indicators.supply_risk > 0.3 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {(selectedForecast.risk_indicators.supply_risk * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Holiday Impact</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {selectedForecast.risk_indicators.holiday_impact > 0 ? '+' : ''}
                        {(selectedForecast.risk_indicators.holiday_impact * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6-Week Weekly Forecast */}
                {selectedForecast.weekly_forecast && selectedForecast.weekly_forecast.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Calendar size={20} className="mr-2" />
                      6-Week Weekly Forecast
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Week
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Predicted Price
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Change from Current
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Week-over-Week
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Recommendation
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedForecast.weekly_forecast.map((week, index) => {
                            const weekDate = new Date(week.week_start_date);
                            const isFirstWeek = index === 0;
                            return (
                              <tr key={week.week} className={isFirstWeek ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="text-sm font-medium text-gray-900">Week {week.week}</span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </div>
                                  <div className="text-xs text-gray-500">{week.month_name}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-semibold text-gray-900">
                                    {week.predicted_price.toFixed(2)} ETB
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className={`text-sm font-semibold ${
                                    week.percent_change >= 0 ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {week.percent_change >= 0 ? '+' : ''}{week.percent_change.toFixed(1)}%
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className={`text-sm ${
                                    week.week_over_week_change >= 0 ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {week.week_over_week_change >= 0 ? '+' : ''}{week.week_over_week_change.toFixed(1)}%
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    week.recommendation === 'BUY' ? 'bg-red-100 text-red-800' :
                                    week.recommendation === 'WAIT' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {week.recommendation}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      <p>Forecasts based on 15-year seasonality patterns. Week-over-week change shows price movement from the previous week.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

