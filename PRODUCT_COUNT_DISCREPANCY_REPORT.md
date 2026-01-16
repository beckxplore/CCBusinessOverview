# Product Count Discrepancy Report

## Test Date: December 1, 2025
## Date Range: November 24-30, 2025 (Last 7 days)

## 🔴 CRITICAL FINDING: Data Inconsistency Detected

### Count Comparison

| Source | Count | Status |
|--------|-------|--------|
| **ClickHouse Direct Query** | **80 products** | ✅ Source of truth |
| **API Response** | **78 products** | ⚠️ Missing ClickHouse data |
| **Dashboard Display** | **130 products** | ❌ **50 products too many!** |
| **Product Costs** | **309 products** | Total products in system |

### Root Cause

The dashboard is showing **130 products** but:
- ClickHouse has only **80 products** with sales
- API returns only **78 products** (all from Google Sheets, ClickHouse not merged)
- **52 extra products** are being displayed that don't have sales in the last 7 days

### Why This Is Happening

1. **Frontend Logic Issue**: 
   - `getProductProfitability()` iterates over ALL 309 products in `productCosts`
   - It checks if each product has volume in `weeklyTotalVolumeMap`
   - The volume map is built from `productMetrics` (78 products from API)
   - But somehow 130 products are finding volume matches

2. **Product Name Matching**:
   - The `findVolumeForProduct` function might be doing fuzzy matching
   - Products with similar names might be getting matched incorrectly
   - Example: "Tomato" might match "Tomato Restaurant Quality", "Tomato/ Ripe/ Small size /", etc.

3. **Volume Map Issue**:
   - Volume maps might contain products that aren't in the API response
   - Or product name normalization is creating multiple entries

### Evidence

- **231 products** are in `productCosts` but NOT in API metrics
- **0 products** are in API metrics but NOT in `productCosts`
- Dashboard shows **130 products** = 78 (from API) + 52 (from productCosts with volume matches)

### Impact

**The dashboard is showing products that don't have sales in the last 7 days!**

This violates the requirement that "only products with sales in the last 7 days should be shown."

### Required Fixes

1. **Fix Frontend**: Only show products that are in the API response (`productMetrics`), not all products from `productCosts`
2. **Fix API**: Ensure ClickHouse data (80 products) is properly merged with Google Sheets data (78 products)
3. **Fix Product Matching**: Ensure product name matching is exact, not fuzzy

### Expected Result

After fixes:
- Dashboard should show: **80 products** (from ClickHouse) OR
- Dashboard should show: **78 products** (from Google Sheets) OR
- Dashboard should show: **Combined unique products** (if both sources merged)

**NOT 130 products!**

---

## Detailed Analysis

### ClickHouse Products (80)
- Red onion (ሃበሻ): 18,725 kg
- Potato: 12,101 kg
- Tomato: 7,059 kg
- White cabbage: 6,331 kg
- Beetroot: 3,146 kg
- ... (75 more products)

### API Products (78)
- All from Google Sheets
- No ClickHouse products merged
- All have volume > 0 ✅

### Dashboard Products (130)
- **78 products** from API ✅
- **52 products** from productCosts that found volume matches ❌
- **Total: 130 products** ❌

### Products in Costs but NOT in Metrics (231)
These are products that:
- Are in the product costs list
- Don't have sales in the last 7 days
- Should NOT be shown in the dashboard
- But might be showing if they find volume matches

---

## Conclusion

**The dashboard is NOT working correctly!**

It's showing **130 products** when it should only show **80 products** (from ClickHouse) or **78 products** (from API).

The extra **50-52 products** are products that don't have sales in the last 7 days but are being displayed because:
1. They're in the `productCosts` list
2. The frontend is finding volume matches for them (possibly through fuzzy name matching)
3. They pass the `totalVolume > 0` check even though they shouldn't

**This needs to be fixed immediately!**

