import type { DeliveryData, Statistics } from '../types';

const API_BASE_URL = 'http://localhost:8003/api';

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

  static async getDeliveryData(): Promise<DeliveryData[]> {
    const response = await this.fetchWithErrorHandling<{ data: DeliveryData[]; count: number }>(
      `${API_BASE_URL}/data`
    );
    return response.data;
  }

  static async getStatistics(): Promise<Statistics> {
    return await this.fetchWithErrorHandling<Statistics>(`${API_BASE_URL}/statistics`);
  }

  static async healthCheck(): Promise<{ status: string; database: string; message?: string; error?: string }> {
    return await this.fetchWithErrorHandling(`${API_BASE_URL}/health`);
  }
}
