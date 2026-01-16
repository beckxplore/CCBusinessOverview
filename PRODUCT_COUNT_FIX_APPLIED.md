# Product Count Fix Applied

## Issue Found
- **Dashboard shows**: 130 products
- **ClickHouse has**: 80 products with sales
- **API returns**: 78 products
- **Discrepancy**: 50-52 extra products being shown

## Root Cause
The frontend `getProductProfitability()` function was:
1. Iterating over ALL 309 products in `productCosts`
2. Using fuzzy/partial name matching in `findVolumeForProduct()`
3. This caused products without sales to match similar product names and show up

Example:
- "Tomato" matches "Tomato Restaurant Quality", "Tomato/ Ripe/ Small size /", etc.
- "Avocado" matches "Avocado Ripe", "Avocado OG", "Avo avocado hair oil", etc.
- "Red Onion" matches "Red Onion C", "Red Onion B", "Red Onion Qelafo", etc.

## Fix Applied
Changed `getProductProfitability()` to:
1. **Only iterate over products that are in `productMetrics`** (from API)
2. Filter `productCosts` to only include products with sales in last 7 days
3. This ensures only products from the API response are shown

## Expected Result
After fix:
- Dashboard should show: **78 products** (from API) OR
- Dashboard should show: **80 products** (if ClickHouse data is merged)

**NOT 130 products!**

## Test Required
Please verify:
1. Dashboard now shows 78-80 products (not 130)
2. All shown products have sales in last 7 days
3. No inactive products are displayed

