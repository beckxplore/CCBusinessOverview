import React from 'react';
import type { FilterOptions, Statistics } from '../types';
import { Search, Filter, SlidersHorizontal, MapPin } from 'lucide-react';

interface MapControlsProps {
  filters: FilterOptions;
  onFilterChange: (filters: Partial<FilterOptions>) => void;
  statistics: Statistics | null;
  onResetMapView?: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({ 
  filters, 
  onFilterChange, 
  statistics,
  onResetMapView
}) => {
  const maxOrders = statistics?.maxOrders || 1000;

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <SlidersHorizontal className="h-5 w-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">🎛️ Map Controls</h2>
      </div>

      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Search className="h-4 w-4 inline mr-1" />
          Search Locations
        </label>
        <input
          type="text"
          value={filters.searchTerm}
          onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
          placeholder="Type location name..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Group Type Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Filter className="h-4 w-4 inline mr-1" />
          Group Type
        </label>
        <select
          value={filters.groupType}
          onChange={(e) => onFilterChange({ groupType: e.target.value as any })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Groups</option>
          <option value="NORMAL_GROUPS">Normal Groups</option>
          <option value="SUPER_GROUPS">Super Groups</option>
        </select>
      </div>

      {/* Order Range Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Order Range
        </label>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Minimum Orders</label>
            <input
              type="range"
              min="0"
              max={maxOrders}
              value={filters.minOrders}
              onChange={(e) => onFilterChange({ minOrders: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span className="font-medium">{filters.minOrders}</span>
              <span>{maxOrders}</span>
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-gray-500 mb-1">Maximum Orders</label>
            <input
              type="range"
              min="0"
              max={maxOrders}
              value={filters.maxOrders}
              onChange={(e) => onFilterChange({ maxOrders: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span className="font-medium">{filters.maxOrders}</span>
              <span>{maxOrders}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Display Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Display Options
        </label>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.showClusters}
              onChange={(e) => onFilterChange({ showClusters: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Show Clusters</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.showHeatmap}
              onChange={(e) => onFilterChange({ showHeatmap: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Show Heatmap</span>
          </label>
        </div>
      </div>

      {/* Quick Filters */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Filters
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onFilterChange({ minOrders: 0, maxOrders: 50 })}
            className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Low Activity
          </button>
          <button
            onClick={() => onFilterChange({ minOrders: 50, maxOrders: 200 })}
            className="px-3 py-2 text-xs bg-yellow-100 hover:bg-yellow-200 rounded-md transition-colors"
          >
            Medium Activity
          </button>
          <button
            onClick={() => onFilterChange({ minOrders: 200, maxOrders: maxOrders })}
            className="px-3 py-2 text-xs bg-green-100 hover:bg-green-200 rounded-md transition-colors"
          >
            High Activity
          </button>
          <button
            onClick={() => onFilterChange({ minOrders: 0, maxOrders: maxOrders, groupType: 'all', searchTerm: '' })}
            className="px-3 py-2 text-xs bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Map Controls */}
      {onResetMapView && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Map Controls
          </label>
          <button
            onClick={onResetMapView}
            className="w-full px-4 py-2 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md transition-colors flex items-center justify-center space-x-2"
          >
            <MapPin className="h-4 w-4" />
            <span>Reset Map View</span>
          </button>
        </div>
      )}

      {/* Current Filter Summary */}
      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Current Filters</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p>Group Type: <span className="font-medium">{filters.groupType === 'all' ? 'All' : filters.groupType}</span></p>
          <p>Order Range: <span className="font-medium">{filters.minOrders} - {filters.maxOrders}</span></p>
          {filters.searchTerm && (
            <p>Search: <span className="font-medium">"{filters.searchTerm}"</span></p>
          )}
        </div>
      </div>
    </div>
  );
};
