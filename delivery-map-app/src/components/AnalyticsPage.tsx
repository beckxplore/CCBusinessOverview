import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker, Circle, useMap, ZoomControl, Tooltip, Marker } from 'react-leaflet';
import type { DeliveryData, MapMarker, FilterOptions, PersonaLeader } from '../types';
import { StatisticsPanel } from './StatisticsPanel';
import { MapLegend } from './MapLegend';
import { SimpleFilters } from './SimpleFilters';
import { TopLeadersPanel } from './TopLeadersPanel';
import L from 'leaflet';

interface SensitivityClusterSummary {
  id: number;
  level: string;
  label: string;
  description: string;
  guardrail: string;
  color: string;
  count: number;
  totalKg: number;
  avgCombined: number;
  avgLocal: number;
  avgDist: number;
  avgCombinedPct: number | null;
  avgLocalPct: number | null;
  avgDistPct: number | null;
  avgCoverage: number;
  avgPctAtOrAboveLocal: number;
}

interface CorridorSummary {
  id: number;
  centroid: [number, number];
  members: number;
  totalKg: number;
  sensitivityMix: Record<number, number>;
  recommendation: string;
  radiusMeters: number;
}

interface AnalyticsPageProps {
  data: DeliveryData[];
  markers: MapMarker[];
  filteredMarkers: MapMarker[];
  filters: FilterOptions;
  statistics: any;
  mapCenter: [number, number];
  leaderAnalysis: any[];
  onFilterChange: (_filters: Partial<FilterOptions>) => void;
  onMarkerClick: (_marker: MapMarker) => void;
  hideFilters?: boolean;
  personaLeaders?: PersonaLeader[];
  warehouseLocation?: [number, number];
  enableSglOverlays?: boolean;
}

// Component to update map center programmatically
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

const CLUSTER_COLORS = ['#22c55e', '#3b82f6', '#f97316', '#6366f1', '#eab308', '#ef4444'];
const LOCAL_WEIGHT = 0.6;
const DISTRIBUTION_WEIGHT = 0.4;

