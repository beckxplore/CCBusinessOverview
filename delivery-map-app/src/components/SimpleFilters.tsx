import React from 'react';
import type { FilterOptions } from '../types';

interface SimpleFiltersProps {
  filters: FilterOptions;
  onFilterChange: (_filters: Partial<FilterOptions>) => void;
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

                {/* Normal Groups Filters */}
                <div className="pt-3 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">📦 Normal Groups Filters</h4>
                  
                  {/* Normal Groups Day Selection */}
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
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
                            checked={filters.normalSelectedDays.includes(day.value as any)}
                            onChange={(e) => {
                              const newSelectedDays = e.target.checked
                                ? [...filters.normalSelectedDays, day.value as any]
                                : filters.normalSelectedDays.filter(d => d !== day.value);
                              onFilterChange({ normalSelectedDays: newSelectedDays });
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-gray-700">{day.label}</span>
                        </label>
                      ))}
                    </div>
                    {filters.normalSelectedDays.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Active: {filters.normalSelectedDays.join(', ')}
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Min Groups
                      </label>
                      <input
                        type="number"
                        value={filters.normalMinGroups}
                        onChange={(e) => onFilterChange({ normalMinGroups: parseInt(e.target.value) || 1 })}
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
                        value={filters.normalMaxGroups}
                        onChange={(e) => onFilterChange({ normalMaxGroups: parseInt(e.target.value) || 1000 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Min Orders/Day
                      </label>
                      <input
                        type="number"
                        value={filters.normalMinGroupsPerDay}
                        onChange={(e) => onFilterChange({ normalMinGroupsPerDay: parseInt(e.target.value) || 1 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Max Orders/Day
                      </label>
                      <input
                        type="number"
                        value={filters.normalMaxGroupsPerDay}
                        onChange={(e) => onFilterChange({ normalMaxGroupsPerDay: parseInt(e.target.value) || 1000 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        min="1"
                      />
                    </div>
                  </div>
                </div>

                {/* Super Groups Filters */}
                <div className="pt-3 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">🚀 Super Groups Filters</h4>
                  
                  {/* Super Groups Day Selection */}
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
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
                            checked={filters.superSelectedDays.includes(day.value as any)}
                            onChange={(e) => {
                              const newSelectedDays = e.target.checked
                                ? [...filters.superSelectedDays, day.value as any]
                                : filters.superSelectedDays.filter(d => d !== day.value);
                              onFilterChange({ superSelectedDays: newSelectedDays });
                            }}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                          <span className="text-gray-700">{day.label}</span>
                        </label>
                      ))}
                    </div>
                    {filters.superSelectedDays.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Active: {filters.superSelectedDays.join(', ')}
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Min Groups
                      </label>
                      <input
                        type="number"
                        value={filters.superMinGroups}
                        onChange={(e) => onFilterChange({ superMinGroups: parseInt(e.target.value) || 1 })}
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
                        value={filters.superMaxGroups}
                        onChange={(e) => onFilterChange({ superMaxGroups: parseInt(e.target.value) || 1000 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Min Orders/Day
                      </label>
                      <input
                        type="number"
                        value={filters.superMinGroupsPerDay}
                        onChange={(e) => onFilterChange({ superMinGroupsPerDay: parseInt(e.target.value) || 1 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Max Orders/Day
                      </label>
                      <input
                        type="number"
                        value={filters.superMaxGroupsPerDay}
                        onChange={(e) => onFilterChange({ superMaxGroupsPerDay: parseInt(e.target.value) || 1000 })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        min="1"
                      />
                    </div>
                  </div>
                </div>

                {/* Super Group Leader Radius */}
                <div className="pt-3 border-t border-gray-200">
                  <label className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={filters.showSuperGroupRadius}
                      onChange={(e) => onFilterChange({ showSuperGroupRadius: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Show Super Group Leader Radius
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2 ml-6">
                    Shows radius circles only for filtered Super Group leaders
                  </p>
                  
                  {filters.showSuperGroupRadius && (
                    <div className="mt-2 pl-6">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Radius: {filters.radiusKm} km
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="5"
                        step="0.5"
                        value={filters.radiusKm}
                        onChange={(e) => onFilterChange({ radiusKm: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0.5 km</span>
                        <span>5 km</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Top 15 Super Group Leaders */}
                <div className="pt-3 border-t border-gray-200">
                  <label className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={filters.showTop15SuperLeaders}
                      onChange={(e) => onFilterChange({ showTop15SuperLeaders: e.target.checked })}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      🏆 Show Top 15 Super Group Leaders
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2 ml-6">
                    Shows all Normal Groups + all locations for top 15 Super Group leaders
                  </p>
                </div>
                <button
                  onClick={() => onFilterChange({
                    groupType: 'all',
                    normalMinGroups: 1,
                    normalMaxGroups: 1000,
                    normalMinGroupsPerDay: 1,
                    normalMaxGroupsPerDay: 1000,
                    normalSelectedDays: [],
                    superMinGroups: 1,
                    superMaxGroups: 1000,
                    superMinGroupsPerDay: 1,
                    superMaxGroupsPerDay: 1000,
                    superSelectedDays: [],
                    searchTerm: '',
                    showSuperGroupRadius: false,
                    radiusKm: 1,
                    showTop15SuperLeaders: false
                  })}
                  className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            </div>
          );
        };
