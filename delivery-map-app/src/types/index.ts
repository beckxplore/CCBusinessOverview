export interface DeliveryData {
  group_deal_category: 'NORMAL_GROUPS' | 'SUPER_GROUPS';
  group_created_by: string;
  leader_name?: string;
  leader_phone?: string;
  delivery_coordinates: string;
  delivery_location_name: string;
  total_kg?: number;
  last_order_date?: string;
  products_ordered?: number;
  avg_kg_per_ordering_day?: number;
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

export interface DeliveryDataResponse {
  records: DeliveryData[];
  count: number;
  window?: {
    start: string;
    end: string;
  };
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
  mostActiveLocation?: string;
  geographicBounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  window?: {
    start: string;
    end: string;
  };
}

export interface ForecastWeeklySummary {
  week_start: string | null;
  orders: number | null;
  total_kg: number | null;
  source?: 'clickhouse' | 'fallback';
}

export interface FilterOptions {
  groupType: 'all' | 'NORMAL_GROUPS' | 'SUPER_GROUPS';
  // Normal Groups filters
  normalMinGroups: number;
  normalMaxGroups: number;
  normalMinGroupsPerDay: number;
  normalMaxGroupsPerDay: number;
  normalSelectedDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  // Super Groups filters
  superMinGroups: number;
  superMaxGroups: number;
  superMinGroupsPerDay: number;
  superMaxGroupsPerDay: number;
  superSelectedDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  searchTerm: string;
  showHeatmap: boolean;
  showClusters: boolean;
  showSuperGroupRadius: boolean;
  radiusKm: number;
  showTop15SuperLeaders: boolean;
  minOrders: number; // added for MapControls order range
  maxOrders: number; // added for MapControls order range
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

export interface ForecastProductsResponse {
  products: string[];
}

export interface ForecastSharesResponse {
  shares: Record<string, number>;
  overall_sum: number;
}

export interface ForecastElasticitiesResponse {
  elasticities: Record<string, number>;
}

export interface PersonaDefinition {
  name: string;
  elasticity: number;
  leader_count: number;
  avg_kg_per_day: number;
  avg_price_vs_local: number;
}

export interface ForecastPersonasResponse {
  personas: PersonaDefinition[];
}

export interface CommissionData {
  recommended_commission: number;
  commission_pct_of_price: number;
  min_commission: number;
  max_commission: number;
  notes: string;
}

export interface ForecastCommissionsResponse {
  commissions: Record<string, CommissionData>;
}

export interface ProductSensitivityEntry {
  product_name: string;
  total_kg: number;
  volume_share_pct: number;
  combined_sensitivity_etb?: number | null;
  borderline_discount_etb?: number | null;
  borderline_discount_pct?: number | null;
  local_discount_etb?: number | null;
  distribution_discount_etb?: number | null;
  local_discount_pct?: number | null;
  distribution_discount_pct?: number | null;
  local_observations?: number;
  distribution_observations?: number;
  pct_volume_at_or_above_local?: number | null;
}

export interface ProductMetric {
  product_name: string;
  product_id?: string | null;
  total_volume_kg: number;
  sgl_volume_kg: number;
  normal_volume_kg: number;
  avg_selling_price: number;
  latest_selling_price: number;
  total_revenue_etb: number;
  order_count: number;
}

export interface ProductMetricsResponse {
  metrics: ProductMetric[];
  lookback_days: number;
  window?: {
    start: string;
    end: string;
  };
}

export interface LocalShopPriceEntry {
  product_name: string;
  price: number;
  last_checked?: string | null;
  source?: string;
}

export interface LocalShopPricesResponse {
  prices: LocalShopPriceEntry[];
}

export interface PersonaLeader {
  phone: string;
  leader_name?: string;
  leader_id?: string;
  persona?: string;
  total_kg_ordered?: number;
  avg_kg_per_order_day?: number;
  wallet_commission?: number;
  price_sensitivity?: number | null;
  combined_sensitivity_etb?: number | null;
  combined_sensitivity_pct?: number | null;
  local_discount_etb?: number | null;
  distribution_discount_etb?: number | null;
  local_discount_pct?: number | null;
  distribution_discount_pct?: number | null;
  sensitivity_coverage_days?: number;
  sensitivity_local_observations?: number;
  sensitivity_distribution_observations?: number;
  pct_volume_at_or_above_local?: number | null;
  sensitivity_source_flags?: {
    benchmark_api?: boolean;
    distribution_fallback?: boolean;
  };
  sensitivity_period?: {
    start_date: string;
    end_date: string;
  };
  sensitivity_total_kg?: number | null;
  product_sensitivity?: ProductSensitivityEntry[];
  closest_benchmark?: {
    distance_km?: number | null;
    location_group?: string | null;
    location?: string | null;
  };
  closest_local_benchmark?: {
    distance_km?: number | null;
    location_group?: string | null;
    location?: string | null;
  };
  closest_distribution_benchmark?: {
    distance_km?: number | null;
    location_group?: string | null;
    location?: string | null;
  };
  latitude: number;
  longitude: number;
  delivery_location?: string;
}

export interface PersonaLeadersResponse {
  leaders: PersonaLeader[];
}

export interface SglRetentionWeek {
  week_start: string;
  active_leaders: number;
  avg_unit_price?: number | null;
  retained_pct?: number | null;
  price_down?: {
    local_etb?: number | null;
    local_pct?: number | null;
    distribution_etb?: number | null;
    distribution_pct?: number | null;
    sunday_etb?: number | null;
    sunday_pct?: number | null;
  };
}

export interface SglRetentionProduct {
  product: string;
  weeks: SglRetentionWeek[];
}

export interface SglRetentionResponse {
  products: SglRetentionProduct[];
  window?: {
    start: string;
    end: string;
  };
}

export interface BenchmarkProductPrice {
  name: string;
  price: number;
  date?: string;
}

export interface BenchmarkLocation {
  location: string;
  location_group: string;
  latitude: number;
  longitude: number;
  products: BenchmarkProductPrice[];
}

export interface BenchmarkLocationsResponse {
  locations: BenchmarkLocation[];
}

// Cost tracking types
export interface ProductCost {
  product_name: string;
  procurement_cost: number;
  operational_cost: number;
  sgl_commission: number;
  regular_commission: number;
  selling_price: number;
  notes: string;
}

export interface OperationalCost {
  cost_category: string;
  cost_per_kg: number;
  description: string;
  optimization_potential: 'Low' | 'Medium' | 'High';
}

export interface SGLTier {
  tier_name: string;
  description: string;
  commission_etb_per_kg: number;
  cost_savings_logistics: number;
  cost_savings_packaging: number;
  cost_savings_assistant: number;
}

export interface ProductProfitability {
  product: string;
  procurement: number;
  operations: number;
  commission: number;
  total_cost: number;
  selling_price: number;
  margin_per_kg: number;
  margin_pct: number;
  local_shop_price: number;
  discount_pct: number;
  weekly_volume_kg: number;
  weekly_revenue: number;
  weekly_profit: number;
}

export interface ProfitabilityFilters {
  groupType?: 'all' | 'sgl' | 'regular';
  sortBy?: 'margin_per_kg' | 'margin_pct' | 'weekly_profit' | 'weekly_volume_kg';
  sortOrder?: 'asc' | 'desc';
}

export interface ScenarioParams {
  priceChanges?: Record<string, number>;
  commissionChanges?: Record<string, number>;
  procurementChanges?: Record<string, number>;
  tierChanges?: Record<string, string>;
  volumeOverrides?: Record<string, number>;
  operationalCostMultipliers?: {
    logistics?: number;
    packaging?: number;
    warehouse?: number;
  };
}

export interface SimulationResult {
  current: {
    total_revenue: number;
    total_cost: number;
    total_profit: number;
    products: ProductProfitability[];
  };
  scenario: {
    total_revenue: number;
    total_cost: number;
    total_profit: number;
    products: ProductProfitability[];
  };
  delta: {
    revenue_change: number;
    cost_change: number;
    profit_change: number;
    profit_change_pct: number;
  };
}

// ========== B2B Analytics Types ==========

export interface B2BDateRange {
  from: string;
  to: string;
}

export interface B2BBusinessOverview {
  revenue?: number;
  orders?: number;
  profit?: number;
  profit_margin?: number;
  total_customers?: number;
  avg_order_value?: number;
  date_range?: B2BDateRange;
}

export interface B2BProfitMarginAnalysis {
  cm1?: number; // Contribution Margin 1
  cm2?: number; // Contribution Margin 2
  cm3?: number; // Contribution Margin 3
  cm1_pct?: number;
  cm2_pct?: number;
  cm3_pct?: number;
  breakdown?: Array<{
    category: string;
    cm1: number;
    cm2: number;
    cm3: number;
  }>;
  date_range?: B2BDateRange;
}

export interface B2BCostStructureAnalysis {
  cogs?: number;
  warehouse_costs?: number;
  delivery_costs?: number;
  other_costs?: number;
  total_costs?: number;
  breakdown?: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  date_range?: B2BDateRange;
}

export interface B2BRevenueTrends {
  trends?: Array<{
    date: string;
    revenue: number;
    orders?: number;
  }>;
  granularity?: 'day' | 'week' | 'month';
  total_revenue?: number;
  avg_daily_revenue?: number;
  growth_rate?: number;
  date_range?: B2BDateRange;
}

export interface B2BCashFlowAnalysis {
  cash_in?: number;
  cash_out?: number;
  net_cash_flow?: number;
  by_payment_method?: Array<{
    method: string;
    cash_in?: number;
    cash_out?: number;
    net?: number;
  }>;
  date_range?: B2BDateRange;
}

export interface B2BCustomerProfitability {
  customers?: Array<{
    customer_id: string;
    customer_name?: string;
    cltv?: number; // Customer Lifetime Value
    margin?: number;
    revenue?: number;
    orders?: number;
    avg_order_value?: number;
  }>;
  total_cltv?: number;
  avg_cltv?: number;
  top_customers?: number;
  date_range?: B2BDateRange;
}

export interface B2BCreditRiskDashboard {
  credit_stages?: Array<{
    stage: string;
    amount: number;
    customer_count: number;
    percentage: number;
  }>;
  overdue_amount?: number;
  overdue_customers?: number;
  total_outstanding?: number;
  risk_distribution?: Array<{
    risk_level: 'low' | 'medium' | 'high';
    amount: number;
    customers: number;
  }>;
  date_range?: B2BDateRange;
}

export interface B2BPaymentBehavior {
  dso?: number; // Days Sales Outstanding
  payment_history?: Array<{
    period: string;
    avg_days_to_pay: number;
    on_time_pct: number;
    overdue_pct: number;
  }>;
  payment_methods?: Array<{
    method: string;
    usage_count: number;
    total_amount: number;
    avg_days_to_pay: number;
  }>;
  trends?: {
    dso_trend?: 'improving' | 'stable' | 'worsening';
    avg_days_to_pay?: number;
    on_time_rate?: number;
  };
  date_range?: B2BDateRange;
}

export interface B2BProductProfitAnalysis {
  products: Array<{
    product_name: string;
    total_revenue: number;
    total_quantity_kg: number;
    total_orders: number;
    purchase_price_used: number;
    total_cogs: number;
    warehouse_costs: number;
    delivery_costs: number;
    total_profit: number;
    profit_margin_percent: number;
    profit_per_kg: number;
    days_with_data: number;
  }>;
  summary: {
    total_products: number;
    total_revenue: number;
    total_profit: number;
    avg_profit_margin: number;
  };
  period: B2BDateRange;
  error?: string;
}
