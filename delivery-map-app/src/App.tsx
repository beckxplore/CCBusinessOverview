import { useState, useEffect } from 'react';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {
  DeliveryData,
  Statistics,
  MapMarker,
  FilterOptions,
  PersonaLeader,
  SglRetentionResponse,
  BenchmarkLocationsResponse,
} from './types';
import { DataProcessor } from './utils/dataProcessor';
import { ApiClient } from './utils/apiClient';
import { DataStore } from './utils/dataStore';
import { Sidebar, type NavigationSection } from './components/Navigation/Sidebar';
import { AnalyticsPage } from './components/AnalyticsPage';
import { ForecastPage } from './components/ForecastPage';
import { ProfitabilityPage } from './components/Profitability/ProfitabilityPage';
import { StrategyPage } from './components/Strategy/StrategyPage';
import { OverviewPage } from './components/Overview/OverviewPage';
import { PlaygroundPage } from './components/Playground/PlaygroundPage';
import { SglRetentionTab } from './components/SGL/SglRetentionTab';
import { BenchmarkMap } from './components/SGL/BenchmarkMap';
import { B2BFinancialPage } from './components/B2B/B2BFinancialPage';
import { B2BCustomerPage } from './components/B2B/B2BCustomerPage';
import { B2BProductPage } from './components/B2B/B2BProductPage';

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const WAREHOUSE_COORDINATE: [number, number] = [8.992697915198226, 38.821279561426266];

const applyForecastMultiplierToMarkers = (markers: MapMarker[], multiplier: number): MapMarker[] => {
  return markers.map(marker => {
    const baseOrders = marker.data.total_orders || 0;
    const adjustedOrders = Math.max(0, Math.round(baseOrders * multiplier));

    const hasVolume = typeof marker.data.total_kg === 'number' && !Number.isNaN(marker.data.total_kg);
    let adjustedKg = marker.data.total_kg;
    if (hasVolume) {
      const baseKg = marker.data.total_kg as number;
      adjustedKg = Number((baseKg * multiplier).toFixed(1));
    }

    const adjustedSize = Math.min(20, Math.max(5, adjustedOrders / 10));

    return {
      ...marker,
      size: adjustedSize,
      data: {
        ...marker.data,
        total_orders: adjustedOrders,
        total_kg: adjustedKg
      }
    };
  });
};

