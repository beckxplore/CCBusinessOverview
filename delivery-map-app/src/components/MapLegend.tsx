import React from 'react';
import { MapPin, Target, Circle } from 'lucide-react';

export const MapLegend: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🗺️ Map Legend</h3>
      
      <div className="space-y-4">
        {/* Marker Types */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Marker Types</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Circle className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">Normal Groups</span>
            </div>
            <div className="flex items-center space-x-2">
              <Circle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-gray-600">Super Groups</span>
            </div>
          </div>
        </div>

        {/* Marker Sizes */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Marker Sizes</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span className="text-sm text-gray-600">1-50 orders</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className="text-sm text-gray-600">51-100 orders</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
              <span className="text-sm text-gray-600">100+ orders</span>
            </div>
          </div>
        </div>

        {/* Interactive Elements */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Interactions</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Click marker for details</span>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Zoom to explore areas</span>
            </div>
          </div>
        </div>

        {/* Data Info */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Data Information</h4>
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Data covers Addis Ababa, Ethiopia</p>
            <p>• Locations include delivery points</p>
            <p>• Orders tracked over time</p>
            <p>• Real-time filtering available</p>
          </div>
        </div>
      </div>
    </div>
  );
};
