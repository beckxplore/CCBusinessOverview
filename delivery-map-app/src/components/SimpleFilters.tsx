import React from 'react';
import type { FilterOptions } from '../types';

interface SimpleFiltersProps {
  filters: FilterOptions;
  onFilterChange: (filters: Partial<FilterOptions>) => void;
}

export const SimpleFilters: React.FC<SimpleFiltersProps> = ({ filters, onFilterChange }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">🔍 Filters</h3>
      
      <div className="space-y-3">
        {/* Group Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Group Type
          </label>
          <select
            value={filters.groupType}
            onChange={(e) => onFilterChange({ groupType: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Groups</option>
            <option value="NORMAL_GROUPS">Normal Groups</option>
            <option value="SUPER_GROUPS">Super Groups</option>
          </select>
        </div>

        {/* Day Filter - Multi Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Days
          </label>
          <div className="grid grid-cols-3 gap-1">
            {[
              { value: 'monday', label: 'Mon' },
              { value: 'tuesday', label: 'Tue' },
              { value: 'wednesday', label: 'Wed' },
              { value: 'thursday', label: 'Thu' },
              { value: 'friday', label: 'Fri' },
              { value: 'saturday', label: 'Sat' },
              { value: 'sunday', label: 'Sun' }
            ].map((day) => (
              <label key={day.value} className="flex items-center space-x-1 text-xs">
                <input
                  type="checkbox"
                  checked={filters.selectedDays.includes(day.value as any)}
                  onChange={(e) => {
                    const newSelectedDays = e.target.checked
                      ? [...filters.selectedDays, day.value as any]
                      : filters.selectedDays.filter(d => d !== day.value);
                    onFilterChange({ selectedDays: newSelectedDays });
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{day.label}</span>
              </label>
            ))}
          </div>
          {filters.selectedDays.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Active on: {filters.selectedDays.join(', ')}
            </p>
          )}
        </div>


        {/* Group Count Filters */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Min Groups
            </label>
            <input
              type="number"
              value={filters.minGroups}
              onChange={(e) => onFilterChange({ minGroups: parseInt(e.target.value) || 1 })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              min="1"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max Groups
            </label>
            <input
              type="number"
              value={filters.maxGroups}
              onChange={(e) => onFilterChange({ maxGroups: parseInt(e.target.value) || 1000 })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              min="0"
            />
          </div>
        </div>

        {/* Groups Per Day Filters */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Min Groups/Day
            </label>
            <input
              type="number"
              value={filters.minGroupsPerDay}
              onChange={(e) => onFilterChange({ minGroupsPerDay: parseInt(e.target.value) || 1 })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              min="1"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max Groups/Day
            </label>
            <input
              type="number"
              value={filters.maxGroupsPerDay}
              onChange={(e) => onFilterChange({ maxGroupsPerDay: parseInt(e.target.value) || 1000 })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              min="1"
            />
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={() => onFilterChange({
            groupType: 'all',
            minGroups: 1,
            maxGroups: 1000,
            minGroupsPerDay: 1,
            maxGroupsPerDay: 1000,
            searchTerm: '',
            selectedDays: []
          })}
          className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};