function App() {
  const [data, setData] = useState<DeliveryData[]>([]);
  const [dataWindow, setDataWindow] = useState<{ start: string; end: string } | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [filteredMarkers, setFilteredMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    groupType: 'all',
    // Normal Groups filters
    normalMinGroups: 1,
    normalMaxGroups: 1000,
    normalMinGroupsPerDay: 1,
    normalMaxGroupsPerDay: 1000,
    normalSelectedDays: [],
    // Super Groups filters
    superMinGroups: 1,
    superMaxGroups: 1000,
    superMinGroupsPerDay: 1,
    superMaxGroupsPerDay: 1000,
    superSelectedDays: [],
    searchTerm: '',
    showHeatmap: false,
    showClusters: true,
    showSuperGroupRadius: false,
    radiusKm: 1,
    showTop15SuperLeaders: false,
    minOrders: 0,
    maxOrders: 1000
  });
  // Always center on Addis Ababa, Ethiopia
  const [mapCenter, setMapCenter] = useState<[number, number]>([9.1450, 38.7667]);
  const [leaderAnalysis, setLeaderAnalysis] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<NavigationSection>('overview');
  const [forecastMultiplier, setForecastMultiplier] = useState<number>(1);
  const [personaLeaders, setPersonaLeaders] = useState<PersonaLeader[]>([]);
  const [personaLeadersLoaded, setPersonaLeadersLoaded] = useState(false);
  const [baselineWeeklyOrders, setBaselineWeeklyOrders] = useState<number | null>(null);
  const [baselineWeeklyVolume, setBaselineWeeklyVolume] = useState<number | null>(null);
  const [markerBaselineOrders, setMarkerBaselineOrders] = useState<number>(0);
  const [markerBaselineVolume, setMarkerBaselineVolume] = useState<number | null>(null);
  const [weeklySummaryWeekStart, setWeeklySummaryWeekStart] = useState<string | null>(null);
  const [weeklySummarySource, setWeeklySummarySource] = useState<'clickhouse' | 'markers' | 'fallback'>('markers');
  const [sglSubTab, setSglSubTab] = useState<'map' | 'retention' | 'benchmark'>('map');
  const [retentionData, setRetentionData] = useState<SglRetentionResponse | null>(null);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [retentionError, setRetentionError] = useState<string | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkLocationsResponse | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);
  const [ourPrices, setOurPrices] = useState<ProductCost[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<NavigationSection>;
      if (customEvent.detail) {
        setActiveSection(customEvent.detail);
      }
    };
    window.addEventListener('navigate-section' as any, handler);
    return () => {
      window.removeEventListener('navigate-section' as any, handler);
    };
  }, []);

  useEffect(() => {
    if (personaLeadersLoaded) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const response = await ApiClient.getPersonaLeaders();
        if (!cancelled) {
          setPersonaLeaders(response.leaders ?? []);
          setPersonaLeadersLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load persona leaders', err);
        if (!cancelled) {
          setPersonaLeadersLoaded(true);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [personaLeadersLoaded]);

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
        normalMinGroups: filters.normalMinGroups,
        normalMaxGroups: filters.normalMaxGroups,
        normalMinGroupsPerDay: filters.normalMinGroupsPerDay,
        normalMaxGroupsPerDay: filters.normalMaxGroupsPerDay,
        normalSelectedDays: filters.normalSelectedDays,
        superMinGroups: filters.superMinGroups,
        superMaxGroups: filters.superMaxGroups,
        superMinGroupsPerDay: filters.superMinGroupsPerDay,
        superMaxGroupsPerDay: filters.superMaxGroupsPerDay,
        superSelectedDays: filters.superSelectedDays,
        searchTerm: filters.searchTerm
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
            const adjustedOrders = filteredItem.total_orders;
            const adjustedSize = Math.min(20, Math.max(5, adjustedOrders / 10));
            return {
              ...marker,
              data: { ...filteredItem, total_orders: adjustedOrders },
              size: adjustedSize
            };
          }
          return null;
        })
        .filter((marker): marker is NonNullable<typeof marker> => marker !== null);
      
      // Apply top 15 Super Group leaders filter if enabled
      let finalFilteredMarkers = filteredMarkers;
      if (filters.showTop15SuperLeaders) {
        // Keep all Normal Group markers
        const normalGroupMarkers = filteredMarkers.filter(marker => marker.data.group_deal_category === 'NORMAL_GROUPS');
        
        // Get Super Group markers and group by leader ID to calculate total orders per leader
        const superGroupMarkers = filteredMarkers.filter(marker => marker.data.group_deal_category === 'SUPER_GROUPS');
        
        // Group by leader ID and sum total orders using a plain object
        const leaderOrdersMap: Record<string, number> = {};
        superGroupMarkers.forEach(marker => {
          const leaderId = marker.data.group_created_by;
          const currentTotal = leaderOrdersMap[leaderId] || 0;
          leaderOrdersMap[leaderId] = currentTotal + marker.data.total_orders;
        });
        
        // Sort leaders by total orders and get top 15
        const top15LeaderIds = Object.entries(leaderOrdersMap)
          .sort((a, b) => b[1] - a[1])  // Sort by total orders descending
          .slice(0, 15)                  // Take top 15
          .map(entry => entry[0]);       // Get just the leader IDs
        
        // Filter Super Group markers to only include locations from top 15 leaders
        const top15SuperGroupMarkers = superGroupMarkers.filter(marker => 
          top15LeaderIds.includes(marker.data.group_created_by)
        );
        
        finalFilteredMarkers = [...normalGroupMarkers, ...top15SuperGroupMarkers];
        
        // Calculate leader analysis with NG coverage within radius
        const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
          const R = 6371; // Earth radius in km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };
        
        const analysis = top15LeaderIds.map((leaderId, index) => {
          const leaderMarkers = superGroupMarkers.filter(m => m.data.group_created_by === leaderId);
          const sgOrders = leaderMarkers.reduce((sum, m) => sum + m.data.total_orders, 0);
          const sgKg = leaderMarkers.reduce((sum, m) => sum + (m.data.total_kg || 0), 0);
          
          // Calculate NG coverage within radius
          const ngCoverageSet = new Set<string>();
          let ngOrdersInRadius = 0;
          let ngKgInRadius = 0;
          
          leaderMarkers.forEach(sgMarker => {
            if (sgMarker.data.latitude && sgMarker.data.longitude) {
              normalGroupMarkers.forEach(ngMarker => {
                if (ngMarker.data.latitude && ngMarker.data.longitude) {
                  const distance = haversineDistance(
                    sgMarker.data.latitude!,
                    sgMarker.data.longitude!,
                    ngMarker.data.latitude!,
                    ngMarker.data.longitude!
                  );
                  
                  if (distance <= filters.radiusKm) {
                    const ngKey = `${ngMarker.data.delivery_location_name}_${ngMarker.data.group_created_by}`;
                    if (!ngCoverageSet.has(ngKey)) {
                      ngCoverageSet.add(ngKey);
                      ngOrdersInRadius += ngMarker.data.total_orders;
                      ngKgInRadius += ngMarker.data.total_kg || 0;
                    }
                  }
                }
              });
            }
          });
          
          const totalPotential = sgOrders + ngOrdersInRadius;
          const growthFactor = sgOrders > 0 ? totalPotential / sgOrders : 0;
          
          return {
            rank: index + 1,
            leaderId,
            name: leaderMarkers[0]?.data.leader_name || '',
            phone: leaderMarkers[0]?.data.leader_phone || '',
            sgLocations: leaderMarkers.length,
            sgOrders,
            sgKg,
            ngLocationsIn05km: ngCoverageSet.size,
            ngOrdersIn05km: ngOrdersInRadius,
            ngKgIn05km: ngKgInRadius,
            totalPotential,
            growthFactor
          };
        });
        
        setLeaderAnalysis(analysis);
      } else {
        setLeaderAnalysis([]);
      }
      
      setFilteredMarkers(finalFilteredMarkers);
      
      // Center on area with highest orders in filtered results
      if (finalFilteredMarkers.length > 0) {
        const maxOrderMarker = finalFilteredMarkers.reduce((max, marker) => 
          marker.data.total_orders > max.data.total_orders ? marker : max
        );
        setMapCenter(maxOrderMarker.position);
      } else {
        // Fallback to Addis Ababa if no filtered markers
        setMapCenter([9.1450, 38.7667]);
      }
    }
  }, [filters, markers, data]);

  useEffect(() => {
    if (!markers) {
      return;
    }

    const totals = markers.reduce(
      (acc, marker) => {
        acc.orders += marker.data.total_orders || 0;
        const kgValue = marker.data.total_kg;
        if (typeof kgValue === 'number' && !Number.isNaN(kgValue)) {
          acc.volume += kgValue;
          acc.volumeCount += 1;
        }
        return acc;
      },
      { orders: 0, volume: 0, volumeCount: 0 }
    );

    setMarkerBaselineOrders(totals.orders);
    setMarkerBaselineVolume(totals.volumeCount > 0 ? totals.volume : null);

    if (baselineWeeklyOrders === null) {
      setBaselineWeeklyOrders(totals.orders);
      setWeeklySummarySource(prev => (prev === 'clickhouse' ? prev : 'markers'));
    }

    if (baselineWeeklyVolume === null && totals.volumeCount > 0) {
      setBaselineWeeklyVolume(totals.volume);
      setWeeklySummarySource(prev => (prev === 'clickhouse' ? prev : 'markers'));
    }
  }, [markers, baselineWeeklyOrders, baselineWeeklyVolume]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Check API health first
      const health = await ApiClient.healthCheck();
      if (health.status !== 'healthy') {
        throw new Error(`API is not healthy: ${health.error || 'Unknown error'}`);
      }
      
      const deliveryPromise = ApiClient.getDeliveryData();
      const statsPromise = ApiClient.getStatistics();
      const weeklySummaryPromise = ApiClient.getForecastWeeklySummary().catch(err => {
        console.warn('Failed to load weekly summary from ClickHouse:', err);
        return null;
      });
      
      // Start loading DataStore in background - don't await it here
      DataStore.loadAll(true).then(() => {
        setOurPrices(DataStore.getProductCosts());
      }).catch(err => {
        console.warn('Failed to load DataStore (cost data):', err);
      });

      const [deliveryResponse, apiStats, weeklySummary] = await Promise.all([
        deliveryPromise,
        statsPromise,
        weeklySummaryPromise
      ]);

      setData(deliveryResponse.records ?? []);
      setDataWindow(deliveryResponse.window ?? null);
      setStatistics(apiStats);

      if (weeklySummary && weeklySummary.source === 'clickhouse') {
        setWeeklySummarySource('clickhouse');
        setBaselineWeeklyOrders(
          typeof weeklySummary.orders === 'number' ? weeklySummary.orders : null
        );
        setBaselineWeeklyVolume(
          typeof weeklySummary.total_kg === 'number' ? weeklySummary.total_kg : null
        );
        setWeeklySummaryWeekStart(weeklySummary.week_start ?? null);
      } else if (weeklySummary) {
        setWeeklySummarySource(weeklySummary.source === 'fallback' ? 'fallback' : 'markers');
        setBaselineWeeklyOrders(
          typeof weeklySummary.orders === 'number' ? weeklySummary.orders : null
        );
        setBaselineWeeklyVolume(
          typeof weeklySummary.total_kg === 'number' ? weeklySummary.total_kg : null
        );
        setWeeklySummaryWeekStart(weeklySummary.week_start ?? null);
      } else {
        setWeeklySummarySource('markers');
        setBaselineWeeklyOrders(null);
        setBaselineWeeklyVolume(null);
        setWeeklySummaryWeekStart(null);
      }
      
    } catch (err) {
      setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerClick = (marker: MapMarker) => {
    // Marker click handled in AnalyticsPage
    console.log('Marker clicked:', marker);
  };

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleForecastUpdate = (multiplier: number) => {
    setForecastMultiplier(multiplier);
  };

  const loadRetentionData = async () => {
    try {
      setRetentionLoading(true);
      setRetentionError(null);
      const response = await ApiClient.getSglRetention();
      setRetentionData(response);
    } catch (err) {
      setRetentionError(
        err instanceof Error ? err.message : 'Failed to load SGL retention data'
      );
    } finally {
      setRetentionLoading(false);
    }
  };

  const loadBenchmarkData = async () => {
    try {
      setBenchmarkLoading(true);
      setBenchmarkError(null);
      const response = await ApiClient.getBenchmarkLocations();
      setBenchmarkData(response);
    } catch (err) {
      setBenchmarkError(
        err instanceof Error ? err.message : 'Failed to load benchmark locations'
      );
    } finally {
      setBenchmarkLoading(false);
    }
  };

  useEffect(() => {
    if (sglSubTab === 'retention' && !retentionData && !retentionLoading) {
      loadRetentionData().catch(() => {
        /* handled via state */
      });
    }
    if ((sglSubTab === 'benchmark' || activeSection === 'benchmark') && !benchmarkData && !benchmarkLoading) {
      loadBenchmarkData().catch(() => {
        /* handled via state */
      });
    }
  }, [sglSubTab, retentionData, retentionLoading, benchmarkData, benchmarkLoading, activeSection]);

  const formatWeekWindow = (window?: { start: string; end: string } | null): string | null => {
    if (!window) {
      return null;
    }
    const formatter = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    const startLabel = formatter.format(new Date(window.start));
    const endLabel = formatter.format(new Date(window.end));
    return `${startLabel} – ${endLabel}`;
  };

  const activeWeekLabel = formatWeekWindow(statistics?.window ?? dataWindow);


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

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewPage />;
      case 'analytics':
        return (
          <AnalyticsPage
            data={data}
            markers={markers}
            filteredMarkers={filteredMarkers}
            filters={filters}
            statistics={statistics}
            mapCenter={mapCenter}
            leaderAnalysis={leaderAnalysis}
            onFilterChange={handleFilterChange}
            onMarkerClick={handleMarkerClick}
            warehouseLocation={WAREHOUSE_COORDINATE}
          />
        );
      case 'sgl': {
        const sglMarkersOnly = markers.filter(marker => marker.type === 'super');
        const sglFilters = {
          ...filters,
          groupType: 'SUPER_GROUPS' as const,
          normalSelectedDays: [],
          normalMinGroups: 0,
          normalMaxGroups: 0
        };

        return (
          <div className="flex flex-col h-full">
            <div className="bg-white border-b px-6 pt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setSglSubTab('map')}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
                  sglSubTab === 'map'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sensitivity Map
              </button>
              <button
                type="button"
                onClick={() => setSglSubTab('retention')}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
                  sglSubTab === 'retention'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Retention
              </button>
              <button
                type="button"
                onClick={() => setSglSubTab('benchmark')}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
                  sglSubTab === 'benchmark'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Benchmark
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {sglSubTab === 'map' ? (
                <AnalyticsPage
                  data={data}
                  markers={sglMarkersOnly}
                  filteredMarkers={sglMarkersOnly}
                  filters={sglFilters}
                  statistics={statistics}
                  mapCenter={mapCenter}
                  leaderAnalysis={leaderAnalysis}
                  onFilterChange={() => {}}
                  onMarkerClick={handleMarkerClick}
                  hideFilters={true}
                  personaLeaders={personaLeaders}
                  warehouseLocation={WAREHOUSE_COORDINATE}
                  enableSglOverlays={true}
                />
              ) : sglSubTab === 'retention' ? (
                <SglRetentionTab
                  data={retentionData}
                  loading={retentionLoading}
                  error={retentionError}
                  onRetry={loadRetentionData}
                />
              ) : (
                <BenchmarkMap
                  locations={benchmarkData?.locations || []}
                  loading={benchmarkLoading}
                  error={benchmarkError}
                  onRetry={loadBenchmarkData}
                  mapCenter={mapCenter}
                  ourPrices={ourPrices}
                />
              )}
            </div>
          </div>
        );
      }
      case 'profitability':
        return <ProfitabilityPage />;
      case 'strategy':
        return <StrategyPage />;
      case 'playground':
        return <PlaygroundPage />;
      case 'benchmark':
        return (
          <BenchmarkMap
            locations={benchmarkData?.locations || []}
            loading={benchmarkLoading}
            error={benchmarkError}
            onRetry={loadBenchmarkData}
            mapCenter={mapCenter}
            ourPrices={ourPrices}
          />
        );
      case 'forecast': {
        const forecastAdjustedFilteredMarkers = applyForecastMultiplierToMarkers(filteredMarkers, forecastMultiplier);
        const forecastAdjustedMarkers = applyForecastMultiplierToMarkers(markers, forecastMultiplier);
        const effectiveBaselineOrders = baselineWeeklyOrders ?? markerBaselineOrders;
        const effectiveBaselineVolume = baselineWeeklyVolume ?? markerBaselineVolume;

        let daysElapsed: number | null = null;
        let scalingFactor = 1;

        if (weeklySummarySource === 'clickhouse' && weeklySummaryWeekStart) {
          const weekStartDate = new Date(`${weeklySummaryWeekStart}T00:00:00`);
          const now = new Date();
          const diffMs = now.getTime() - weekStartDate.getTime();
          if (diffMs >= 0) {
            const msPerDay = 1000 * 60 * 60 * 24;
            const computedDays = Math.floor(diffMs / msPerDay) + 1;
            if (computedDays > 0) {
              daysElapsed = Math.min(7, computedDays);
              if (daysElapsed < 7) {
                scalingFactor = 7 / daysElapsed;
              }
            }
          }
        }

        const scaledBaselineOrders = effectiveBaselineOrders * scalingFactor;
        const scaledBaselineVolume =
          typeof effectiveBaselineVolume === 'number' && effectiveBaselineVolume !== null
            ? effectiveBaselineVolume * scalingFactor
            : null;

        const baselineOrdersDisplay = Math.max(0, Math.round(scaledBaselineOrders));
        const projectedOrders = Math.max(0, Math.round(baselineOrdersDisplay * forecastMultiplier));
        const projectedVolume =
          typeof scaledBaselineVolume === 'number'
            ? Math.max(0, Number((scaledBaselineVolume * forecastMultiplier).toFixed(1)))
            : null;

        const baselineOrdersLabel = baselineOrdersDisplay.toLocaleString();
        const baselineVolumeLabel =
          typeof scaledBaselineVolume === 'number'
            ? scaledBaselineVolume.toLocaleString(undefined, { maximumFractionDigits: 1 })
            : null;
        const formattedWeekStart = weeklySummaryWeekStart
          ? new Date(`${weeklySummaryWeekStart}T00:00:00Z`).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          : null;
        const forecastSourceLabel =
          weeklySummarySource === 'clickhouse'
            ? `Live ClickHouse${formattedWeekStart ? ` • Week of ${formattedWeekStart}` : ''}${
                daysElapsed && daysElapsed < 7 ? ` • ${daysElapsed}/7 days actual` : ''
              }`
            : weeklySummarySource === 'fallback'
            ? 'Backend fallback dataset'
            : 'Map dataset baseline';

        return (
          <div className="flex h-full">
            <div className="w-[420px] bg-white shadow-lg overflow-y-auto p-4">
              <ForecastPage onUpdateMultiplier={handleForecastUpdate} />
            </div>
            <div className="flex-1 relative bg-slate-100">
              <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none">
                <div className="flex flex-wrap gap-3">
                  <div className="bg-white border border-gray-200 shadow-sm rounded-xl px-4 py-3 min-w-[160px] pointer-events-auto">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Projected Weekly Orders</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {projectedOrders.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Baseline estimate {baselineOrdersLabel}
                    </p>
                    <p className="text-xs text-gray-500">
                      Source: {forecastSourceLabel} • Multiplier {forecastMultiplier.toFixed(2)}×
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 shadow-sm rounded-xl px-4 py-3 min-w-[160px] pointer-events-auto">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Projected Weekly Volume</p>
                    {projectedVolume !== null ? (
                      <>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {projectedVolume.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                        </p>
                        {baselineVolumeLabel && (
                          <p className="text-xs text-gray-500 mt-1">
                            Baseline {baselineVolumeLabel} kg
                          </p>
                        )}
                        <p className="text-xs text-gray-500">Source: {forecastSourceLabel}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">
                        Not available (no KG data in current dataset)
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <AnalyticsPage
                data={data}
                markers={forecastAdjustedMarkers}
                filteredMarkers={forecastAdjustedFilteredMarkers}
                filters={filters}
                statistics={statistics}
                mapCenter={mapCenter}
                leaderAnalysis={leaderAnalysis}
                onFilterChange={handleFilterChange}
                onMarkerClick={handleMarkerClick}
                hideFilters={true}
                personaLeaders={personaLeaders}
                warehouseLocation={WAREHOUSE_COORDINATE}
                enableSglOverlays={false}
              />
            </div>
          </div>
        );
      }
      case 'b2b-financial':
        return <B2BFinancialPage />;
      case 'b2b-customer':
        return <B2BCustomerPage />;
      case 'b2b-products':
        return <B2BProductPage />;
    }
  };

  const getSectionTitle = (section: NavigationSection): string => {
    const titles: Record<NavigationSection, string> = {
      overview: 'Overview',
      analytics: 'Analytics',
      sgl: 'SGL Sensitivity',
      profitability: 'Profitability',
      forecast: 'Forecast',
      strategy: 'Strategy',
      playground: 'Playground',
      benchmark: 'Benchmark Locations',
      'b2b-financial': 'B2B Financial Analytics',
      'b2b-customer': 'B2B Customer Analytics',
      'b2b-products': 'B2B Product Analytics'
    };
    return titles[section];
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b flex-shrink-0">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {getSectionTitle(activeSection)}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {statistics?.totalRecords.toLocaleString()} locations • {statistics?.totalOrders.toLocaleString()} total orders
                </p>
                {activeWeekLabel && (
                  <p className="text-xs text-gray-400">
                    Week window {activeWeekLabel}
                  </p>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;