import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../utils/apiClient';
import type { DailyOperationalCostsResponse } from '../../types';
import { DateRangePicker } from '../DateRangePicker';
import { Calendar, TrendingUp, Warehouse, Package, Truck } from 'lucide-react';

export const DailyOperationalCosts: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DailyOperationalCostsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    // Set default date range to last 7 days starting from Nov 10, 2025 (earliest operational cost data)
    const today = new Date();
    const minDate = new Date('2025-11-10'); // Earliest date with operational cost data
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // 7 days inclusive
    const defaultFrom = sevenDaysAgo < minDate 
      ? '2025-11-10' 
      : sevenDaysAgo.toISOString().split('T')[0];
    const defaultTo = today.toISOString().split('T')[0];
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
  }, []);

  useEffect(() => {
    if (dateFrom && dateTo) {
      loadDailyCosts();
    }
  }, [dateFrom, dateTo]);

  const loadDailyCosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiClient.getDailyOperationalCosts(dateFrom, dateTo);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load daily operational costs');
      console.error('Error loading daily operational costs:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(2)} ETB/kg`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Calculate averages
  const calculateAverages = () => {
    if (!data || !data.daily_costs.length) return null;

    const costs = data.daily_costs;
    const warehouse = costs
      .map(c => c.warehouse_cost_per_kg)
      .filter((v): v is number => v !== null);
    const fulfilment = costs
      .map(c => c.fulfilment_cost_per_kg)
      .filter((v): v is number => v !== null);
    const lastMile = costs
      .map(c => c.last_mile_cost_per_kg)
      .filter((v): v is number => v !== null);

    return {
      warehouse: warehouse.length > 0 ? warehouse.reduce((a, b) => a + b, 0) / warehouse.length : null,
      fulfilment: fulfilment.length > 0 ? fulfilment.reduce((a, b) => a + b, 0) / fulfilment.length : null,
      lastMile: lastMile.length > 0 ? lastMile.reduce((a, b) => a + b, 0) / lastMile.length : null,
      total: 
        (warehouse.length > 0 ? warehouse.reduce((a, b) => a + b, 0) / warehouse.length : 0) +
        (fulfilment.length > 0 ? fulfilment.reduce((a, b) => a + b, 0) / fulfilment.length : 0) +
        (lastMile.length > 0 ? lastMile.reduce((a, b) => a + b, 0) / lastMile.length : 0)
    };
  };

  const averages = calculateAverages();

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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Daily Operational Costs</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">Daily Operational Costs</h2>
        </div>
          <DateRangePicker
            fromDate={dateFrom}
            toDate={dateTo}
            onFromDateChange={setDateFrom}
            onToDateChange={setDateTo}
            minDate="2025-11-10"
          />
      </div>

      {data && data.daily_costs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No operational cost data available for the selected date range.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {averages && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Warehouse className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-medium text-blue-900">Warehouse</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {averages.warehouse !== null ? `${averages.warehouse.toFixed(2)}` : 'N/A'}
                </p>
                <p className="text-xs text-blue-700 mt-1">ETB/kg (avg)</p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-green-600" />
                  <h3 className="text-sm font-medium text-green-900">Fulfilment</h3>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {averages.fulfilment !== null ? `${averages.fulfilment.toFixed(2)}` : 'N/A'}
                </p>
                <p className="text-xs text-green-700 mt-1">ETB/kg (avg)</p>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-orange-600" />
                  <h3 className="text-sm font-medium text-orange-900">Last Mile</h3>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  {averages.lastMile !== null ? `${averages.lastMile.toFixed(2)}` : 'N/A'}
                </p>
                <p className="text-xs text-orange-700 mt-1">ETB/kg (avg)</p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-medium text-purple-900">Total</h3>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {averages.total.toFixed(2)}
                </p>
                <p className="text-xs text-purple-700 mt-1">ETB/kg (avg)</p>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Warehouse Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fulfilment Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Mile Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cost
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.daily_costs.map((cost, index) => {
                  const total =
                    (cost.warehouse_cost_per_kg ?? 0) +
                    (cost.fulfilment_cost_per_kg ?? 0) +
                    (cost.last_mile_cost_per_kg ?? 0);
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatDate(cost.date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatCurrency(cost.warehouse_cost_per_kg)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatCurrency(cost.fulfilment_cost_per_kg)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatCurrency(cost.last_mile_cost_per_kg)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data && data.date_range && (
            <div className="mt-4 text-sm text-gray-500">
              Showing {data.count} day{data.count !== 1 ? 's' : ''} from{' '}
              {data.date_range.from && formatDate(data.date_range.from)} to{' '}
              {data.date_range.to && formatDate(data.date_range.to)}
            </div>
          )}
        </>
      )}
    </div>
  );
};

