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
      console.warn('Failed to parse coordinates:', coordStr);
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
    minGroups?: number;
    maxGroups?: number;
    minGroupsPerDay?: number;
    maxGroupsPerDay?: number;
    searchTerm?: string;
    selectedDays?: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  }): DeliveryData[] {
    let filtered = this.processData();

    if (filters.groupType && filters.groupType !== 'all') {
      filtered = filtered.filter(item => item.group_deal_category === filters.groupType);
    }

    if (filters.minGroups !== undefined) {
      filtered = filtered.filter(item => item.total_groups >= filters.minGroups!);
    }

    if (filters.maxGroups !== undefined) {
      filtered = filtered.filter(item => item.total_groups <= filters.maxGroups!);
    }

    // Groups per day filtering - check if any selected day has enough groups
    if (filters.selectedDays && filters.selectedDays.length > 0 && 
        (filters.minGroupsPerDay !== undefined || filters.maxGroupsPerDay !== undefined)) {
      filtered = filtered.filter(item => {
        const dayOrders = {
          monday: item.monday_orders,
          tuesday: item.tuesday_orders,
          wednesday: item.wednesday_orders,
          thursday: item.thursday_orders,
          friday: item.friday_orders,
          saturday: item.saturday_orders,
          sunday: item.sunday_orders
        };
        
        // Check if any selected day meets the groups per day criteria
        return filters.selectedDays!.some(day => {
          const dayOrderCount = dayOrders[day];
          const meetsMin = filters.minGroupsPerDay === undefined || dayOrderCount >= filters.minGroupsPerDay;
          const meetsMax = filters.maxGroupsPerDay === undefined || dayOrderCount <= filters.maxGroupsPerDay;
          return meetsMin && meetsMax;
        });
      });
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.delivery_location_name.toLowerCase().includes(searchLower)
      );
    }

    if (filters.selectedDays && filters.selectedDays.length > 0) {
      // FIXED: Only include locations that have orders on selected days AND show only those day's orders
      filtered = filtered
        .filter(item => {
          const dayOrders = {
            monday: item.monday_orders || 0,
            tuesday: item.tuesday_orders || 0,
            wednesday: item.wednesday_orders || 0,
            thursday: item.thursday_orders || 0,
            friday: item.friday_orders || 0,
            saturday: item.saturday_orders || 0,
            sunday: item.sunday_orders || 0
          };
          // Only include locations that have orders on selected days
          return filters.selectedDays!.some(day => dayOrders[day] > 0);
        })
        .map(item => {
          const dayOrders = {
            monday: item.monday_orders || 0,
            tuesday: item.tuesday_orders || 0,
            wednesday: item.wednesday_orders || 0,
            thursday: item.thursday_orders || 0,
            friday: item.friday_orders || 0,
            saturday: item.saturday_orders || 0,
            sunday: item.sunday_orders || 0
          };
          
          // Calculate total orders for selected days only
          const selectedDayOrders = filters.selectedDays!.reduce((sum, day) => sum + dayOrders[day], 0);
          
          // Debug logging for first few records
          if (Math.random() < 0.01) { // Log ~1% of records
            console.log('🔍 Day Filter Processing:', {
              location: item.delivery_location_name.substring(0, 30),
              originalTotal: item.total_orders,
              selectedDays: filters.selectedDays,
              dayOrders: dayOrders,
              newTotal: selectedDayOrders
            });
          }
          
          // Return a new item with ONLY the selected day's orders
          return {
            ...item,
            total_orders: selectedDayOrders,
            // Keep other metrics as they are - don't scale them down
            unique_group_members: item.unique_group_members,
            total_groups: item.total_groups
          };
        })
        .filter(item => item.total_orders > 0); // Remove items with 0 orders after filtering
      
      // Log summary
      const totalFiltered = filtered.reduce((sum, item) => sum + item.total_orders, 0);
      console.log('📊 Day Filter Summary:', {
        selectedDays: filters.selectedDays,
        recordsFiltered: filtered.length,
        totalOrders: totalFiltered
      });
    }

    return filtered;
  }
}

// CSV loading functions removed - now using API
