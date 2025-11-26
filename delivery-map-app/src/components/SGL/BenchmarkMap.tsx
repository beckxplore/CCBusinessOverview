import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import type { BenchmarkLocation, ProductCost } from '../../types';

interface BenchmarkMapProps {
  locations: BenchmarkLocation[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  mapCenter: [number, number];
  ourPrices?: ProductCost[];
}

// Icon mapping based on location group category
const getCategoryConfig = (locationGroup: string): { color: string; emoji: string } => {
  const categoryConfig: Record<string, { color: string; emoji: string }> = {
    'local-shops': { color: '#3b82f6', emoji: '🏪' },
    'distribution-center': { color: '#10b981', emoji: '🏭' },
    'farm': { color: '#84cc16', emoji: '🚜' },
    'sunday-market': { color: '#f59e0b', emoji: '🛒' },
    'supermarket': { color: '#8b5cf6', emoji: '🏬' },
    'ecommerce': { color: '#ec4899', emoji: '💻' },
    'chipchip': { color: '#06b6d4', emoji: '📱' },
  };
  
  return categoryConfig[locationGroup.toLowerCase()] || { color: '#6b7280', emoji: '📍' };
};

const getIconForCategory = (locationGroup: string): L.Icon => {
  const size = 32;
  const config = getCategoryConfig(locationGroup);
  
  // Create a custom icon with emoji
  return L.divIcon({
    className: 'custom-benchmark-icon',
    html: `<div style="
      background-color: ${config.color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">${config.emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const formatLocationGroup = (group: string): string => {
  return group
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const BenchmarkMap: React.FC<BenchmarkMapProps> = ({
  locations,
  loading,
  error,
  onRetry,
  mapCenter,
  ourPrices = [],
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading benchmark locations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!locations || locations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-600">No benchmark locations found</p>
        </div>
      </div>
    );
  }

  // Group locations by category for legend
  const locationsByCategory = locations.reduce((acc, loc) => {
    const category = loc.location_group;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(loc);
    return acc;
  }, {} as Record<string, BenchmarkLocation[]>);

  // Helper to find product price comparison
  const getPriceComparison = (productName: string, benchmarkPrice: number) => {
    // Normalize product name if needed, but for now simple match
    const ourProduct = ourPrices.find(p => 
      p.product_name.toLowerCase() === productName.toLowerCase() ||
      p.product_name.toLowerCase().includes(productName.toLowerCase()) ||
      productName.toLowerCase().includes(p.product_name.toLowerCase())
    );

    if (!ourProduct || !ourProduct.selling_price) return null;

    const ourPrice = ourProduct.selling_price;
    const diff = benchmarkPrice - ourPrice;
    const pct = (diff / ourPrice) * 100;

    return {
      ourPrice,
      diff,
      pct,
      isCheaper: diff < 0, // Benchmark is cheaper (bad for us?)
      isMoreExpensive: diff > 0 // Benchmark is more expensive (good for us?)
    };
  };

  return (
    <div className="h-full relative">
      {/* Legend */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-4 max-w-xs">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Benchmark Categories</h3>
        <div className="space-y-1">
          {Object.entries(locationsByCategory).map(([category, locs]) => {
            const config = getCategoryConfig(category);
            return (
              <div key={category} className="flex items-center gap-2 text-xs">
                <div
                  style={{
                    backgroundColor: config.color,
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    border: '2px solid white',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  }}
                >
                  {config.emoji}
                </div>
                <span className="text-gray-700">
                  {formatLocationGroup(category)} ({locs.length})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ZoomControl position="bottomright" />
        
        {locations.map((location, index) => (
          <Marker
            key={`${location.location}-${location.location_group}-${index}`}
            position={[location.latitude, location.longitude]}
            icon={getIconForCategory(location.location_group)}
          >
            <Popup minWidth={300} maxWidth={400}>
              <div className="text-sm">
                <div className="font-bold text-gray-900 mb-1 text-base">{location.location}</div>
                <div className="text-gray-600 mb-2 flex items-center gap-2">
                  <span className="text-lg">{getCategoryConfig(location.location_group).emoji}</span>
                  <span>{formatLocationGroup(location.location_group)}</span>
                </div>
                
                <div className="text-gray-500 text-xs mb-3">
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </div>

                {location.products && location.products.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b flex justify-between font-medium text-xs text-gray-700">
                      <span>Product</span>
                      <span>Price (vs Us)</span>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <tbody className="divide-y divide-gray-100">
                          {location.products.map((prod, idx) => {
                            const comparison = getPriceComparison(prod.name, prod.price);
                            return (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-800">{prod.name}</td>
                                <td className="px-3 py-2 text-right">
                                  <div className="font-medium">{prod.price.toFixed(0)} ETB</div>
                                  {comparison && (
                                    <div className={`text-[10px] ${comparison.diff > 0 ? 'text-green-600' : comparison.diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                      {comparison.diff > 0 ? '+' : ''}{comparison.pct.toFixed(1)}%
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-xs italic">No price data available</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