const isFiniteNumber = (value?: number | null): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const computeCombinedPct = (localPct?: number | null, distributionPct?: number | null): number | null => {
  const hasLocal = isFiniteNumber(localPct);
  const hasDistribution = isFiniteNumber(distributionPct);

  if (hasLocal && hasDistribution) {
    return LOCAL_WEIGHT * (localPct as number) + DISTRIBUTION_WEIGHT * (distributionPct as number);
  }
  if (hasLocal) {
    return localPct as number;
  }
  if (hasDistribution) {
    return distributionPct as number;
  }
  return null;
};

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  filteredMarkers,
  filters,
  statistics,
  mapCenter,
  leaderAnalysis,
  onFilterChange,
  onMarkerClick,
  hideFilters = false,
  personaLeaders,
  warehouseLocation,
  enableSglOverlays = false
}) => {
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [showSensitivityClusters, setShowSensitivityClusters] = useState(false);
  const [showCorridors, setShowCorridors] = useState(false);

  const handleMarkerClick = (marker: MapMarker) => {
    setSelectedMarker(marker);
    onMarkerClick(marker);
  };

  const getPersonaIcon = (persona?: string, clusterColor?: string) => {
    const baseClass =
      'flex items-center justify-center rounded-full text-white font-semibold shadow-md';
    const size = 28;

    const personaLower = persona?.toLowerCase() ?? '';
    const isReseller = personaLower.includes('reseller');
    const isCommunity = personaLower.includes('community');

    const glyph = isReseller ? '🏬' : isCommunity ? '👤' : '📍';
    const fallbackColor = isReseller
      ? '#f97316'
      : isCommunity
      ? '#22c55e'
      : '#6366f1';
    const backgroundColor = clusterColor ?? fallbackColor;

    return L.divIcon({
      html: `<div class="${baseClass}" style="width:${size}px;height:${size}px;background-color:${backgroundColor};">${glyph}</div>`,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      tooltipAnchor: [0, -size / 2]
    });
  };

  const warehouseIcon = useMemo(
    () =>
      L.divIcon({
        html:
          '<div class="flex items-center justify-center rounded-full bg-purple-600 text-white text-sm font-semibold shadow-lg" style="width:32px;height:32px;">🏭</div>',
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        tooltipAnchor: [0, -16]
      }),
    []
  );

  const formatPct = (value?: number | null) =>
    isFiniteNumber(value) ? `${value.toFixed(1)}%` : '—';

  const formatPctWithEtb = (pct?: number | null, etb?: number | null) => {
    const pctLabel = isFiniteNumber(pct) ? `${(pct * 100).toFixed(1)}%` : null;
    const etbLabel = isFiniteNumber(etb) ? `${etb.toFixed(2)} ETB/kg` : null;
    if (pctLabel && etbLabel) {
      return `${pctLabel} (${etbLabel})`;
    }
    if (pctLabel) {
      return pctLabel;
    }
    if (etbLabel) {
      return etbLabel;
    }
    return '—';
  };

  const sensitivityInsights = useMemo(() => {
    if (!personaLeaders || personaLeaders.length < 3) {
      return null;
    }

    const validLeaders = personaLeaders.filter(
      leader =>
        typeof leader.latitude === 'number' &&
        typeof leader.longitude === 'number' &&
        leader.latitude !== null &&
        leader.longitude !== null
    );

    if (validLeaders.length < 3) {
      return null;
    }

    const featureKeys: Array<
      'combined_sensitivity_etb' | 'local_discount_etb' | 'distribution_discount_etb' | 'pct_volume_at_or_above_local' | 'sensitivity_coverage_days'
    > = [
      'combined_sensitivity_etb',
      'local_discount_etb',
      'distribution_discount_etb',
      'pct_volume_at_or_above_local',
      'sensitivity_coverage_days'
    ];

    const features = validLeaders.map(leader => {
      return featureKeys.map(key => {
        const value = leader[key] ?? 0;
        return typeof value === 'number' && Number.isFinite(value) ? value : 0;
      });
    });

    const means = featureKeys.map((_, idx) => {
      const col = features.map(row => row[idx]);
      return col.reduce((acc, val) => acc + val, 0) / Math.max(1, col.length);
    });

    const stdDevs = featureKeys.map((_, idx) => {
      const col = features.map(row => row[idx]);
      const mean = means[idx];
      const variance =
        col.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / Math.max(1, col.length - 1);
      return variance > 0 ? Math.sqrt(variance) : 1;
    });

    const normalized = features.map(row =>
      row.map((val, idx) => (val - means[idx]) / (stdDevs[idx] || 1))
    );

    const runKMeans = (data: number[][], clusterCount: number, iterations = 30) => {
      const k = Math.min(clusterCount, data.length);
      const centroids = Array.from({ length: k }, (_, index) => data[index % data.length].slice());
      const labels = new Array(data.length).fill(0);

      const distanceSquared = (a: number[], b: number[]) => {
        return a.reduce((sum, val, idx) => sum + Math.pow(val - b[idx], 2), 0);
      };

      for (let iteration = 0; iteration < iterations; iteration++) {
        for (let i = 0; i < data.length; i++) {
          let bestIndex = 0;
          let bestDistance = Infinity;
          for (let c = 0; c < k; c++) {
            const d = distanceSquared(data[i], centroids[c]);
            if (d < bestDistance) {
              bestDistance = d;
              bestIndex = c;
            }
          }
          labels[i] = bestIndex;
        }

        const dimension = data[0].length;
        const sums = Array.from({ length: k }, () => new Array(dimension).fill(0));
        const counts = new Array(k).fill(0);

        data.forEach((point, idx) => {
          const clusterIndex = labels[idx];
          counts[clusterIndex] += 1;
          for (let dim = 0; dim < dimension; dim++) {
            sums[clusterIndex][dim] += point[dim];
          }
        });

        for (let c = 0; c < k; c++) {
          if (counts[c] === 0) continue;
          for (let dim = 0; dim < dimension; dim++) {
            centroids[c][dim] = sums[c][dim] / counts[c];
          }
        }
      }

      return labels;
    };

    const desiredClusterCount = Math.min(5, Math.max(2, normalized.length));
    const sensitivityClusterLabels = runKMeans(normalized, desiredClusterCount);

    const clusterSummaries: SensitivityClusterSummary[] = [];
    const clusterAssignments = new Map<string, number>();
    const clusterVolume = new Map<number, number>();
    const clusterCombined = new Map<number, number>();
    const clusterLocal = new Map<number, number>();
    const clusterDist = new Map<number, number>();
    const clusterLocalPctSum = new Map<number, number>();
    const clusterLocalPctCount = new Map<number, number>();
    const clusterDistPctSum = new Map<number, number>();
    const clusterDistPctCount = new Map<number, number>();
    const clusterPctLocal = new Map<number, number>();
    const clusterCoverage = new Map<number, number>();
    const clusterCounts = new Map<number, number>();

    validLeaders.forEach((leader, idx) => {
      const clusterId = sensitivityClusterLabels[idx] ?? 0;
      const phoneKey = leader.phone?.trim();
      if (phoneKey) {
        clusterAssignments.set(phoneKey, clusterId);
      }
      if (leader.leader_id) {
        clusterAssignments.set(leader.leader_id, clusterId);
      }
      if (leader.latitude !== undefined && leader.longitude !== undefined) {
        const coordKey = `${leader.latitude.toFixed(4)}|${leader.longitude.toFixed(4)}`;
        clusterAssignments.set(coordKey, clusterId);
      }
      clusterCounts.set(clusterId, (clusterCounts.get(clusterId) ?? 0) + 1);
      clusterVolume.set(
        clusterId,
        (clusterVolume.get(clusterId) ?? 0) + (leader.sensitivity_total_kg ?? leader.total_kg_ordered ?? 0)
      );
      clusterCombined.set(clusterId, (clusterCombined.get(clusterId) ?? 0) + (leader.combined_sensitivity_etb ?? 0));
      clusterLocal.set(clusterId, (clusterLocal.get(clusterId) ?? 0) + (leader.local_discount_etb ?? 0));
      clusterDist.set(clusterId, (clusterDist.get(clusterId) ?? 0) + (leader.distribution_discount_etb ?? 0));
      if (isFiniteNumber(leader.local_discount_pct)) {
        clusterLocalPctSum.set(clusterId, (clusterLocalPctSum.get(clusterId) ?? 0) + (leader.local_discount_pct ?? 0));
        clusterLocalPctCount.set(clusterId, (clusterLocalPctCount.get(clusterId) ?? 0) + 1);
      }
      if (isFiniteNumber(leader.distribution_discount_pct)) {
        clusterDistPctSum.set(clusterId, (clusterDistPctSum.get(clusterId) ?? 0) + (leader.distribution_discount_pct ?? 0));
        clusterDistPctCount.set(clusterId, (clusterDistPctCount.get(clusterId) ?? 0) + 1);
      }
      clusterPctLocal.set(clusterId, (clusterPctLocal.get(clusterId) ?? 0) + (leader.pct_volume_at_or_above_local ?? 0));
      clusterCoverage.set(clusterId, (clusterCoverage.get(clusterId) ?? 0) + (leader.sensitivity_coverage_days ?? 0));
    });

    const guardrailFor = (
      avgCombined: number,
      avgLocal: number,
      avgPctLocal: number
    ): { label: string; description: string; guardrail: string } => {
      if (avgCombined >= 25 && avgLocal >= 35 && avgPctLocal < 10) {
        return {
          label: 'Low Sensitivity – High Headroom',
          description: 'Leaders consistently buy well below local shop prices with robust observation coverage.',
          guardrail: 'Allow +4 to +6 ETB lifts while staying at least 1 ETB below local shop. Pause if ≥10% volume hits local price.'
        };
      }

      if (avgCombined >= 15 && avgLocal >= 20 && avgPctLocal < 15) {
        return {
          label: 'Moderate Sensitivity – Controlled Raises',
          description: 'Responsive to price but still below benchmark; moderate coverage depth.',
          guardrail: 'Limit to +1 to +2 ETB lifts. Maintain parity or slight discount vs local shop. Require ≥14 days coverage before next lift.'
        };
      }

      return {
        label: 'High Sensitivity / Caution',
        description: 'Close to benchmark or sparse observations; risk of volume drop if price increases.',
        guardrail: 'Keep at or slightly below local shop. Focus on bundle value or operational savings before adjusting price.'
      };
    };

    Array.from(clusterCounts.keys())
      .sort((a, b) => a - b)
      .forEach(clusterId => {
        const members = clusterCounts.get(clusterId) ?? 0;
        const totalKg = clusterVolume.get(clusterId) ?? 0;

        const avgCombined = (clusterCombined.get(clusterId) ?? 0) / Math.max(1, members);
        const avgLocal = (clusterLocal.get(clusterId) ?? 0) / Math.max(1, members);
        const avgDist = (clusterDist.get(clusterId) ?? 0) / Math.max(1, members);
        const avgCoverage = (clusterCoverage.get(clusterId) ?? 0) / Math.max(1, members);
        const avgPctLocal = (clusterPctLocal.get(clusterId) ?? 0) / Math.max(1, members);
        const localPctCount = clusterLocalPctCount.get(clusterId) ?? 0;
        const distPctCount = clusterDistPctCount.get(clusterId) ?? 0;
        const avgLocalPct =
          localPctCount > 0 ? (clusterLocalPctSum.get(clusterId) ?? 0) / localPctCount : null;
        const avgDistPct =
          distPctCount > 0 ? (clusterDistPctSum.get(clusterId) ?? 0) / distPctCount : null;
        const avgCombinedPct = computeCombinedPct(avgLocalPct, avgDistPct);

        const { label, description, guardrail } = guardrailFor(avgCombined, avgLocal, avgPctLocal * 100);

        clusterSummaries.push({
          id: clusterId,
          level: `Level ${clusterId + 1}`,
          label,
          description,
          guardrail,
          color: CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length],
          count: members,
          totalKg,
          avgCombined,
          avgLocal,
          avgDist,
          avgCombinedPct,
          avgLocalPct,
          avgDistPct,
          avgCoverage,
          avgPctAtOrAboveLocal: avgPctLocal * 100
        });
      });

    const geoFeatures = validLeaders.map(leader => [leader.latitude!, leader.longitude!]);
    const corridorClusterCount = Math.min(
      6,
      Math.max(2, Math.floor(validLeaders.length / 15))
    );
    const corridorLabels = runKMeans(geoFeatures, corridorClusterCount);

    const corridors: CorridorSummary[] = [];

    for (let corridorId = 0; corridorId < corridorClusterCount; corridorId++) {
      const members = validLeaders.filter((_, idx) => corridorLabels[idx] === corridorId);
      if (members.length === 0) {
        continue;
      }

      const totalKg = members.reduce(
        (sum, leader) => sum + (leader.sensitivity_total_kg ?? leader.total_kg_ordered ?? 0),
        0
      );

      const centroidLat = members.reduce((sum, leader) => sum + (leader.latitude ?? 0), 0) / members.length;
      const centroidLon =
        members.reduce((sum, leader) => sum + (leader.longitude ?? 0), 0) / members.length;

      const sensMix: Record<number, number> = {};
      members.forEach(leader => {
        const phoneKey = leader.phone?.trim();
        const idKey = leader.leader_id?.trim();
        const coordKey =
          leader.latitude !== undefined && leader.longitude !== undefined
            ? `${leader.latitude.toFixed(4)}|${leader.longitude.toFixed(4)}`
            : undefined;
        const clusterId =
          (phoneKey ? clusterAssignments.get(phoneKey) : undefined) ??
          (idKey ? clusterAssignments.get(idKey) : undefined) ??
          (coordKey ? clusterAssignments.get(coordKey) : undefined);
        if (clusterId !== undefined) {
          sensMix[clusterId] = (sensMix[clusterId] ?? 0) + 1;
        }
      });

      const dominantCluster = Number(
        Object.entries(sensMix).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0
      );
      const clusterInfo = clusterSummaries.find(summary => summary.id === dominantCluster);
      const recommendation = clusterInfo
        ? `${clusterInfo.level}: ${clusterInfo.guardrail}`
        : 'Maintain current pricing; monitor for data updates.';

      const radiusMeters = 800;

      corridors.push({
        id: corridorId,
        centroid: [centroidLat, centroidLon],
        members: members.length,
        totalKg,
        sensitivityMix: sensMix,
        recommendation,
        radiusMeters
      });
    }

    corridors.sort((a, b) => {
      if (b.members === a.members) {
        return b.totalKg - a.totalKg;
      }
      return b.members - a.members;
    });

    const corridorLegend = corridors.slice(0, 6);

    return {
      clusterSummaries,
      clusterAssignments,
      corridors: corridorLegend
    };
  }, [personaLeaders]);

  const clusterColorByKey = useMemo(() => {
    const map = new Map<string, string>();
    if (!sensitivityInsights) {
      return map;
    }
    sensitivityInsights.clusterAssignments.forEach((clusterId, key) => {
      map.set(key, CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length]);
    });
    return map;
  }, [sensitivityInsights]);

  const markerColorByKey = useMemo(() => {
    const map = new Map<string, string>();
    filteredMarkers.forEach(marker => {
      const phone = marker.data.leader_phone?.trim();
      if (phone && !map.has(phone)) {
        map.set(phone, marker.color);
      }
      const leaderId = marker.data.group_created_by?.trim();
      if (leaderId && !map.has(leaderId)) {
        map.set(leaderId, marker.color);
      }
      const lat = marker.data.latitude ?? marker.position[0];
      const lon = marker.data.longitude ?? marker.position[1];
      if (typeof lat === 'number' && typeof lon === 'number') {
        const coordKey = `${lat.toFixed(4)}|${lon.toFixed(4)}`;
        if (!map.has(coordKey)) {
          map.set(coordKey, marker.color);
        }
      }
    });
    return map;
  }, [filteredMarkers]);

  const getClusterColorForLeader = useCallback(
    (phone?: string, latitude?: number, longitude?: number, leaderId?: string) => {
      const trimmedPhone = phone?.trim();
      if (trimmedPhone && clusterColorByKey.has(trimmedPhone)) {
        return clusterColorByKey.get(trimmedPhone);
      }
      const trimmedLeaderId = leaderId?.trim();
      if (trimmedLeaderId && clusterColorByKey.has(trimmedLeaderId)) {
        return clusterColorByKey.get(trimmedLeaderId);
      }
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        const coordKey = `${latitude.toFixed(4)}|${longitude.toFixed(4)}`;
        if (clusterColorByKey.has(coordKey)) {
          return clusterColorByKey.get(coordKey);
        }
      }
      if (hideFilters) {
        if (trimmedPhone && markerColorByKey.has(trimmedPhone)) {
          return markerColorByKey.get(trimmedPhone);
        }
        if (trimmedLeaderId && markerColorByKey.has(trimmedLeaderId)) {
          return markerColorByKey.get(trimmedLeaderId);
        }
        if (typeof latitude === 'number' && typeof longitude === 'number') {
          const coordKey = `${latitude.toFixed(4)}|${longitude.toFixed(4)}`;
          if (markerColorByKey.has(coordKey)) {
            return markerColorByKey.get(coordKey);
          }
        }
      }
      return undefined;
    },
    [clusterColorByKey, markerColorByKey, hideFilters]
  );

  useEffect(() => {
    if (!sensitivityInsights) {
      setShowSensitivityClusters(false);
      setShowCorridors(false);
    }
  }, [sensitivityInsights]);

  return (
    <div className="flex h-full">
      {/* Sidebar - Filters and Stats (conditionally hidden) */}
      {!hideFilters && (
        <div className="w-[420px] bg-white shadow-lg overflow-y-auto">
          <div className="p-4 space-y-4">
            <StatisticsPanel 
              statistics={statistics} 
              filteredData={filteredMarkers.map(m => m.data)} 
              isDayFilterActive={filters.normalSelectedDays.length > 0 || filters.superSelectedDays.length > 0}
            />
            {filters.showTop15SuperLeaders && leaderAnalysis.length > 0 && (
              <TopLeadersPanel 
                leaders={leaderAnalysis} 
                radiusKm={filters.radiusKm}
              />
            )}
            <SimpleFilters 
              filters={filters} 
              onFilterChange={onFilterChange}
            />
            <MapLegend />
          </div>
        </div>
      )}

      {/* Main Content - Map */}
      <div className="flex-1 relative">
        {enableSglOverlays && hideFilters && sensitivityInsights && (
          <div className="absolute top-4 left-4 z-[1500] flex flex-col gap-3 w-[320px] pointer-events-none">
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl p-4 pointer-events-auto">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-sm text-slate-900">SGL Overlays</h3>
              </div>
              <div className="space-y-2 text-sm text-slate-700">
                <label className="flex items-center justify-between">
                  <span>Highlight sensitivity clusters</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-indigo-600"
                    checked={showSensitivityClusters}
                    onChange={event => setShowSensitivityClusters(event.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span>Show corridor heat rings</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-indigo-600"
                    checked={showCorridors}
                    onChange={event => setShowCorridors(event.target.checked)}
                  />
                </label>
              </div>
            {hideFilters && sensitivityInsights && (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Cluster Legend
                </h4>
                <div className="space-y-2 text-xs text-slate-600">
                  {sensitivityInsights.clusterSummaries.map(summary => (
                    <div
                      key={`legend-${summary.id}`}
                      className="flex items-center justify-between gap-3"
                      title={summary.description}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full inline-block"
                          style={{ backgroundColor: summary.color }}
                        ></span>
                        <span className="font-medium text-slate-700">{summary.level}</span>
                        <span className="text-slate-500">{summary.label}</span>
                      </div>
                      <div className="text-slate-500 whitespace-nowrap">
                        Avg Δ {formatPctWithEtb(summary.avgCombinedPct, summary.avgCombined)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
            {showSensitivityClusters && (
              <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl p-4 pointer-events-auto">
                <h4 className="text-sm font-semibold text-slate-900 mb-2">Cluster Guardrails</h4>
                <div className="space-y-3 text-sm text-slate-700">
                  {sensitivityInsights.clusterSummaries.map(summary => (
                    <div key={summary.id} className="border rounded-lg border-slate-100 p-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full inline-block"
                          style={{ backgroundColor: summary.color }}
                        ></span>
                        <span className="font-medium">
                          {summary.level}: {summary.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{summary.description}</p>
                      <p className="text-xs text-emerald-600 mt-1 font-medium">
                        Guardrail: {summary.guardrail}
                      </p>
                      <div className="text-xs text-slate-500 mt-2 flex flex-wrap gap-2">
                        <span>Leaders: {summary.count}</span>
                        <span>Total kg: {summary.totalKg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span>Combined Δ: {formatPctWithEtb(summary.avgCombinedPct, summary.avgCombined)}</span>
                        <span>Local Δ: {formatPctWithEtb(summary.avgLocalPct, summary.avgLocal)}</span>
                        <span>Distribution Δ: {formatPctWithEtb(summary.avgDistPct, summary.avgDist)}</span>
                        <span>Coverage: {summary.avgCoverage.toFixed(0)} days</span>
                        <span>≥ Local: {summary.avgPctAtOrAboveLocal.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showCorridors && (
              <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl p-4 pointer-events-auto">
                <h4 className="text-sm font-semibold text-slate-900 mb-2">Top Corridors (Quick Wins)</h4>
                <div className="space-y-3 text-sm text-slate-700">
                  {sensitivityInsights.corridors.map(corridor => (
                    <div key={corridor.id} className="border rounded-lg border-slate-100 p-2">
                      <div className="font-medium">Corridor #{corridor.id + 1}</div>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-2 mt-1">
                        <span>Leaders: {corridor.members}</span>
                        <span>Total kg: {corridor.totalKg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                      <p className="text-xs text-emerald-600 mt-1 font-medium">
                        Recommendation: {corridor.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="h-full">
          <MapContainer
            center={mapCenter}
            zoom={13}
            className="h-full w-full"
            zoomControl={false}
            key={`${mapCenter[0]}-${mapCenter[1]}-${filters.groupType}-${filters.normalMinGroups}-${filters.normalMaxGroups}-${filters.superMinGroups}-${filters.superMaxGroups}-${filters.normalSelectedDays.join(',')}-${filters.superSelectedDays.join(',')}`}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapUpdater center={mapCenter} />
            <ZoomControl position="topright" />
            
            {filteredMarkers.map((marker) => {
              const clusterColor =
                hideFilters && marker.data.group_deal_category === 'SUPER_GROUPS'
                  ? getClusterColorForLeader(
                      marker.data.leader_phone,
                      marker.data.latitude ?? marker.position[0],
                      marker.data.longitude ?? marker.position[1],
                      marker.data.group_created_by
                    )
                  : undefined;
              const markerColor = clusterColor ?? marker.color;

              return (
                <CircleMarker
                  key={marker.id}
                  center={marker.position}
                  radius={marker.size}
                  color={markerColor}
                  fillColor={markerColor}
                  fillOpacity={0.6}
                  weight={2}
                  eventHandlers={{
                    click: () => handleMarkerClick(marker)
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[280px]">
                      <h3 className="font-semibold text-lg mb-2">
                        {marker.data.delivery_location_name.length > 50
                          ? `${marker.data.delivery_location_name.substring(0, 50)}...`
                          : marker.data.delivery_location_name}
                      </h3>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Group Type:</span> {marker.data.group_deal_category}
                        </p>
                        <p>
                          <span className="font-medium">👤 Leader:</span>{' '}
                          {marker.data.leader_name || <span className="text-gray-400">N/A (CSV mode)</span>}
                        </p>
                        <p>
                          <span className="font-medium">📞 Phone:</span>{' '}
                          {marker.data.leader_phone || <span className="text-gray-400">N/A (CSV mode)</span>}
                        </p>
                        <p>
                          <span className="font-medium">Total Orders:</span> {marker.data.total_orders.toLocaleString()}
                        </p>
                        <p>
                          <span className="font-medium">📦 Total KG:</span>{' '}
                          {marker.data.total_kg !== undefined && marker.data.total_kg > 0
                            ? marker.data.total_kg.toLocaleString(undefined, { maximumFractionDigits: 1 })
                            : <span className="text-gray-400">N/A (CSV mode)</span>}
                        </p>
                        <p>
                          <span className="font-medium">Members:</span> {marker.data.unique_group_members}
                        </p>
                        <p>
                          <span className="font-medium">Groups:</span> {marker.data.total_groups}
                        </p>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {personaLeaders?.map((leader) => {
              const clusterColor = hideFilters
                ? getClusterColorForLeader(
                    leader.phone,
                    leader.latitude,
                    leader.longitude,
                    leader.leader_id
                  )
                : undefined;
              const combinedPct = isFiniteNumber(leader.combined_sensitivity_pct)
                ? leader.combined_sensitivity_pct
                : computeCombinedPct(leader.local_discount_pct, leader.distribution_discount_pct);
              const combinedLabel = formatPctWithEtb(combinedPct, leader.combined_sensitivity_etb);
              const localLabel = formatPctWithEtb(leader.local_discount_pct, leader.local_discount_etb);
              const distributionLabel = formatPctWithEtb(
                leader.distribution_discount_pct,
                leader.distribution_discount_etb
              );

              return (
                <Marker
                  key={`persona-${leader.phone}-${leader.latitude}-${leader.longitude}`}
                  position={[leader.latitude, leader.longitude]}
                  icon={getPersonaIcon(leader.persona, clusterColor)}
                >
                  <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                    <div className="text-xs">
                      <div className="font-semibold text-gray-900">
                        {leader.leader_name || leader.phone}
                      </div>
                      <div className="text-gray-600">
                        {leader.persona || 'Unknown persona'}
                      </div>
                      {combinedLabel !== '—' ? (
                        <div className="space-y-1">
                          <div className="text-indigo-600 font-semibold">
                            Combined Sensitivity: {combinedLabel}
                          </div>
                          <div className="text-xs text-gray-700">
                            Local discount: {localLabel}
                          </div>
                          <div className="text-xs text-gray-700">
                            Distribution discount: {distributionLabel}
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>
                              Coverage: {leader.sensitivity_coverage_days ?? 0} days •{' '}
                              {leader.sensitivity_local_observations ?? 0} local points •{' '}
                              {leader.sensitivity_distribution_observations ?? 0} distribution points
                            </div>
                            {leader.pct_volume_at_or_above_local !== null &&
                              leader.pct_volume_at_or_above_local !== undefined && (
                                <div>
                                  Volume priced ≥ local benchmark:{' '}
                                  {leader.pct_volume_at_or_above_local.toFixed(1)}%
                                </div>
                              )}
                            {(() => {
                              // Try to get benchmark data from any available source
                              const benchmark = leader.closest_benchmark || 
                                               leader.closest_local_benchmark || 
                                               leader.closest_distribution_benchmark;
                              
                              // Check for distance in various possible formats
                              const distance = benchmark?.distance_km ?? 
                                              (typeof benchmark === 'object' && benchmark !== null ? (benchmark as any).distance_km : null);
                              
                              if (distance != null && typeof distance === 'number' && !isNaN(distance) && distance > 0) {
                                const locationGroup = benchmark?.location_group || (benchmark as any)?.location_group;
                                return (
                                  <div className="text-xs text-blue-600 font-medium mt-1 pt-1 border-t border-gray-200">
                                    📍 Nearest benchmark: {distance.toFixed(2)} km away
                                    {locationGroup && (
                                      <span className="block mt-0.5">
                                        Type: {String(locationGroup).split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          {leader.product_sensitivity && leader.product_sensitivity.length > 0 && (
                            <div className="mt-2">
                              <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
                                Top Products
                              </div>
                              <ul className="mt-1 space-y-1">
                                {leader.product_sensitivity.slice(0, 5).map(product => {
                                  const backendCombinedPct = isFiniteNumber(product.borderline_discount_pct)
                                    ? product.borderline_discount_pct
                                    : undefined;
                                  const productCombinedPct = backendCombinedPct ?? computeCombinedPct(
                                    product.local_discount_pct,
                                    product.distribution_discount_pct
                                  );
                                  const productCombinedLabel = formatPctWithEtb(
                                    productCombinedPct,
                                    product.combined_sensitivity_etb
                                  );
                                  const productLocalLabel = formatPctWithEtb(
                                    product.local_discount_pct,
                                    product.local_discount_etb
                                  );
                                  const productDistributionLabel = formatPctWithEtb(
                                    product.distribution_discount_pct,
                                    product.distribution_discount_etb
                                  );

                                  const borderlinePct = (() => {
                                    if (isFiniteNumber(product.local_discount_pct)) {
                                      return product.local_discount_pct;
                                    }
                                    if (isFiniteNumber(product.borderline_discount_pct)) {
                                      return product.borderline_discount_pct;
                                    }
                                    if (isFiniteNumber(product.distribution_discount_pct)) {
                                      return product.distribution_discount_pct;
                                    }
                                    return productCombinedPct;
                                  })();
                                  const borderlineEtb = (() => {
                                    if (isFiniteNumber(product.local_discount_etb)) {
                                      return product.local_discount_etb;
                                    }
                                    if (isFiniteNumber(product.borderline_discount_etb)) {
                                      return product.borderline_discount_etb;
                                    }
                                    if (isFiniteNumber(product.distribution_discount_etb)) {
                                      return product.distribution_discount_etb;
                                    }
                                    return product.combined_sensitivity_etb;
                                  })();
                                  const borderlineLabel = formatPctWithEtb(borderlinePct, borderlineEtb);

                                  return (
                                    <li
                                      key={`${leader.phone ?? leader.leader_name ?? 'leader'}-${product.product_name}`}
                                      className="text-[11px] text-gray-700"
                                    >
                                      <div className="flex justify-between gap-2">
                                        <span className="font-semibold text-gray-900">{product.product_name}</span>
                                        <span className="text-gray-500 whitespace-nowrap">
                                          {typeof product.total_kg === 'number'
                                            ? `${product.total_kg.toFixed(1)} kg`
                                            : '—'}{' '}
                                          • {formatPct(product.volume_share_pct)}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-gray-600">
                                        Combined {productCombinedLabel} • Local {productLocalLabel} • Dist {productDistributionLabel}
                                      </div>
                                      <div className="text-[10px] text-gray-600">
                                        Borderline discount: {borderlineLabel}
                                      </div>
                                      {(product.local_observations || product.distribution_observations) && (
                                        <div className="text-[10px] text-gray-500">
                                          Obs L {product.local_observations ?? 0} • D {product.distribution_observations ?? 0}
                                        </div>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-400 italic">No sensitivity data</div>
                      )}
                    </div>
                  </Tooltip>
                </Marker>
              );
            })}
            
            {showSensitivityClusters &&
              sensitivityInsights?.clusterAssignments &&
              personaLeaders?.map((leader, index) => {
                if (
                  leader.latitude === undefined ||
                  leader.longitude === undefined ||
                  leader.latitude === null ||
                  leader.longitude === null
                ) {
                  return null;
                }
                const color =
                  getClusterColorForLeader(
                    leader.phone,
                    leader.latitude,
                    leader.longitude,
                    leader.leader_id
                  ) ?? CLUSTER_COLORS[0];
                return (
                  <Circle
                    key={`cluster-ring-${leader.phone ?? `${leader.latitude}-${leader.longitude}-${index}`}`}
                    center={[leader.latitude, leader.longitude]}
                    radius={120}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: 0.15,
                      weight: 2,
                      dashArray: '4 4'
                    }}
                  />
                );
              })}

            {showCorridors &&
              sensitivityInsights?.corridors.map(corridor => (
                <Circle
                  key={`corridor-${corridor.id}`}
                  center={corridor.centroid}
                  radius={corridor.radiusMeters}
                  pathOptions={{
                    color: '#0ea5e9',
                    fillOpacity: 0.08,
                    weight: 2,
                    dashArray: '8 6'
                  }}
                >
                  <Popup>
                    <div className="p-2 text-xs space-y-1">
                      <div className="font-semibold text-slate-800">
                        Corridor #{corridor.id + 1}
                      </div>
                      <div className="text-slate-600">
                        Leaders: {corridor.members} • Total kg:{' '}
                        {corridor.totalKg.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-slate-600">
                        Sensitivity mix:{' '}
                        {Object.entries(corridor.sensitivityMix)
                          .map(([cluster, count]) => {
                            const summary = sensitivityInsights.clusterSummaries.find(item => item.id === Number(cluster));
                            const label = summary ? summary.level : `Cluster ${Number(cluster) + 1}`;
                            return `${label}: ${count}`;
                          })
                          .join(', ')}
                      </div>
                      <div className="text-emerald-600 font-medium">
                        {corridor.recommendation}
                      </div>
                    </div>
                  </Popup>
                </Circle>
              ))}

            {warehouseLocation && (
              <Marker position={warehouseLocation} icon={warehouseIcon}>
                <Tooltip direction="top" offset={[0, -12]} opacity={1}>
                  <div className="text-xs font-semibold text-gray-800">
                    Central Warehouse Hub
                  </div>
                </Tooltip>
              </Marker>
            )}

            {/* Super Group Leader Radius Circles */}
            {filters.showSuperGroupRadius && (() => {
              const leadersMap: Record<string, { position: [number, number], data: DeliveryData }> = {};
              
              filteredMarkers
                .filter(marker => 
                  marker.data.group_deal_category === 'SUPER_GROUPS' &&
                  marker.data.total_orders > 0
                )
                .forEach(marker => {
                  const leaderId = marker.data.group_created_by;
                  if (!leadersMap[leaderId] || 
                      marker.data.total_orders > leadersMap[leaderId].data.total_orders) {
                    leadersMap[leaderId] = { position: marker.position, data: marker.data };
                  }
                });
      
              const colors = [
                '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
                '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8B739', '#52BE80',
                '#EC7063', '#AF7AC5', '#5DADE2', '#48C9B0', '#F4D03F'
              ];
              
              return Object.entries(leadersMap).map(([leaderId, { position, data }], index) => (
                <Circle
                  key={`radius-${leaderId}`}
                  center={position}
                  radius={filters.radiusKm * 1000}
                  pathOptions={{
                    color: colors[index % colors.length],
                    fillColor: colors[index % colors.length],
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: '5, 5'
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[260px]">
                      <h3 className="font-semibold text-sm mb-2">🚀 Super Group Leader</h3>
                      <div className="space-y-1 text-xs">
                        <p><span className="font-medium">👤 Leader:</span> {data.leader_name || <span className="text-gray-400">N/A</span>}</p>
                        <p><span className="font-medium">Location:</span> {data.delivery_location_name.substring(0, 35)}...</p>
                        <p><span className="font-medium">Total Orders:</span> {data.total_orders.toLocaleString()}</p>
                        <p><span className="font-medium">Coverage:</span> {filters.radiusKm} km radius</p>
                      </div>
                    </div>
                  </Popup>
                </Circle>
              ));
            })()}
          </MapContainer>
        </div>

        {/* Selected Marker Details */}
        {selectedMarker && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
            <button
              onClick={() => setSelectedMarker(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl"
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
  );
};

