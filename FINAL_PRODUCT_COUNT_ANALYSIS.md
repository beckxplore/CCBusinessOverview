# Final Product Count Analysis

## Test Date: December 1, 2025
## Date Range: November 24-30, 2025 (Last 7 days)

## Results Summary

### Counts from Different Sources

| Source | Product Count | Notes |
|--------|---------------|-------|
| **ClickHouse Direct Query** | **80 products** | Unique products with sales in Nov 24-30, 2025 |
| **API Response** | **78 products** | All from Google Sheets (ClickHouse data not merged) |
| **Dashboard Display** | **130 products** | Frontend showing products with volume > 0 |
| **Product Costs** | **309 products** | Total products in system |

### Key Findings

#### ✅ ClickHouse Query (Direct)
- **Unique Products**: 80
- **Total Volume**: 74,056 kg
- **Filter**: `HAVING total_volume_kg > 0`
- **Date Range**: Nov 24-30, 2025
- **Status**: ✅ Correct - Only products with sales

#### ⚠️ API Response
- **Total Products**: 78
- **Source**: All from Google Sheets
- **ClickHouse Products**: 0 (not merged)
- **Status**: ⚠️ **ISSUE** - ClickHouse data not being merged

#### ⚠️ Dashboard Display
- **Total Products**: 130
- **Source**: Frontend iterates over `productCosts` (309 products)
- **Filter**: Shows products where `totalVolume > 0`
- **Status**: ⚠️ **ISSUE** - Showing more products than API/ClickHouse

### Root Cause Analysis

1. **API Issue**: The API is returning only Google Sheets data (78 products) and not merging ClickHouse data (80 products). This suggests ClickHouse connection might be failing or products are being skipped.

2. **Frontend Issue**: The frontend `getProductProfitability` function iterates over ALL 309 products in `productCosts` and checks if they have volume. This means it's showing products that:
   - Have volume from volume maps (which might include aggregated data)
   - Are in the product costs list
   - But may not actually have sales in the last 7 days

3. **Volume Map Issue**: The volume maps are built from `productMetrics`, but if the API only returns 78 products, the volume maps might be incomplete or include products from other sources.

### Expected Behavior

The dashboard should show:
- **80 products** (from ClickHouse) OR
- **78 products** (from Google Sheets) OR  
- **Combined unique products** (if both sources are merged)

But it's showing **130 products**, which is 50-52 more than the actual data sources.

### Recommendations

1. **Fix API**: Ensure ClickHouse data is properly merged with Google Sheets data
2. **Fix Frontend**: Only show products that are in the API response, not all products from `productCosts`
3. **Verify Volume Maps**: Ensure volume maps only contain products with sales in last 7 days

---

## Detailed Comparison

### ClickHouse Products (80)
- Red onion (ሃበሻ): 18,725 kg
- Potato: 12,101 kg
- Tomato: 7,059 kg
- White cabbage: 6,331 kg
- Beetroot: 3,146 kg
- ... (76 more products)

### API Products (78)
- All from Google Sheets
- No ClickHouse products merged
- All have volume > 0 ✅

### Dashboard Products (130)
- Includes products from `productCosts` that have volume
- May include products with aggregated/estimated volumes
- More than actual sales data

---

## Conclusion

**The dashboard is showing 130 products, but only 80 products actually have sales in ClickHouse for Nov 24-30, 2025.**

This is a **data consistency issue** that needs to be fixed:
1. API should merge ClickHouse and Google Sheets data properly
2. Frontend should only show products from the API response, not all products from `productCosts`

