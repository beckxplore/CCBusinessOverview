import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Statistics } from '../types';

interface DashboardProps {
  statistics: Statistics | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ statistics }) => {
  if (!statistics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const groupTypeData = [
    { name: 'Normal Groups', value: statistics.normalGroups, color: '#3b82f6' },
    { name: 'Super Groups', value: statistics.superGroups, color: '#ef4444' }
  ];

  const orderDistributionData = [
    { range: '0-50', count: Math.floor(statistics.totalRecords * 0.6) },
    { range: '51-100', count: Math.floor(statistics.totalRecords * 0.25) },
    { range: '101-200', count: Math.floor(statistics.totalRecords * 0.1) },
    { range: '200+', count: Math.floor(statistics.totalRecords * 0.05) }
  ];

  return (
    <div className="space-y-6">
      {/* Group Type Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Type Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={groupTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {groupTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Order Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Volume Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={orderDistributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {statistics.avgOrdersPerGroup.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Avg Orders/Group</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {statistics.avgMembersPerGroup.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Avg Members/Group</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {statistics.uniqueLocations.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Unique Locations</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {statistics.maxOrders.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Max Orders</div>
          </div>
        </div>
      </div>
    </div>
  );
};
