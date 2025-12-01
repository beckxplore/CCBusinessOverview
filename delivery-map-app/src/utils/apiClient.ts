import type {
  DeliveryDataResponse,
  Statistics,
  ForecastProductsResponse,
  ForecastSharesResponse,
  ForecastElasticitiesResponse,
  ForecastPersonasResponse,
  ForecastCommissionsResponse,
  ForecastWeeklySummary,
  ProductCost,
  OperationalCost,
  DailyOperationalCostsResponse,
  DailyRealMarginsResponse,
  LatestOperationalCostsResponse,
  SGLTier,
  ProductMetricsResponse,
  LocalShopPricesResponse,
  PersonaLeadersResponse,
  SglRetentionResponse,
  BenchmarkLocationsResponse,
  B2BBusinessOverview,
  B2BProfitMarginAnalysis,
  B2BCostStructureAnalysis,
  B2BRevenueTrends,
  B2BCashFlowAnalysis,
  B2BCustomerProfitability,
  B2BCreditRiskDashboard,
  B2BPaymentBehavior,
  B2BProductProfitAnalysis,
} from '../types';

function resolveApiBaseUrl(): string {
  const envUrl = import.meta.env?.VITE_API_URL as string | undefined;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const { origin } = window.location;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'http://localhost:8001/api';
    }
    return `${origin.replace(/\/$/, '')}/api`;
  }

  return 'http://localhost:8001/api';
}

const API_BASE_URL = resolveApiBaseUrl();

