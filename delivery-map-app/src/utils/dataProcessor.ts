import type { DeliveryData, Statistics, MapMarker, WeeklyOrders } from '../types';

export class DataProcessor {
  private data: DeliveryData[] = [];

  constructor(data: DeliveryData[]) {
    this.data = data;
  }

  parseCoordinates(coordStr: string): [number, number] {
    try {
      if (coordStr.startsWith('POINT(')) {
        const coords = coordStr.slice(6, -1); // Remove 'POINT(' and ')'
        const parts = coords.split(' ');
        if (parts.length === 2) {
          return [parseFloat(parts[1]), parseFloat(parts[0])]; // [lat, lon]
        }
      }
    } catch (error) {
      console.warn('Failed to parse coordinates:', coordStr, error);
    }
    return [0, 0];
  }

  processData(): DeliveryData[] {
    // Data from API already has latitude and longitude parsed
    return this.data.filter(item => 
      item.latitude !== undefined && 
      item.longitude !== undefined && 
      item.latitude !== 0 && 
      item.longitude !== 0
    );
  }

  generateStatistics(): Statistics {
    const processedData = this.processData();
    const normalGroups = processedData.filter(item => item.group_deal_category === 'NORMAL_GROUPS');
    const superGroups = processedData.filter(item => item.group_deal_category === 'SUPER_GROUPS');
    
    const totalOrders = processedData.reduce((sum, item) => sum + item.total_orders, 0);
    const maxOrdersItem = processedData.reduce((max, item) => 
      item.total_orders > max.total_orders ? item : max, processedData[0]);

    return {
      totalRecords: processedData.length,
      normalGroups: normalGroups.length,
      superGroups: superGroups.length,
      totalOrders,
      avgOrdersPerGroup: totalOrders / processedData.length,
      maxOrders: maxOrdersItem?.total_orders || 0,
      uniqueLocations: new Set(processedData.map(item => item.delivery_location_name)).size,
      avgMembersPerGroup: processedData.reduce((sum, item) => sum + item.unique_group_members, 0) / processedData.length,
      mostActiveLocation: maxOrdersItem?.delivery_location_name || '',
      geographicBounds: {
        minLat: Math.min(...processedData.map(item => item.latitude!)),
        maxLat: Math.max(...processedData.map(item => item.latitude!)),
        minLon: Math.min(...processedData.map(item => item.longitude!)),
        maxLon: Math.max(...processedData.map(item => item.longitude!))
      }
    };
  }

  generateMapMarkers(): MapMarker[] {
    const processedData = this.processData();
    
    return processedData.map((item, index) => {
      const isSuperGroup = item.group_deal_category === 'SUPER_GROUPS';
      const size = Math.min(20, Math.max(5, item.total_orders / 10));
      
      return {
        id: `${item.group_created_by}-${index}`,
        position: [item.latitude!, item.longitude!],
        data: item,
        type: isSuperGroup ? 'super' : 'normal',
        size,
        color: isSuperGroup ? '#ef4444' : '#3b82f6'
      };
    });
  }

  getWeeklyOrdersData(): WeeklyOrders[] {
    const processedData = this.processData();
    
    return processedData.map(item => ({
      monday: item.monday_orders,
      tuesday: item.tuesday_orders,
      wednesday: item.wednesday_orders,
      thursday: item.thursday_orders,
      friday: item.friday_orders,
      saturday: item.saturday_orders,
      sunday: item.sunday_orders
    }));
  }

  getTopLocations(limit: number = 10): DeliveryData[] {
    return this.processData()
      .sort((a, b) => b.total_orders - a.total_orders)
      .slice(0, limit);
  }

  getLocationDistribution(): { [key: string]: number } {
    const processedData = this.processData();
    const distribution: { [key: string]: number } = {};
    
    processedData.forEach(item => {
      const location = item.delivery_location_name;
      distribution[location] = (distribution[location] || 0) + 1;
    });
    
    return distribution;
  }

