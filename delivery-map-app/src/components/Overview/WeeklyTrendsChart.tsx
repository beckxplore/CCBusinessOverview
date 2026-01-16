import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ApiClient } from '../../utils/apiClient';
import type { WeeklyTrendsResponse } from '../../types';
import { formatCurrency } from '../../utils/profitabilityCalc';
import { TrendingUp } from 'lucide-react';

export const WeeklyTrendsChart: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WeeklyTrendsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrends();
  }, []);

  const loadTrends = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiClient.getWeeklyTrends(8); // Get last 8 weeks
      setData(response);
    } catch (err: any) {
      const errorMessage = err?.message?.includes('404') || err?.message?.includes('HTTP error! status: 404')
        ? 'Weekly trends endpoint not available. Please restart the backend server.'
        : (err instanceof Error ? err.message : 'Failed to load weekly trends');
      setError(errorMessage);
      console.error('Error loading weekly trends:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
          <TrendingUp className="mr-2" size={18} />
          Weekly Trends Overview
        </h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-2">
          <p className="text-yellow-800 text-sm">{error}</p>
          <p className="text-yellow-700 text-xs mt-1">The backend server may need to be restarted to load the new endpoint.</p>
        </div>
      </div>
    );
  }

  if (!data || data.weekly_trends.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
          <TrendingUp className="mr-2" size={18} />
          Weekly Trends Overview
        </h3>
        <div className="text-center py-8 text-gray-500 text-sm">
          <p>No weekly trend data available.</p>
        </div>
      </div>
    );
  }

  // Format data for chart
  const chartData = data.weekly_trends.map(trend => ({
    week: trend.week_label,
    revenue: trend.revenue,
    purchase_cost: trend.purchase_cost,
    operational_cost: trend.operational_cost
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
        <TrendingUp className="mr-2" size={18} />
        Weekly Trends Overview
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Showing purchase cost, revenue, and operational cost trends over the last {data.count} weeks
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="week" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value, 0)}
          />
          <Tooltip 
            formatter={(value: number) => formatCurrency(value, 2)}
            labelStyle={{ color: '#374151' }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="#3b82f6" 
            strokeWidth={2}
            name="Revenue (ETB)"
            dot={{ r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="purchase_cost" 
            stroke="#10b981" 
            strokeWidth={2}
            name="Purchase Cost (ETB)"
            dot={{ r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="operational_cost" 
            stroke="#f59e0b" 
            strokeWidth={2}
            name="Operational Cost (ETB)"
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

