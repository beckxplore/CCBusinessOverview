import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../utils/apiClient';
import { DataStore } from '../../utils/dataStore';
import { KPICard } from '../Overview/KPICard';
import { 
  Package, 
  TrendingUp, 
  DollarSign,
  Calendar,
  BarChart3,
} from 'lucide-react';
import type {
  B2BProductProfitAnalysis
} from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Legend } from 'recharts';

// const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export const B2BProductPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [productData, setProductData] = useState<B2BProductProfitAnalysis | null>(null);
  const [sortBy, setSortBy] = useState<'profit' | 'volume' | 'margin' | 'revenue'>('profit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Use global date range from DataStore
  useEffect(() => {
    const updateDates = () => {
      const metricsWindow = DataStore.getMetricsWindow();
      if (metricsWindow && metricsWindow.start && metricsWindow.end) {
        // Only update if dates have changed
        if (dateFrom !== metricsWindow.start || dateTo !== metricsWindow.end) {
          setDateFrom(metricsWindow.start);
          setDateTo(metricsWindow.end);
        }
      } else {
        // Fallback to last 30 days if no global window is set
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const defaultFrom = thirtyDaysAgo.toISOString().split('T')[0];
        const defaultTo = today.toISOString().split('T')[0];
        if (dateFrom !== defaultFrom || dateTo !== defaultTo) {
          setDateFrom(defaultFrom);
          setDateTo(defaultTo);
        }
      }
    };

    updateDates();
    // Check for updates periodically (when global date range changes)
    const interval = setInterval(updateDates, 500); // Check every 500ms for faster sync
    return () => clearInterval(interval);
  }, [dateFrom, dateTo]); // Include dateFrom and dateTo in dependencies

  useEffect(() => {
    if (dateFrom && dateTo) {
      loadB2BData();
    }
  }, [dateFrom, dateTo]);

  const loadB2BData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await ApiClient.getB2BProductProfitAnalysis(dateFrom, dateTo);
      setProductData(data);
    } catch (err) {
      console.error('Failed to load B2B product data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load B2B product data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | undefined | null, decimals: number = 2): string => {
    if (value === undefined || value === null || isNaN(value)) return '—';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  };

  const formatPercent = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) return '—';
    return `${value.toFixed(1)}%`;
  };

  const handleSort = (field: 'profit' | 'volume' | 'margin' | 'revenue') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortedProducts = () => {
    if (!productData?.products) return [];
    
    const sorted = [...productData.products].sort((a, b) => {
      let aVal: number, bVal: number;
      
      switch (sortBy) {
        case 'profit':
          aVal = a.total_profit;
          bVal = b.total_profit;
          break;
        case 'volume':
          aVal = a.total_quantity_kg;
          bVal = b.total_quantity_kg;
          break;
        case 'margin':
          aVal = a.profit_margin_percent;
          bVal = b.profit_margin_percent;
          break;
        case 'revenue':
          aVal = a.total_revenue;
          bVal = b.total_revenue;
          break;
        default:
          return 0;
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return sorted;
  };

  if (loading && !productData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const sortedProducts = getSortedProducts();
  const top10ByProfit = sortedProducts.slice(0, 10);
  const top10ByVolume = [...(productData?.products || [])]
    .sort((a, b) => b.total_quantity_kg - a.total_quantity_kg)
    .slice(0, 10);

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6 space-y-6">
      {/* Date Range Display (read-only, controlled by Overview page) */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
        <Calendar className="text-gray-500" size={20} />
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={dateFrom}
              readOnly
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={dateTo}
              readOnly
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
            />
          </div>
          <span className="text-xs text-gray-500 ml-auto">
            Date range controlled by Overview page
          </span>
        </div>
        <button
          onClick={loadB2BData}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-semibold">Error loading data</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {productData?.error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          <p className="font-semibold">Data Limitation</p>
          <p className="text-sm">{productData.error}</p>
        </div>
      )}

      {/* Summary KPIs */}
      {productData?.summary && (
        <div className="grid grid-cols-4 gap-6">
          <KPICard
            title="Total Products"
            value={`${productData.summary.total_products}`}
            subtitle="Products analyzed"
            icon={Package}
            color="blue"
          />
          <KPICard
            title="Total Revenue"
            value={`${formatCurrency(productData.summary.total_revenue, 0)} ETB`}
            subtitle="Total revenue"
            icon={DollarSign}
            color="green"
          />
          <KPICard
            title="Total Profit"
            value={`${formatCurrency(productData.summary.total_profit, 0)} ETB`}
            subtitle={`${formatPercent(productData.summary.avg_profit_margin)} avg margin`}
            icon={TrendingUp}
            color={productData.summary.total_profit >= 0 ? 'green' : 'red'}
          />
          <KPICard
            title="Avg Margin"
            value={formatPercent(productData.summary.avg_profit_margin)}
            subtitle="Average profit margin"
            icon={BarChart3}
            color="purple"
          />
        </div>
      )}

      {/* Charts */}
      {productData && productData.products.length > 0 && (
        <div className="grid grid-cols-2 gap-6">
          {/* Top 10 by Profit */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="mr-2" size={20} />
              Top 10 Products by Profit
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10ByProfit}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="product_name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value, 0)}
                  labelStyle={{ color: '#374151' }}
                />
                <Legend />
                <Bar dataKey="total_profit" fill="#10b981" name="Profit (ETB)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top 10 by Volume */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Package className="mr-2" size={20} />
              Top 10 Products by Volume
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10ByVolume}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="product_name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value, 2)}
                  labelStyle={{ color: '#374151' }}
                />
                <Legend />
                <Bar dataKey="total_quantity_kg" fill="#3b82f6" name="Volume (kg)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Profit vs Volume Scatter */}
      {productData && productData.products.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="mr-2" size={20} />
            Profit vs Volume Analysis
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="total_quantity_kg" 
                name="Volume (kg)"
                label={{ value: 'Volume (kg)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                type="number" 
                dataKey="total_profit" 
                name="Profit (ETB)"
                label={{ value: 'Profit (ETB)', angle: -90, position: 'insideLeft' }}
              />
              <ZAxis type="number" dataKey="profit_margin_percent" range={[50, 400]} name="Margin %" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value: number, name: string) => {
                  if (name === 'Margin %') return `${value.toFixed(1)}%`;
                  return formatCurrency(value, 0);
                }}
                labelFormatter={(label) => `Volume: ${formatCurrency(label, 2)} kg`}
              />
              <Legend />
              <Scatter name="Products" data={productData.products} fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Product Table */}
      {productData && productData.products.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Package className="mr-2" size={20} />
            Product Profitability Details
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('revenue')}
                  >
                    Product Name
                    {sortBy === 'revenue' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                  <th 
                    className="px-4 py-2 text-right cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('revenue')}
                  >
                    Revenue
                    {sortBy === 'revenue' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                  <th 
                    className="px-4 py-2 text-right cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('volume')}
                  >
                    Volume (kg)
                    {sortBy === 'volume' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                  <th className="px-4 py-2 text-right">Orders</th>
                  <th className="px-4 py-2 text-right">Purchase Price</th>
                  <th className="px-4 py-2 text-right">COGS</th>
                  <th className="px-4 py-2 text-right">Warehouse</th>
                  <th className="px-4 py-2 text-right">Delivery</th>
                  <th 
                    className="px-4 py-2 text-right cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('profit')}
                  >
                    Profit
                    {sortBy === 'profit' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                  <th 
                    className="px-4 py-2 text-right cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('margin')}
                  >
                    Margin %
                    {sortBy === 'margin' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                  <th className="px-4 py-2 text-right">Profit/kg</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((product, idx) => (
                  <tr key={product.product_name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 font-medium">{product.product_name}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(product.total_revenue, 0)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(product.total_quantity_kg, 2)}</td>
                    <td className="px-4 py-2 text-right">{product.total_orders}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(product.purchase_price_used, 2)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(product.total_cogs, 0)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(product.warehouse_costs, 0)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(product.delivery_costs, 0)}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${product.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(product.total_profit, 0)}
                    </td>
                    <td className="px-4 py-2 text-right">{formatPercent(product.profit_margin_percent)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(product.profit_per_kg, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {productData && productData.products.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          <p>No product data available for the selected date range.</p>
        </div>
      )}
    </div>
  );
};

