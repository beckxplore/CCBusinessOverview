# Daily Product Profitability Implementation

## Summary

Implemented a new endpoint `/api/products/daily-profitability` that fetches daily product sales from ClickHouse and calculates profitability using daily prices from Google Sheets.

## Backend Implementation

### Endpoint
- **Path**: `/api/products/daily-profitability`
- **Method**: GET
- **Query Parameters**:
  - `date_from` (optional): Start date (YYYY-MM-DD), defaults to 2025-04-01
  - `date_to` (optional): End date (YYYY-MM-DD)

### Features

1. **Fetches Daily Product Sales from ClickHouse**
   - Uses the provided SQL query to get:
     - Product name
     - Total volume sold
     - Volume sold via normal group
     - Volume sold via super group
     - Date

2. **Fetches Daily Prices from Google Sheets**
   - Selling prices (from `price` column or calculated from `final_revenue` / `final_volume_kg`)
   - Purchase prices (from `PurchasingPrice` column or calculated from `final_cost` / `final_volume_kg`)
   - Matches by date and product name

3. **Calculates Profitability**
   - Revenue = total_volume × selling_price
   - Purchase cost = total_volume × purchase_price
   - Commission = volume_super_group × commission_rate (from COMMISSION_LOOKUP.csv)
   - Profit = Revenue - Purchase Cost - Commission
   - Profit margin percentage

4. **Commission Assignment**
   - Only applied to super group volumes
   - Rates loaded from `COMMISSION_LOOKUP.csv`
   - Falls back to 0 if no commission defined for product

### Response Structure

```json
{
  "daily_products": [
    {
      "date": "2025-04-01",
      "product_name": "Product Name",
      "total_volume_kg": 100.0,
      "volume_normal_group_kg": 60.0,
      "volume_super_group_kg": 40.0,
      "selling_price_per_kg": 50.0,
      "purchase_price_per_kg": 30.0,
      "total_revenue_etb": 5000.0,
      "total_purchase_cost_etb": 3000.0,
      "super_group_commission_etb": 120.0,
      "commission_rate_per_kg": 3.0,
      "total_cost_etb": 3120.0,
      "profit_etb": 1880.0,
      "profit_margin_pct": 37.6
    }
  ],
  "count": 1,
  "date_range": {
    "from": "2025-04-01",
    "to": "2025-04-01"
  }
}
```

## Frontend Implementation

### TypeScript Types Added

**File**: `delivery-map-app/src/types/index.ts`

```typescript
export interface DailyProductProfitability {
  date: string;
  product_name: string;
  total_volume_kg: number;
  volume_normal_group_kg: number;
  volume_super_group_kg: number;
  selling_price_per_kg: number;
  purchase_price_per_kg: number;
  total_revenue_etb: number;
  total_purchase_cost_etb: number;
  super_group_commission_etb: number;
  commission_rate_per_kg: number;
  total_cost_etb: number;
  profit_etb: number;
  profit_margin_pct: number;
}

export interface DailyProductProfitabilityResponse {
  daily_products: DailyProductProfitability[];
  count: number;
  date_range?: {
    from: string | null;
    to: string | null;
  };
  message?: string;
}
```

### API Client Method Added

**File**: `delivery-map-app/src/utils/apiClient.ts`

```typescript
static async getDailyProductProfitability(
  dateFrom?: string,
  dateTo?: string
): Promise<DailyProductProfitabilityResponse> {
  const params = new URLSearchParams();
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo) params.append('date_to', dateTo);
  const query = params.toString();
  return await this.fetchWithErrorHandling<DailyProductProfitabilityResponse>(
    `${API_BASE_URL}/products/daily-profitability${query ? `?${query}` : ''}`
  );
}
```

## Usage Example

### Backend (Python)
```python
import requests

response = requests.get(
    "http://localhost:8001/api/products/daily-profitability",
    params={
        "date_from": "2025-04-01",
        "date_to": "2025-04-05"
    }
)
data = response.json()
```

### Frontend (TypeScript)
```typescript
import { ApiClient } from './utils/apiClient';

const data = await ApiClient.getDailyProductProfitability(
  "2025-04-01",
  "2025-04-05"
);

console.log(`Found ${data.count} daily product entries`);
data.daily_products.forEach(product => {
  console.log(`${product.product_name}: ${product.profit_etb} ETB profit`);
});
```

## Testing

A test script is available at:
- `delivery-map-app/backend/test_daily_profitability_endpoint.py`

Run it with:
```bash
cd delivery-map-app/backend
python test_daily_profitability_endpoint.py
```

**Note**: Make sure the backend server is running on port 8001 before testing.

## Files Modified

### Backend
- `delivery-map-app/backend/main.py` - Added endpoint implementation

### Frontend
- `delivery-map-app/src/types/index.ts` - Added TypeScript interfaces
- `delivery-map-app/src/utils/apiClient.ts` - Added API client method

## Next Steps

To use this endpoint in the frontend:

1. Import the API client method in your component:
   ```typescript
   import { ApiClient } from '../utils/apiClient';
   ```

2. Call the endpoint:
   ```typescript
   const data = await ApiClient.getDailyProductProfitability(dateFrom, dateTo);
   ```

3. Display the data in your component (e.g., in a table or chart)

## Notes

- The endpoint handles product name normalization for matching between ClickHouse and Google Sheets
- Falls back to product-level prices if daily prices are not available
- Commission rates are loaded from `COMMISSION_LOOKUP.csv` file
- All prices and costs are in ETB (Ethiopian Birr)
- Volumes are in kilograms (kg)

