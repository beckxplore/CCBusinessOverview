import React from 'react';
import type { ProductProfitability } from '../../types';
import { 
  formatCurrency, 
  formatPercent, 
  getProfitColor, 
  getProfitBgColor 
} from '../../utils/profitabilityCalc';

interface CostWaterfallProps {
  product: ProductProfitability;
}

export const CostWaterfall: React.FC<CostWaterfallProps> = ({ product }) => {
  const maxValue = Math.max(
    product.procurement,
    product.operations,
    product.commission,
    product.selling_price,
    product.total_cost
  );

  const getBarWidth = (value: number) => {
    return `${(value / maxValue) * 100}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">{product.product} - Cost Breakdown</h3>
      
      <div className="space-y-4">
        {/* Procurement */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700">Procurement Cost</span>
            <span className="font-semibold">{formatCurrency(product.procurement)} ETB/kg</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-8">
            <div 
              className="bg-blue-500 h-8 rounded-full flex items-center justify-end pr-3 text-white text-xs font-medium"
              style={{ width: getBarWidth(product.procurement) }}
            >
              {product.procurement > maxValue * 0.15 && `${formatCurrency(product.procurement)} ETB`}
            </div>
          </div>
        </div>

        {/* Operations */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700">Operational Cost</span>
            <span className="font-semibold">{formatCurrency(product.operations)} ETB/kg</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-8">
            <div 
              className="bg-purple-500 h-8 rounded-full flex items-center justify-end pr-3 text-white text-xs font-medium"
              style={{ width: getBarWidth(product.operations) }}
            >
              {product.operations > maxValue * 0.15 && `${formatCurrency(product.operations)} ETB`}
            </div>
          </div>
        </div>

        {/* Commission */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700">SGL Commission</span>
            <span className="font-semibold">{formatCurrency(product.commission)} ETB/kg</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-8">
            <div 
              className="bg-orange-500 h-8 rounded-full flex items-center justify-end pr-3 text-white text-xs font-medium"
              style={{ width: getBarWidth(product.commission) }}
            >
              {product.commission > maxValue * 0.10 && `${formatCurrency(product.commission)} ETB`}
            </div>
          </div>
        </div>

        {/* Total Cost */}
        <div className="pt-2 border-t-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold text-gray-900">Total Cost</span>
            <span className="font-bold text-gray-900">{formatCurrency(product.total_cost)} ETB/kg</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-10">
            <div 
              className="bg-gray-700 h-10 rounded-full flex items-center justify-end pr-3 text-white text-sm font-bold"
              style={{ width: getBarWidth(product.total_cost) }}
            >
              {formatCurrency(product.total_cost)} ETB
            </div>
          </div>
        </div>

        {/* Selling Price */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold text-gray-900">Selling Price</span>
            <span className="font-bold text-gray-900">{formatCurrency(product.selling_price)} ETB/kg</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-10">
            <div 
              className="bg-green-500 h-10 rounded-full flex items-center justify-end pr-3 text-white text-sm font-bold"
              style={{ width: getBarWidth(product.selling_price) }}
            >
              {formatCurrency(product.selling_price)} ETB
            </div>
          </div>
        </div>

        {/* Margin */}
        <div className="pt-2 border-t-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-bold text-gray-900">Margin per KG</span>
            <span className={`font-bold text-lg ${getProfitColor(product.margin_per_kg)}`}>
              {formatCurrency(product.margin_per_kg)} ETB/kg
            </span>
          </div>
          <div className={`p-4 rounded-lg ${getProfitBgColor(product.margin_per_kg)}`}>
            <div className={`text-center font-bold text-xl ${getProfitColor(product.margin_per_kg)}`}>
              {product.margin_per_kg >= 0 ? 'PROFITABLE' : 'LOSING MONEY'}
            </div>
            <div className="text-center text-sm mt-2 text-gray-700">
              {formatPercent(product.margin_pct)} margin
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="pt-4 border-t grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Local Shop Price</p>
            <p className="font-semibold">{formatCurrency(product.local_shop_price)} ETB/kg</p>
          </div>
          <div>
            <p className="text-gray-500">Your Discount</p>
            <p className={`font-semibold ${getProfitColor(product.discount_pct)}`}>
              {formatPercent(product.discount_pct)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Weekly Volume</p>
            <p className="font-semibold">{formatCurrency(product.weekly_volume_kg, 0)} kg</p>
          </div>
          <div>
            <p className="text-gray-500">Weekly Profit/Loss</p>
            <p className={`font-bold ${getProfitColor(product.weekly_profit)}`}>
              {formatCurrency(product.weekly_profit, 0)} ETB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