  filterData(filters: {
    groupType?: 'all' | 'NORMAL_GROUPS' | 'SUPER_GROUPS';
    normalMinGroups?: number;
    normalMaxGroups?: number;
    normalMinGroupsPerDay?: number;
    normalMaxGroupsPerDay?: number;
    normalSelectedDays?: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
    superMinGroups?: number;
    superMaxGroups?: number;
    superMinGroupsPerDay?: number;
    superMaxGroupsPerDay?: number;
    superSelectedDays?: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
    searchTerm?: string;
  }): DeliveryData[] {
    let filtered = this.processData();

    if (filters.groupType && filters.groupType !== 'all') {
      filtered = filtered.filter(item => item.group_deal_category === filters.groupType);
    }

    // Apply Normal Groups filters
    const normalFiltered = filtered
      .filter(item => item.group_deal_category === 'NORMAL_GROUPS')
      .filter(item => {
        // Min/Max Groups filter
        if (filters.normalMinGroups !== undefined && item.total_groups < filters.normalMinGroups) return false;
        if (filters.normalMaxGroups !== undefined && item.total_groups > filters.normalMaxGroups) return false;
        
        // Groups per day filtering for Normal Groups
        if (filters.normalSelectedDays && filters.normalSelectedDays.length > 0 && 
            (filters.normalMinGroupsPerDay !== undefined || filters.normalMaxGroupsPerDay !== undefined)) {
          const dayOrders = {
            monday: item.monday_orders,
            tuesday: item.tuesday_orders,
            wednesday: item.wednesday_orders,
            thursday: item.thursday_orders,
            friday: item.friday_orders,
            saturday: item.saturday_orders,
            sunday: item.sunday_orders
          };
          
          const meetsGroupsPerDay = filters.normalSelectedDays.some(day => {
            const dayOrderCount = dayOrders[day];
            const meetsMin = filters.normalMinGroupsPerDay === undefined || dayOrderCount >= filters.normalMinGroupsPerDay;
            const meetsMax = filters.normalMaxGroupsPerDay === undefined || dayOrderCount <= filters.normalMaxGroupsPerDay;
            return meetsMin && meetsMax;
          });
          
          if (!meetsGroupsPerDay) return false;
        }
        
        return true;
      });

    // Apply Super Groups filters
    const superFiltered = filtered
      .filter(item => item.group_deal_category === 'SUPER_GROUPS')
      .filter(item => {
        // Min/Max Groups filter
        if (filters.superMinGroups !== undefined && item.total_groups < filters.superMinGroups) return false;
        if (filters.superMaxGroups !== undefined && item.total_groups > filters.superMaxGroups) return false;
        
        // Groups per day filtering for Super Groups
        if (filters.superSelectedDays && filters.superSelectedDays.length > 0 && 
            (filters.superMinGroupsPerDay !== undefined || filters.superMaxGroupsPerDay !== undefined)) {
          const dayOrders = {
            monday: item.monday_orders,
            tuesday: item.tuesday_orders,
            wednesday: item.wednesday_orders,
            thursday: item.thursday_orders,
            friday: item.friday_orders,
            saturday: item.saturday_orders,
            sunday: item.sunday_orders
          };
          
          const meetsGroupsPerDay = filters.superSelectedDays.some(day => {
            const dayOrderCount = dayOrders[day];
            const meetsMin = filters.superMinGroupsPerDay === undefined || dayOrderCount >= filters.superMinGroupsPerDay;
            const meetsMax = filters.superMaxGroupsPerDay === undefined || dayOrderCount <= filters.superMaxGroupsPerDay;
            return meetsMin && meetsMax;
          });
          
          if (!meetsGroupsPerDay) return false;
        }
        
        return true;
      });

    // Combine filtered results
    filtered = [...normalFiltered, ...superFiltered];

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.delivery_location_name.toLowerCase().includes(searchLower)
      );
    }

    // Apply day filtering separately for Normal and Super Groups
    filtered = filtered.map(item => {
      const dayOrders = {
        monday: item.monday_orders || 0,
        tuesday: item.tuesday_orders || 0,
        wednesday: item.wednesday_orders || 0,
        thursday: item.thursday_orders || 0,
        friday: item.friday_orders || 0,
        saturday: item.saturday_orders || 0,
        sunday: item.sunday_orders || 0
      };
      
      // Determine which day filter to use based on group type
      const selectedDays = item.group_deal_category === 'NORMAL_GROUPS' 
        ? filters.normalSelectedDays 
        : filters.superSelectedDays;
      
      // If no days selected for this group type, return as is
      if (!selectedDays || selectedDays.length === 0) {
        return item;
      }
      
      // Check if has orders on any selected day
      const hasOrdersOnSelectedDays = selectedDays.some(day => dayOrders[day] > 0);
      if (!hasOrdersOnSelectedDays) {
        return null; // Will be filtered out
      }
      
      // Calculate total orders for selected days only
      const selectedDayOrders = selectedDays.reduce((sum, day) => sum + dayOrders[day], 0);
      
      // Return item with updated total_orders
      return {
        ...item,
        total_orders: selectedDayOrders,
        unique_group_members: item.unique_group_members,
        total_groups: item.total_groups
      };
    }).filter((item): item is DeliveryData => item !== null && item.total_orders > 0);
    
    // Log summary if any day filters are active
    if ((filters.normalSelectedDays && filters.normalSelectedDays.length > 0) || 
        (filters.superSelectedDays && filters.superSelectedDays.length > 0)) {
      const totalFiltered = filtered.reduce((sum, item) => sum + item.total_orders, 0);
      console.log('📊 Day Filter Summary:', {
        normalDays: filters.normalSelectedDays,
        superDays: filters.superSelectedDays,
        recordsFiltered: filtered.length,
        totalOrders: totalFiltered
      });
    }

    return filtered;
  }
}

// CSV loading functions removed - now using API
