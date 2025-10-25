import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { DeliveryData, Statistics, MapMarker, FilterOptions } from './types';
import { DataProcessor } from './utils/dataProcessor';
import { ApiClient } from './utils/apiClient';
import { StatisticsPanel } from './components/StatisticsPanel';
import { MapLegend } from './components/MapLegend';
import { SimpleFilters } from './components/SimpleFilters';
import { Map } from 'lucide-react';

// Component to update map center programmatically - Centers on highest order area
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    // Center on the provided center (which will be the highest order area)
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function App() {
  const [data, setData] = useState<DeliveryData[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [filteredMarkers, setFilteredMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    groupType: 'all',
    minGroups: 1,
    maxGroups: 1000,
    minGroupsPerDay: 1,
    maxGroupsPerDay: 1000,
    searchTerm: '',
    showHeatmap: false,
    showClusters: true,
    selectedDays: []
  });
  // Always center on Addis Ababa, Ethiopia
  const [mapCenter, setMapCenter] = useState<[number, number]>([9.1450, 38.7667]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (data.length > 0 && statistics) {
      const processor = new DataProcessor(data);
      const mapMarkers = processor.generateMapMarkers();
      
      setMarkers(mapMarkers);
      
      // Center on area with highest order concentration
      if (mapMarkers.length > 0) {
        // Find the marker with the highest total orders across all days
        const maxOrderMarker = mapMarkers.reduce((max, marker) => 
          marker.data.total_orders > max.data.total_orders ? marker : max
        );
        
        // Center on the area with most orders
        setMapCenter(maxOrderMarker.position);
        
        console.log(`🎯 Centering on location with highest orders:`, {
          location: maxOrderMarker.data.delivery_location_name,
          totalOrders: maxOrderMarker.data.total_orders,
          dailyBreakdown: {
            monday: maxOrderMarker.data.monday_orders,
            tuesday: maxOrderMarker.data.tuesday_orders,
            wednesday: maxOrderMarker.data.wednesday_orders,
            thursday: maxOrderMarker.data.thursday_orders,
            friday: maxOrderMarker.data.friday_orders,
            saturday: maxOrderMarker.data.saturday_orders,
            sunday: maxOrderMarker.data.sunday_orders
          }
        });
      } else {
        // Fallback to Addis Ababa if no markers
        setMapCenter([9.1450, 38.7667]);
      }
    }
  }, [data, statistics]);

  useEffect(() => {
    if (markers.length > 0) {
      const processor = new DataProcessor(data);
      const filtered = processor.filterData({
        groupType: filters.groupType,
        minGroups: filters.minGroups,
        maxGroups: filters.maxGroups,
        minGroupsPerDay: filters.minGroupsPerDay,
        maxGroupsPerDay: filters.maxGroupsPerDay,
        searchTerm: filters.searchTerm,
        selectedDays: filters.selectedDays
      });
      
      // FIXED: Update marker data with filtered data (which has updated total_orders)
      const filteredMarkers = markers
        .map(marker => {
          // Find the corresponding filtered data
          const filteredItem = filtered.find(item => 
            item.group_created_by === marker.data.group_created_by &&
            item.delivery_location_name === marker.data.delivery_location_name
          );
          
          if (filteredItem) {
            // Return marker with updated data from filtered result
            return {
              ...marker,
              data: filteredItem
            };
          }
          return null;
        })
        .filter((marker): marker is NonNullable<typeof marker> => marker !== null);
      
      setFilteredMarkers(filteredMarkers);
      
      // Center on area with highest orders in filtered results
      if (filteredMarkers.length > 0) {
        const maxOrderMarker = filteredMarkers.reduce((max, marker) => 
          marker.data.total_orders > max.data.total_orders ? marker : max
        );
        setMapCenter(maxOrderMarker.position);
      } else {
        // Fallback to Addis Ababa if no filtered markers
        setMapCenter([9.1450, 38.7667]);
      }
    }
  }, [filters, markers, data]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Check API health first
      const health = await ApiClient.healthCheck();
      if (health.status !== 'healthy') {
        throw new Error(`API is not healthy: ${health.error || 'Unknown error'}`);
      }
      
      // Load data and statistics in parallel
      const [apiData, apiStats] = await Promise.all([
        ApiClient.getDeliveryData(),
        ApiClient.getStatistics()
      ]);
      
      setData(apiData);
      setStatistics(apiStats);
      
    } catch (err) {
      setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerClick = (marker: MapMarker) => {
    setSelectedMarker(marker);
  };

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading delivery data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <p className="text-lg text-gray-600">{error}</p>
          <button 
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Map className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Delivery Map Analytics</h1>
            </div>
            <div className="text-sm text-gray-500">
              {statistics?.totalRecords.toLocaleString()} locations • {statistics?.totalOrders.toLocaleString()} total orders • Centered on highest order area
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Sidebar - Wider and better organized */}
        <div className="w-[420px] bg-white shadow-lg overflow-y-auto">
                  <div className="p-4 space-y-4">
                     <StatisticsPanel 
                       statistics={statistics} 
                       filteredData={filteredMarkers.map(m => m.data)} 
                       isDayFilterActive={filters.selectedDays.length > 0}
                     />
                    <SimpleFilters 
                      filters={filters} 
                      onFilterChange={handleFilterChange}
                    />
                    <MapLegend />
                  </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 relative">
          {/* Map */}
          <div className="h-full">
            <MapContainer
              center={mapCenter}
              zoom={13}
              className="h-full w-full"
              key={`${mapCenter[0]}-${mapCenter[1]}-${filters.groupType}-${filters.minGroups}-${filters.maxGroups}-${filters.minGroupsPerDay}-${filters.maxGroupsPerDay}-${filters.selectedDays.join(',')}`}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapUpdater center={mapCenter} />
              
              {filteredMarkers.map((marker) => (
                <CircleMarker
                  key={marker.id}
                  center={marker.position}
                  radius={marker.size}
                  color={marker.color}
                  fillColor={marker.color}
                  fillOpacity={0.6}
                  weight={2}
                  eventHandlers={{
                    click: () => handleMarkerClick(marker)
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[250px]">
                      <h3 className="font-semibold text-lg mb-2">
                        {marker.data.delivery_location_name.length > 50 
                          ? `${marker.data.delivery_location_name.substring(0, 50)}...`
                          : marker.data.delivery_location_name
                        }
                      </h3>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Group Type:</span> {marker.data.group_deal_category}</p>
                        <p><span className="font-medium">Total Orders:</span> {marker.data.total_orders.toLocaleString()}</p>
                        <p><span className="font-medium">Members:</span> {marker.data.unique_group_members}</p>
                        <p><span className="font-medium">Groups:</span> {marker.data.total_groups}</p>
                        <p><span className="font-medium">Active Days:</span> {marker.data.active_days}</p>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          {/* Selected Marker Details */}
          {selectedMarker && (
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
              <button
                onClick={() => setSelectedMarker(null)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
              <h3 className="font-semibold text-lg mb-2">Location Details</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Location:</span> {selectedMarker.data.delivery_location_name}</p>
                <p><span className="font-medium">Group Type:</span> {selectedMarker.data.group_deal_category}</p>
                <p><span className="font-medium">Total Orders:</span> {selectedMarker.data.total_orders.toLocaleString()}</p>
                <p><span className="font-medium">Unique Members:</span> {selectedMarker.data.unique_group_members}</p>
                <p><span className="font-medium">Total Groups:</span> {selectedMarker.data.total_groups}</p>
                <p><span className="font-medium">Active Days:</span> {selectedMarker.data.active_days}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;