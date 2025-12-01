import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../utils/apiClient';
import { DataStore } from '../../utils/dataStore';
import { KPICard } from '../Overview/KPICard';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle,
  DollarSign,
  Calendar,
  CreditCard,
} from 'lucide-react';
import type {
  B2BCustomerProfitability,
  B2BCreditRiskDashboard,
  B2BPaymentBehavior
} from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export const B2BCustomerPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  const [customerProfitability, setCustomerProfitability] = useState<B2BCustomerProfitability | null>(null);
  const [creditRisk, setCreditRisk] = useState<B2BCreditRiskDashboard | null>(null);
  const [paymentBehavior, setPaymentBehavior] = useState<B2BPaymentBehavior | null>(null);

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

      const [profitability, risk, behavior] = await Promise.all([
        ApiClient.getB2BCustomerProfitability(dateFrom, dateTo),
        ApiClient.getB2BCreditRiskDashboard(dateFrom, dateTo),
        ApiClient.getB2BPaymentBehavior(dateFrom, dateTo)
      ]);

      setCustomerProfitability(profitability);
      setCreditRisk(risk);
      setPaymentBehavior(behavior);
    } catch (err) {
      console.error('Failed to load B2B customer data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load B2B customer data');
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

  if (loading && !customerProfitability) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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

      {/* Customer Profitability KPIs */}
      <div className="grid grid-cols-4 gap-6">
        <KPICard
          title="Total Customers"
          value={`${(customerProfitability as any)?.summary?.total_customers_analyzed || (customerProfitability as any)?.top_customers?.length || 0}`}
          subtitle={`${formatCurrency((customerProfitability as any)?.summary?.avg_profit_per_customer, 0)} ETB avg profit`}
          icon={Users}
          color="blue"
        />
        <KPICard
          title="Total Revenue"
          value={`${formatCurrency((customerProfitability as any)?.summary?.total_revenue, 0)} ETB`}
          subtitle={`${formatCurrency((customerProfitability as any)?.summary?.total_profit, 0)} ETB profit`}
          icon={DollarSign}
          color="green"
        />
        <KPICard
          title="Top Customers"
          value={`${(customerProfitability as any)?.top_customers?.length || 0}`}
          subtitle="High value customers"
          icon={TrendingUp}
          color="purple"
        />
        <KPICard
          title="DSO"
          value={`${(paymentBehavior as any)?.dso ? (paymentBehavior as any).dso.toFixed(1) : '—'} days`}
          subtitle="Days Sales Outstanding"
          icon={CreditCard}
          color="orange"
        />
      </div>

      {/* Customer Profitability Table */}
      {(customerProfitability as any)?.top_customers && (customerProfitability as any).top_customers.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="mr-2" size={20} />
            Top Customer Profitability Ranking
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Customer</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                  <th className="px-4 py-2 text-right">Profit</th>
                  <th className="px-4 py-2 text-right">Margin %</th>
                  <th className="px-4 py-2 text-right">Orders</th>
                  <th className="px-4 py-2 text-right">Avg Order Value</th>
                </tr>
              </thead>
              <tbody>
                {(customerProfitability as any).top_customers
                  .slice(0, 20)
                  .map((customer: any, idx: number) => (
                    <tr key={customer.customer_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 font-medium">
                        {customer.customer_name || customer.customer_id}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {customer.customer_type || '—'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(customer.total_revenue, 0)}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-green-600">
                        {formatCurrency(customer.total_profit, 0)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {customer.profit_margin_percent ? `${customer.profit_margin_percent}%` : '—'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {customer.order_count || 0}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(customer.avg_order_value, 0)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Credit Risk Dashboard */}
      {creditRisk && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <AlertTriangle className="mr-2" size={20} />
              Credit Risk Overview
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium">Total Outstanding</span>
                <span className="font-bold">{formatCurrency((creditRisk as any)?.total_outstanding, 0)} ETB</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                <span className="font-medium text-red-700">Overdue Amount</span>
                <span className="font-bold text-red-600">{formatCurrency((creditRisk as any)?.overdue_amount, 0)} ETB</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                <span className="font-medium text-orange-700">Overdue Customers</span>
                <span className="font-bold text-orange-600">{(creditRisk as any)?.overdue_customers || 0}</span>
              </div>
            </div>
          </div>

          {(creditRisk as any)?.credit_stages && (creditRisk as any).credit_stages.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Credit Stages Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={(creditRisk as any).credit_stages}
                    dataKey="amount"
                    nameKey="stage"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ stage, percentage }: any) => `${stage}: ${percentage.toFixed(1)}%`}
                  >
                    {(creditRisk as any).credit_stages.map((_entry: any, index: number) => (
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
      )}

      {creditRisk && (creditRisk as any)?.credit_stages && (creditRisk as any).credit_stages.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Credit Stages Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Stage</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-right">Customers</th>
                  <th className="px-4 py-2 text-right">Percentage</th>
                </tr>
              </thead>
                  <tbody>
                    {(creditRisk as any).credit_stages.map((stage: any, idx: number) => (
                      <tr key={stage.stage} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 font-medium">{stage.stage}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(stage.amount, 0)}</td>
                        <td className="px-4 py-2 text-right">{stage.customer_count}</td>
                        <td className="px-4 py-2 text-right">{formatPercent(stage.percentage)}</td>
                      </tr>
                    ))}
                  </tbody>
            </table>
          </div>
        </div>
      )}

      {creditRisk && (creditRisk as any)?.risk_distribution && (creditRisk as any).risk_distribution.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={(creditRisk as any).risk_distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="risk_level" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value, 0)} />
              <Legend />
              <Bar dataKey="amount" fill="#3b82f6" name="Amount (ETB)" />
              <Bar dataKey="customers" fill="#10b981" name="Customers" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Payment Behavior */}
      {paymentBehavior && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <CreditCard className="mr-2" size={20} />
            Payment Behavior Analysis
          </h3>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Days Sales Outstanding</p>
              <p className="text-2xl font-bold text-blue-600">
                {(paymentBehavior as any)?.dso ? (paymentBehavior as any).dso.toFixed(1) : '—'} days
              </p>
            </div>
            {(paymentBehavior as any)?.trends && (
              <>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Avg Days to Pay</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(paymentBehavior as any).trends.avg_days_to_pay ? (paymentBehavior as any).trends.avg_days_to_pay.toFixed(1) : '—'} days
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">On-Time Rate</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {(paymentBehavior as any).trends.on_time_rate ? formatPercent((paymentBehavior as any).trends.on_time_rate) : '—'}
                  </p>
                </div>
              </>
            )}
          </div>

          {(paymentBehavior as any)?.payment_history && (paymentBehavior as any).payment_history.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment History Trends</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={(paymentBehavior as any).payment_history}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="avg_days_to_pay" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Avg Days to Pay"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="on_time_pct" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="On-Time %"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="overdue_pct" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Overdue %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {(paymentBehavior as any)?.payment_methods && (paymentBehavior as any).payment_methods.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment Methods</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Payment Method</th>
                      <th className="px-4 py-2 text-right">Usage Count</th>
                      <th className="px-4 py-2 text-right">Total Amount</th>
                      <th className="px-4 py-2 text-right">Avg Days to Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(paymentBehavior as any).payment_methods.map((method: any, idx: number) => (
                      <tr key={method.method} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 font-medium">{method.method}</td>
                        <td className="px-4 py-2 text-right">{method.usage_count}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(method.total_amount, 0)}</td>
                        <td className="px-4 py-2 text-right">{method.avg_days_to_pay ? method.avg_days_to_pay.toFixed(1) : '—'} days</td>
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

