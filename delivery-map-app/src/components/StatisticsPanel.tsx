import React from 'react';
import type { Statistics, DeliveryData } from '../types';

interface StatisticsPanelProps {
  statistics: Statistics | null;
  filteredData?: DeliveryData[];
  isDayFilterActive?: boolean;
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ statistics, filteredData = [], isDayFilterActive = false }) => {
  if (!statistics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate Normal Groups metrics
  const normalGroupsData = filteredData.filter(item => item.group_deal_category === 'NORMAL_GROUPS');
  const normalGroupsStats = {
    totalOrders: normalGroupsData.reduce((sum, item) => sum + (item.total_orders || 0), 0),
    totalGroups: normalGroupsData.reduce((sum, item) => sum + (item.total_groups || 0), 0),
    uniqueLeaders: new Set(normalGroupsData.map(item => item.group_created_by)).size,
    totalMembers: normalGroupsData.reduce((sum, item) => sum + (item.unique_group_members || 0), 0)
  };

  // Calculate Super Groups metrics
  const superGroupsData = filteredData.filter(item => item.group_deal_category === 'SUPER_GROUPS');
  const superGroupsStats = {
    totalOrders: superGroupsData.reduce((sum, item) => sum + (item.total_orders || 0), 0),
    totalGroups: superGroupsData.reduce((sum, item) => sum + (item.total_groups || 0), 0),
    uniqueLeaders: new Set(superGroupsData.map(item => item.group_created_by)).size,
    totalMembers: superGroupsData.reduce((sum, item) => sum + (item.unique_group_members || 0), 0)
  };

  return (
    <div className="space-y-4">
      {/* Day Filter Indicator */}
      {isDayFilterActive && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-sm font-medium text-yellow-800">
              Day Filter Active
            </span>
          </div>
          <p className="text-xs text-yellow-700 mt-1">
            Showing only orders from selected days
          </p>
        </div>
      )}

      {/* Normal Groups Dashboard */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">📦 Normal Groups</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-xl font-bold text-blue-900">{normalGroupsStats.totalOrders.toLocaleString()}</div>
            <div className="text-xs text-blue-700">Total Orders</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-900">{normalGroupsStats.totalGroups.toLocaleString()}</div>
            <div className="text-xs text-green-700">Total Groups</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-xl font-bold text-purple-900">{normalGroupsStats.uniqueLeaders.toLocaleString()}</div>
            <div className="text-xs text-purple-700">Group Leaders</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-xl font-bold text-orange-900">{normalGroupsStats.totalMembers.toLocaleString()}</div>
            <div className="text-xs text-orange-700">Active Members</div>
          </div>
        </div>
      </div>

      {/* Super Groups Dashboard */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">🚀 Super Groups</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-xl font-bold text-red-900">{superGroupsStats.totalOrders.toLocaleString()}</div>
            <div className="text-xs text-red-700">Total Orders</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-xl font-bold text-yellow-900">{superGroupsStats.totalGroups.toLocaleString()}</div>
            <div className="text-xs text-yellow-700">Total Groups</div>
          </div>
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <div className="text-xl font-bold text-indigo-900">{superGroupsStats.uniqueLeaders.toLocaleString()}</div>
            <div className="text-xs text-indigo-700">Group Leaders</div>
          </div>
          <div className="text-center p-3 bg-pink-50 rounded-lg">
            <div className="text-xl font-bold text-pink-900">{superGroupsStats.totalMembers.toLocaleString()}</div>
            <div className="text-xs text-pink-700">Active Members</div>
          </div>
        </div>
      </div>

    </div>
  );
};
