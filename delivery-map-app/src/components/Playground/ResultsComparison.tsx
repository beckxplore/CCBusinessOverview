import React from 'react';
import type { SimulationResult } from '../../types';
import { formatCurrency, formatPercent, getProfitColor } from '../../utils/profitabilityCalc';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

interface ResultsComparisonProps {
  results: SimulationResult | null;
}

export const ResultsComparison: React.FC<ResultsComparisonProps> = ({ results }) => {
  if (!results) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">Adjust scenario parameters to see impact</p>
      </div>
    );
  }

  const { current, scenario, delta } = results;

  return (
    <div className="space-y-6">
      {/* Summary Comparison */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-4">Scenario Impact Summary</h3>
        
        <div className="grid grid-cols-3 gap-6">
          {/* Revenue */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Revenue</p>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(current.total_revenue, 2)} ETB
              </span>
              <ArrowRight size={16} className="text-gray-400" />
              <span className="text-lg font-semibold text-blue-600">
                {formatCurrency(scenario.total_revenue, 2)} ETB
              </span>
            </div>
            <p className={`text-sm font-medium mt-2 ${getProfitColor(delta.revenue_change)}`}>
              {delta.revenue_change >= 0 ? '+' : ''}{formatCurrency(delta.revenue_change, 2)} ETB
            </p>
          </div>

          {/* Cost */}
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Cost</p>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(current.total_cost, 2)} ETB
              </span>
              <ArrowRight size={16} className="text-gray-400" />
              <span className="text-lg font-semibold text-purple-600">
                {formatCurrency(scenario.total_cost, 2)} ETB
              </span>
            </div>
            <p className={`text-sm font-medium mt-2 ${delta.cost_change < 0 ? 'text-green-600' : 'text-red-600'}`}>
              {delta.cost_change >= 0 ? '+' : ''}{formatCurrency(delta.cost_change, 2)} ETB
            </p>
          </div>

          {/* Profit */}
          <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-300">
            <p className="text-sm text-gray-600 mb-2">Profit/Loss</p>
            <div className="flex items-center justify-center space-x-2">
              <span className={`text-lg font-semibold ${getProfitColor(current.total_profit)}`}>
                {formatCurrency(current.total_profit, 2)} ETB
              </span>
              <ArrowRight size={16} className="text-gray-400" />
              <span className={`text-lg font-semibold ${getProfitColor(scenario.total_profit)}`}>
                {formatCurrency(scenario.total_profit, 2)} ETB
              </span>
            </div>
            <p className={`text-lg font-bold mt-2 ${getProfitColor(delta.profit_change)}`}>
              {delta.profit_change >= 0 ? '+' : ''}{formatCurrency(delta.profit_change, 2)} ETB
            </p>
          </div>
        </div>
      </div>

      {/* Product-Level Changes */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Product-Level Impact</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Product</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Current Profit</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Scenario Profit</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Change</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Volume Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {current.products.map((currentProduct, idx) => {
                const scenarioProduct = scenario.products[idx];
                if (!scenarioProduct) return null;

                const profitChange = scenarioProduct.weekly_profit - currentProduct.weekly_profit;
                const volumeChange = scenarioProduct.weekly_volume_kg - currentProduct.weekly_volume_kg;
                const volumeChangePct = currentProduct.weekly_volume_kg > 0
                  ? (volumeChange / currentProduct.weekly_volume_kg) * 100
                  : 0;

                return (
                  <tr key={currentProduct.product} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{currentProduct.product}</td>
                    <td className={`px-4 py-3 text-right ${getProfitColor(currentProduct.weekly_profit)}`}>
                      {formatCurrency(currentProduct.weekly_profit, 0)} ETB
                    </td>
                    <td className={`px-4 py-3 text-right ${getProfitColor(scenarioProduct.weekly_profit)}`}>
                      {formatCurrency(scenarioProduct.weekly_profit, 0)} ETB
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${getProfitColor(profitChange)}`}>
                      {profitChange >= 0 ? '+' : ''}{formatCurrency(profitChange, 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {volumeChange >= 0 ? '+' : ''}{formatCurrency(volumeChange, 0)} kg
                      <span className="text-xs ml-1">({formatPercent(volumeChangePct)})</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-4">Key Insights</h3>
        <div className="space-y-3">
          {delta.profit_change > 0 ? (
            <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <TrendingUp className="text-green-600 mt-1" size={20} />
              <div>
                <p className="font-semibold text-green-900">Profit Improvement</p>
                <p className="text-sm text-green-700 mt-1">
                  This scenario improves weekly profit by {formatCurrency(delta.profit_change, 2)} ETB 
                  ({formatPercent(delta.profit_change_pct)}).
                </p>
              </div>
            </div>
          ) : delta.profit_change < 0 ? (
            <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <TrendingDown className="text-red-600 mt-1" size={20} />
              <div>
                <p className="font-semibold text-red-900">Profit Decrease</p>
                <p className="text-sm text-red-700 mt-1">
                  This scenario reduces weekly profit by {formatCurrency(Math.abs(delta.profit_change), 2)} ETB 
                  ({formatPercent(Math.abs(delta.profit_change_pct))}).
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No change in profit</p>
          )}
        </div>
      </div>
    </div>
  );
};

