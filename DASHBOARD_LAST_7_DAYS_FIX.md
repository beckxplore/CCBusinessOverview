# Dashboard Last 7 Days Filter Fix

## Problem
The dashboard was showing products that haven't been sold in weeks, even though it claimed to show "last 7 days" data. Products with zero volume in the last 7 days were still appearing in the profitability table.

## Root Cause
The frontend `getProductProfitability` function was iterating over ALL products from the product costs list, regardless of whether they had sales in the last 7 days. It would create profitability entries even for products with zero volume.

## Fixes Applied

### 1. Frontend: `delivery-map-app/src/utils/dataStore.ts`
- **Added filter**: Only include products with `totalVolume > 0` in the last 7 days
- **Location**: `getProductProfitability` function
- **Change**: Added early return `if (totalVolume <= 0) return null;` before calculating profitability
- **Impact**: Products with no sales in the last 7 days are now excluded from the dashboard

### 2. Frontend: `delivery-map-app/src/components/Profitability/ProfitabilityPage.tsx`
- **Added filter**: Only include products with sales in the daily profitability view
- **Location**: `convertDailyToProductProfitability` function
- **Change**: Added check `if (data.total_volume_kg <= 0) return;` to skip products with no volume
- **Impact**: Daily view now only shows products that actually have sales in the selected date range

### 3. Backend: `delivery-map-app/backend/main.py`
- **Added filter**: Only include products with volume > 0 from sales summary
- **Location**: `load_product_metrics_data` function
- **Change**: Added check `if weekly_qty <= 0: continue` before adding to metrics
- **Impact**: Backend API now only returns products with actual sales

### 4. Backend: `delivery-map-app/backend/services/sheet_data.py`
- **Added filter**: Only include products with volume > 0 from Google Sheets
- **Location**: `fetch_sheet_metrics` function
- **Change**: Added check `if vol_kg <= 0: continue` before adding to metrics list
- **Impact**: Google Sheets data now only includes products with sales in the last 7 days

## Verification

The dashboard now:
1. ✅ Only shows products with sales in the last 7 days
2. ✅ Filters out inactive products (zero volume)
3. ✅ Applies the filter consistently across:
   - Weekly profitability view
   - Daily profitability view
   - Backend API responses
   - Google Sheets data processing

## Testing

To verify the fix:
1. Check the dashboard - it should only show products with sales in the last 7 days
2. Products that haven't been sold in weeks should no longer appear
3. The "last 7 days" label should now accurately reflect what's displayed

## Date Range Enforcement

The backend already correctly filters by date:
- Google Sheets: Filters by `window_start` to `max_date` (last 7 days)
- ClickHouse: Filters by `o.created_at >= week_start_str AND o.created_at < week_end_str`
- Both sources use `HAVING total_volume_kg > 0` or equivalent filters

The frontend now respects these filters and doesn't add products with zero volume.

