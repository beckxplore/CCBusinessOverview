import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../utils/apiClient';
import { KPICard } from '../Overview/KPICard';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Package,
  BarChart3,
  Calendar
} from 'lucide-react';
import type {
  B2BBusinessOverview,
  B2BProfitMarginAnalysis,
  B2BCostStructureAnalysis,
  B2BRevenueTrends,
  B2BCashFlowAnalysis
} from '../../types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export const B2BFinancialPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  const [businessOverview, setBusinessOverview] = useState<B2BBusinessOverview | null>(null);
  const [profitMargin, setProfitMargin] = useState<B2BProfitMarginAnalysis | null>(null);
  const [costStructure, setCostStructure] = useState<B2BCostStructureAnalysis | null>(null);
  const [revenueTrends, setRevenueTrends] = useState<B2BRevenueTrends | null>(null);
  const [cashFlow, setCashFlow] = useState<B2BCashFlowAnalysis | null>(null);

  // Set default date range (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (dateFrom && dateTo) {
      loadB2BData();
    }
  }, [dateFrom, dateTo]);

  const loadB2BData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [overview, margin, costs, trends, flow] = await Promise.all([
        ApiClient.getB2BBusinessOverview(dateFrom, dateTo),
        ApiClient.getB2BProfitMarginAnalysis(dateFrom, dateTo),
        ApiClient.getB2BCostStructureAnalysis(dateFrom, dateTo),
        ApiClient.getB2BRevenueTrends(dateFrom, dateTo, 'day'),
        ApiClient.getB2BCashFlowAnalysis(dateFrom, dateTo)
      ]);

      setBusinessOverview(overview);
      setProfitMargin(margin);
      setCostStructure(costs);
      setRevenueTrends(trends);
      setCashFlow(flow);
    } catch (err) {
      console.error('Failed to load B2B financial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load B2B financial data');
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

  if (loading && !businessOverview) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6 space-y-6">
      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
        <Calendar className="text-gray-500" size={20} />
        <label className="text-sm font-medium text-gray-700">From:</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1 text-sm"
        />
        <label className="text-sm font-medium text-gray-700">To:</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1 text-sm"
        />
        <button
          onClick={loadB2BData}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
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

      {/* Business Overview KPIs */}
      <div className="grid grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value={`${formatCurrency((businessOverview as any)?.overview?.total_revenue, 0)} ETB`}
          subtitle={`${(businessOverview as any)?.overview?.total_orders || 0} orders`}
          icon={DollarSign}
          color="blue"
        />
        <KPICard
          title="Total Profit"
          value={`${formatCurrency((businessOverview as any)?.overview?.total_profit, 0)} ETB`}
          subtitle={`${(businessOverview as any)?.overview?.profit_margin_percent || '—'} margin`}
          icon={TrendingUp}
          color={((businessOverview as any)?.overview?.total_profit || 0) >= 0 ? 'green' : 'red'}
        />
        <KPICard
          title="Total Customers"
          value={`${(businessOverview as any)?.overview?.total_customers || 0}`}
          subtitle={`${formatCurrency((businessOverview as any)?.overview?.avg_order_value, 0)} ETB avg order`}
          icon={Package}
          color="purple"
        />
        <KPICard
          title="Orders"
          value={`${(businessOverview as any)?.overview?.total_orders || 0}`}
          subtitle={`${formatCurrency((businessOverview as any)?.overview?.avg_order_value, 0)} ETB per order`}
          icon={BarChart3}
          color="orange"
        />
      </div>

      {/* Profit Margin Analysis */}
      {profitMargin && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="mr-2" size={20} />
            Profit Margin Analysis (CM1, CM2, CM3)
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">CM1 (Contribution Margin 1)</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency((profitMargin as any)?.margin_breakdown?.cm1_gross_profit?.amount, 0)} ETB</p>
              <p className="text-xs text-gray-500 mt-1">{(profitMargin as any)?.margin_breakdown?.cm1_gross_profit?.percentage || '—'}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">CM2 (Contribution Margin 2)</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency((profitMargin as any)?.margin_breakdown?.cm2_after_warehouse?.amount, 0)} ETB</p>
              <p className="text-xs text-gray-500 mt-1">{(profitMargin as any)?.margin_breakdown?.cm2_after_warehouse?.percentage || '—'}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">CM3 (Contribution Margin 3)</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency((profitMargin as any)?.margin_breakdown?.cm3_net_profit?.amount, 0)} ETB</p>
              <p className="text-xs text-gray-500 mt-1">{(profitMargin as any)?.margin_breakdown?.cm3_net_profit?.percentage || '—'}</p>
            </div>
          </div>
          {(profitMargin as any)?.summary && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Revenue</p>
                  <p className="font-semibold">{formatCurrency((profitMargin as any).summary.total_revenue, 0)} ETB</p>
                </div>
                <div>
                  <p className="text-gray-600">Final Profit</p>
                  <p className="font-semibold">{formatCurrency((profitMargin as any).summary.final_profit, 0)} ETB</p>
                </div>
                <div>
                  <p className="text-gray-600">Final Margin</p>
                  <p className="font-semibold">{(profitMargin as any).summary.final_margin || '—'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cost Structure Analysis */}
      {costStructure && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingDown className="mr-2" size={20} />
            Cost Structure Analysis
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">COGS</span>
                  <span className="font-bold">{formatCurrency((costStructure as any)?.cost_breakdown?.product_cogs?.amount, 0)} ETB</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">Warehouse Costs</span>
                  <span className="font-bold">{formatCurrency((costStructure as any)?.cost_breakdown?.warehouse_handling?.amount, 0)} ETB</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">Delivery Costs</span>
                  <span className="font-bold">{formatCurrency((costStructure as any)?.cost_breakdown?.last_mile_delivery?.amount, 0)} ETB</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded border-2 border-blue-200">
                  <span className="font-semibold">Total Costs</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency((costStructure as any)?.summary?.total_costs, 0)} ETB
                  </span>
                </div>
                {(costStructure as any)?.summary && (
                  <div className="mt-4 p-3 bg-green-50 rounded">
                    <p className="text-sm text-gray-600">Gross Profit</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency((costStructure as any).summary.gross_profit, 0)} ETB
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Margin: {(costStructure as any).summary.gross_margin_percentage || '—'}%
                    </p>
                  </div>
                )}
              </div>
            </div>
            {(costStructure as any)?.cost_breakdown && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Cost Breakdown</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'COGS', value: (costStructure as any).cost_breakdown.product_cogs?.amount || 0 },
                        { name: 'Warehouse', value: (costStructure as any).cost_breakdown.warehouse_handling?.amount || 0 },
                        { name: 'Delivery', value: (costStructure as any).cost_breakdown.last_mile_delivery?.amount || 0 }
                      ].filter(item => item.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value, percent }: any) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {[
                        { name: 'COGS', value: (costStructure as any).cost_breakdown.product_cogs?.amount || 0 },
                        { name: 'Warehouse', value: (costStructure as any).cost_breakdown.warehouse_handling?.amount || 0 },
                        { name: 'Delivery', value: (costStructure as any).cost_breakdown.last_mile_delivery?.amount || 0 }
                      ].filter(item => item.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value, 0)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revenue Trends */}
      {revenueTrends && !(revenueTrends as any).error && (revenueTrends as any).trends && (revenueTrends as any).trends.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="mr-2" size={20} />
            Revenue Trends
          </h3>
          <div className="mb-4 flex items-center gap-4 text-sm text-gray-600">
            <span>Total Revenue: <strong>{formatCurrency((revenueTrends as any).total_revenue, 0)} ETB</strong></span>
            <span>Avg Daily: <strong>{formatCurrency((revenueTrends as any).avg_daily_revenue, 0)} ETB</strong></span>
            {(revenueTrends as any).growth_rate !== undefined && (
              <span>Growth Rate: <strong>{formatPercent((revenueTrends as any).growth_rate)}</strong></span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={(revenueTrends as any).trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value, 0)}
                labelStyle={{ color: '#374151' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Revenue (ETB)"
              />
              {(revenueTrends as any).trends[0]?.orders !== undefined && (
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Orders"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cash Flow Analysis */}
      {cashFlow && !(cashFlow as any).error && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <DollarSign className="mr-2" size={20} />
            Cash Flow Analysis
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Cash In</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency((cashFlow as any)?.cash_in, 0)} ETB</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Cash Out</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency((cashFlow as any)?.cash_out, 0)} ETB</p>
            </div>
            <div className={`p-4 rounded-lg ${(cashFlow as any)?.net_cash_flow && (cashFlow as any).net_cash_flow >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
              <p className="text-sm text-gray-600 mb-1">Net Cash Flow</p>
              <p className={`text-2xl font-bold ${(cashFlow as any)?.net_cash_flow && (cashFlow as any).net_cash_flow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {formatCurrency((cashFlow as any)?.net_cash_flow, 0)} ETB
              </p>
            </div>
          </div>
          {(cashFlow as any)?.by_payment_method && (cashFlow as any).by_payment_method.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">By Payment Method</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Payment Method</th>
                      <th className="px-4 py-2 text-right">Cash In</th>
                      <th className="px-4 py-2 text-right">Cash Out</th>
                      <th className="px-4 py-2 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cashFlow as any).by_payment_method.map((method: any, idx: number) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-2">{method.method}</td>
                        <td className="px-4 py-2 text-right text-green-600">{formatCurrency(method.cash_in, 0)}</td>
                        <td className="px-4 py-2 text-right text-red-600">{formatCurrency(method.cash_out, 0)}</td>
                        <td className="px-4 py-2 text-right font-semibold">{formatCurrency(method.net, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