export class ApiClient {
  private static async fetchWithErrorHandling<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed for ${url}:`, error);
      throw error;
    }
  }

  static async getDeliveryData(): Promise<DeliveryDataResponse> {
    return await this.fetchWithErrorHandling<DeliveryDataResponse>(`${API_BASE_URL}/data`);
  }

  static async getStatistics(): Promise<Statistics> {
    return await this.fetchWithErrorHandling<Statistics>(`${API_BASE_URL}/statistics`);
  }

  static async healthCheck(): Promise<{ status: string; database: string; message?: string; error?: string }> {
    return await this.fetchWithErrorHandling(`${API_BASE_URL}/health`);
  }

  static async getForecastProducts(): Promise<ForecastProductsResponse> {
    return await this.fetchWithErrorHandling<ForecastProductsResponse>(`${API_BASE_URL}/forecast/products`);
  }

  static async getForecastShares(): Promise<ForecastSharesResponse> {
    return await this.fetchWithErrorHandling<ForecastSharesResponse>(`${API_BASE_URL}/forecast/shares`);
  }

  static async getForecastElasticities(): Promise<ForecastElasticitiesResponse> {
    return await this.fetchWithErrorHandling<ForecastElasticitiesResponse>(`${API_BASE_URL}/forecast/elasticities`);
  }

  static async getForecastPersonas(): Promise<ForecastPersonasResponse> {
    return await this.fetchWithErrorHandling<ForecastPersonasResponse>(`${API_BASE_URL}/forecast/personas`);
  }

  static async getForecastCommissions(): Promise<ForecastCommissionsResponse> {
    return await this.fetchWithErrorHandling<ForecastCommissionsResponse>(`${API_BASE_URL}/forecast/commissions`);
  }

  static async getForecastWeeklySummary(): Promise<ForecastWeeklySummary> {
    return await this.fetchWithErrorHandling<ForecastWeeklySummary>(`${API_BASE_URL}/forecast/weekly-summary`);
  }

  // Cost management endpoints
  static async getProductCosts(): Promise<{ products: ProductCost[] }> {
    return await this.fetchWithErrorHandling<{ products: ProductCost[] }>(`${API_BASE_URL}/costs/products`);
  }

  static async getOperationalCosts(): Promise<{ costs: OperationalCost[] }> {
    return await this.fetchWithErrorHandling<{ costs: OperationalCost[] }>(`${API_BASE_URL}/costs/operational`);
  }

  static async getDailyOperationalCosts(dateFrom?: string, dateTo?: string): Promise<DailyOperationalCostsResponse> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    const queryString = params.toString();
    const url = `${API_BASE_URL}/costs/daily-operational${queryString ? `?${queryString}` : ''}`;
    return await this.fetchWithErrorHandling<DailyOperationalCostsResponse>(url);
  }

  static async getDailyRealMargins(dateFrom?: string, dateTo?: string): Promise<DailyRealMarginsResponse> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    const queryString = params.toString();
    const url = `${API_BASE_URL}/margins/daily-real${queryString ? `?${queryString}` : ''}`;
    return await this.fetchWithErrorHandling<DailyRealMarginsResponse>(url);
  }

  static async getLatestOperationalCosts(): Promise<LatestOperationalCostsResponse> {
    return await this.fetchWithErrorHandling<LatestOperationalCostsResponse>(`${API_BASE_URL}/costs/operational/latest`);
  }

  static async getSGLTiers(): Promise<{ tiers: SGLTier[] }> {
    return await this.fetchWithErrorHandling<{ tiers: SGLTier[] }>(`${API_BASE_URL}/costs/tiers`);
  }

  static async getProductMetrics(): Promise<ProductMetricsResponse> {
    return await this.fetchWithErrorHandling<ProductMetricsResponse>(`${API_BASE_URL}/products/metrics`);
  }

  static async getLocalShopPrices(): Promise<LocalShopPricesResponse> {
    return await this.fetchWithErrorHandling<LocalShopPricesResponse>(`${API_BASE_URL}/benchmark/local-prices`);
  }

  static async getPersonaLeaders(): Promise<PersonaLeadersResponse> {
    return await this.fetchWithErrorHandling<PersonaLeadersResponse>(`${API_BASE_URL}/personas/leaders`);
  }

  static async getSglRetention(): Promise<SglRetentionResponse> {
    return await this.fetchWithErrorHandling<SglRetentionResponse>(`${API_BASE_URL}/sgl/retention`);
  }

  static async getBenchmarkLocations(): Promise<BenchmarkLocationsResponse> {
    return await this.fetchWithErrorHandling<BenchmarkLocationsResponse>(`${API_BASE_URL}/benchmark/locations`);
  }

  // B2B Analytics endpoints
  static async getB2BBusinessOverview(
    dateFrom?: string,
    dateTo?: string
  ): Promise<B2BBusinessOverview> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    const query = params.toString();
    return await this.fetchWithErrorHandling<B2BBusinessOverview>(
      `${API_BASE_URL}/b2b/business-overview${query ? `?${query}` : ''}`
    );
  }

  static async getB2BProfitMarginAnalysis(
    dateFrom?: string,
    dateTo?: string
  ): Promise<B2BProfitMarginAnalysis> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    const query = params.toString();
    return await this.fetchWithErrorHandling<B2BProfitMarginAnalysis>(
      `${API_BASE_URL}/b2b/profit-margin-analysis${query ? `?${query}` : ''}`
    );
  }

  static async getB2BCostStructureAnalysis(
    dateFrom?: string,
    dateTo?: string
  ): Promise<B2BCostStructureAnalysis> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    const query = params.toString();
    return await this.fetchWithErrorHandling<B2BCostStructureAnalysis>(
      `${API_BASE_URL}/b2b/cost-structure-analysis${query ? `?${query}` : ''}`
    );
  }

  static async getB2BRevenueTrends(
    dateFrom?: string,
    dateTo?: string,
    granularity: 'day' | 'week' | 'month' = 'day'
  ): Promise<B2BRevenueTrends> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    params.append('granularity', granularity);
    return await this.fetchWithErrorHandling<B2BRevenueTrends>(
      `${API_BASE_URL}/b2b/revenue-trends?${params.toString()}`
    );
  }

  static async getB2BCashFlowAnalysis(
    dateFrom?: string,
    dateTo?: string
  ): Promise<B2BCashFlowAnalysis> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    const query = params.toString();
    return await this.fetchWithErrorHandling<B2BCashFlowAnalysis>(
      `${API_BASE_URL}/b2b/cash-flow-analysis${query ? `?${query}` : ''}`
    );
  }

  static async getB2BCustomerProfitability(
    dateFrom?: string,
    dateTo?: string
  ): Promise<B2BCustomerProfitability> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    const query = params.toString();
    return await this.fetchWithErrorHandling<B2BCustomerProfitability>(
      `${API_BASE_URL}/b2b/customer-profitability${query ? `?${query}` : ''}`
    );
  }

  static async getB2BCreditRiskDashboard(
    dateFrom?: string,
    dateTo?: string
  ): Promise<B2BCreditRiskDashboard> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    const query = params.toString();
    return await this.fetchWithErrorHandling<B2BCreditRiskDashboard>(
      `${API_BASE_URL}/b2b/credit-risk-dashboard${query ? `?${query}` : ''}`
    );
  }

  static async getB2BPaymentBehavior(
    dateFrom?: string,
    dateTo?: string
  ): Promise<B2BPaymentBehavior> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    const query = params.toString();
    return await this.fetchWithErrorHandling<B2BPaymentBehavior>(
      `${API_BASE_URL}/b2b/payment-behavior${query ? `?${query}` : ''}`
    );
  }

  static async getB2BProductProfitAnalysis(
    dateFrom?: string,
    dateTo?: string
  ): Promise<B2BProductProfitAnalysis> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    const query = params.toString();
    return await this.fetchWithErrorHandling<B2BProductProfitAnalysis>(
      `${API_BASE_URL}/b2b/product-profit-analysis${query ? `?${query}` : ''}`
    );
  }
}
