export interface DeliveryData {
  group_deal_category: 'NORMAL_GROUPS' | 'SUPER_GROUPS';
  group_created_by: string;
  delivery_coordinates: string;
  delivery_location_name: string;
  unique_group_members: number;
  total_groups: number;
  monday_orders: number;
  tuesday_orders: number;
  wednesday_orders: number;
  thursday_orders: number;
  friday_orders: number;
  saturday_orders: number;
  sunday_orders: number;
  active_days: number;
  total_orders: number;
  latitude?: number;
  longitude?: number;
}

export interface MapMarker {
  id: string;
  position: [number, number];
  data: DeliveryData;
  type: 'normal' | 'super';
  size: number;
  color: string;
}

export interface Statistics {
  totalRecords: number;
  normalGroups: number;
  superGroups: number;
  totalOrders: number;
  avgOrdersPerGroup: number;
  maxOrders: number;
  uniqueLocations: number;
  avgMembersPerGroup: number;
  mostActiveLocation: string;
  geographicBounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
}

export interface FilterOptions {
  groupType: 'all' | 'NORMAL_GROUPS' | 'SUPER_GROUPS';
  minGroups: number;
  maxGroups: number;
  minGroupsPerDay: number;
  maxGroupsPerDay: number;
  searchTerm: string;
  showHeatmap: boolean;
  showClusters: boolean;
  selectedDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
}

export interface WeeklyOrders {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}
