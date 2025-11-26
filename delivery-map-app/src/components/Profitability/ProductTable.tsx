import React, { useState } from 'react';
import type { ProductProfitability } from '../../types';
import { formatCurrency, formatPercent, getProfitColor, getProfitBgColor } from '../../utils/profitabilityCalc';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface ProductTableProps {
  products: ProductProfitability[];
  onProductSelect: (_product: ProductProfitability) => void;
  selectedProduct: string | null;
}

export const ProductTable: React.FC<ProductTableProps> = ({ products, onProductSelect, selectedProduct }) => {
  const [sortBy, setSortBy] = useState<keyof ProductProfitability>('weekly_profit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: keyof ProductProfitability) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * multiplier;
    }
    return 0;
  });

  const SortIcon = ({ column }: { column: keyof ProductProfitability }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />;
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Product Profitability</h3>
        <p className="text-xs text-gray-500 mt-1">Click product to see detailed breakdown</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('product')}>
                <div className="flex items-center space-x-1">
                  <span>Product</span>
                  <SortIcon column="product" />
                </div>
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('margin_per_kg')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Margin/kg</span>
                  <SortIcon column="margin_per_kg" />
                </div>
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('margin_pct')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Margin %</span>
                  <SortIcon column="margin_pct" />
                </div>
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('weekly_volume_kg')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Volume (kg)</span>
                  <SortIcon column="weekly_volume_kg" />
                </div>
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('weekly_profit')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Weekly Profit</span>
                  <SortIcon column="weekly_profit" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedProducts.map((product) => (
              <tr
                key={product.product}
                className={`cursor-pointer transition-colors ${
                  selectedProduct === product.product 
                    ? 'bg-blue-50' 
                    : 'hover:bg-gray-50'
                } ${getProfitBgColor(product.margin_per_kg)}`}
                onClick={() => onProductSelect(product)}
              >
                <td className="px-4 py-3 font-medium text-gray-900">{product.product}</td>
                <td className={`px-4 py-3 text-right font-semibold ${getProfitColor(product.margin_per_kg)}`}>
                  {formatCurrency(product.margin_per_kg)} ETB
                </td>
                <td className={`px-4 py-3 text-right ${getProfitColor(product.margin_pct)}`}>
                  {formatPercent(product.margin_pct)}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {formatCurrency(product.weekly_volume_kg, 0)}
                </td>
                <td className={`px-4 py-3 text-right font-bold ${getProfitColor(product.weekly_profit)}`}>
                  {formatCurrency(product.weekly_profit, 0)} ETB
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 border-t-2">
            <tr className="font-bold">
              <td className="px-4 py-3">TOTAL</td>
              <td className="px-4 py-3 text-right">-</td>
              <td className="px-4 py-3 text-right">-</td>
              <td className="px-4 py-3 text-right">
                {formatCurrency(products.reduce((sum, p) => sum + p.weekly_volume_kg, 0), 0)}
              </td>
              <td className={`px-4 py-3 text-right ${getProfitColor(products.reduce((sum, p) => sum + p.weekly_profit, 0))}`}>
                {formatCurrency(products.reduce((sum, p) => sum + p.weekly_profit, 0), 0)} ETB
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

