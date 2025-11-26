# TODO: Real Data Integration

## Current Status

Dashboard V2.0 is **fully functional** with placeholder data. To get **real business insights**, integrate actual volume data.

---

## What's Using Placeholder Data

### 1. Product Volume (Weekly)
**Current**: Hardcoded 8 products
```typescript
const dummyVolumeData = {
  'Potato': 12000,
  'Avocado': 5000,
  // ... etc
};
```

**Source**: Available in `data_points/Weekly per product Volume normal vs SGL.csv`

**What to do**:
- Parse CSV to get latest week's volume per product
- Separate SGL vs Regular volumes
- Update ProfitabilityPage, OverviewPage, PlaygroundPage to use real data

### 2. Local Shop Prices
**Current**: Hardcoded from historical data
```typescript
const dummyLocalPrices = {
  'Potato': 38.06,
  // ... etc
};
```

**Source**: Available in `data_points/Local shop price history.csv`

**What to do**:
- Parse CSV to get latest prices
- Match product names (handle variations)
- Update all components using local prices

### 3. Product Elasticities
**Current**: Hardcoded from analysis
```typescript
const elasticities = {
  'Potato': -3.25,
  // ... etc
};
```

**Source**: Available in `data_points/ANALYSIS_product_elasticity.csv`

**What to do**:
- Already loaded via API in Forecast
- Extend to Strategy and Playground components

---

## Integration Plan

### Step 1: Create Volume Data Loader

**New file**: `src/utils/volumeDataLoader.ts`
```typescript
export async function loadLatestVolumeData(): Promise<Record<string, number>> {
  // Parse Weekly per product Volume CSV
  // Get most recent week
  // Sum SGL + Regular volumes
  // Return { product_name: volume_kg }
}
```

### Step 2: Create Local Price Loader

**New file**: `src/utils/priceDataLoader.ts`
```typescript
export async function loadLatestLocalPrices(): Promise<Record<string, number>> {
  // Parse Local shop price history CSV
  // Get most recent prices per product
  // Return { product_name: local_price }
}
```

### Step 3: Add Backend Endpoints

**Add to `backend/main.py`**:
```python
@app.get("/api/volume/latest")
async def get_latest_volumes():
    # Parse Weekly per product Volume CSV
    # Return latest week's data

@app.get("/api/prices/local-shops")
async def get_local_shop_prices():
    # Parse Local shop price history CSV
    # Return latest prices
```

### Step 4: Update Components

**Files to update**:
- `src/components/Profitability/ProfitabilityPage.tsx`
- `src/components/Overview/OverviewPage.tsx`
- `src/components/Playground/PlaygroundPage.tsx`
- `src/components/Strategy/PricingCompetitive.tsx`
- `src/components/Strategy/PricingDemandAware.tsx`

**Change**:
```typescript
// Replace hardcoded data
const volumes = await ApiClient.getLatestVolumes();
const localPrices = await ApiClient.getLocalShopPrices();
```

### Step 5: Expand Product Costs CSV

**Current**: Only 8 products in `PRODUCT_COSTS.csv`

**Needed**: All ~60+ products from your catalog

**How to generate**:
1. Get unique products from volume CSV
2. For each product:
   - Procurement cost (you provide or estimate)
   - Operational cost: 13.33 (same for all)
   - Commission: Based on your current structure
     - Potato: 2 ETB
     - Red Onion: 3 ETB
     - Others: 5 ETB
   - Selling price: Current as of Oct 2025
3. Save to `PRODUCT_COSTS.csv`

---

## Estimated Effort

### Time Required
- **Step 1-2 (Volume/Price loaders)**: 1-2 hours
- **Step 3 (Backend endpoints)**: 1 hour
- **Step 4 (Update components)**: 2-3 hours
- **Step 5 (Expand product costs)**: 2-4 hours (data collection)

**Total**: 6-10 hours of work

### Complexity
- **Easy**: Backend endpoints, API client updates
- **Medium**: Component updates, data parsing
- **Hard**: Collecting procurement costs for all products

---

## Benefits After Integration

### Before (Current - Placeholder Data)
- Dashboard works with 8 products
- Calculations are correct but limited
- Can demo functionality
- Testing scenarios

### After (Real Data)
- Dashboard works with ALL products
- Real profitability insights
- Accurate weekly P&L
- Actionable recommendations
- True business impact visibility

---

## Immediate Value (Even Without Integration)

**You can use the dashboard NOW for:**

1. **Understanding the Framework**
   - See how profitability is calculated
   - Learn the SGL tier economics
   - Understand pricing strategies

2. **Strategic Planning**
   - Test Tier 2 model conceptually
   - Review pricing methodology
   - Plan operational improvements

3. **Team Training**
   - Show team the new platform
   - Explain the 6 sections
   - Demonstrate scenario testing

4. **Stakeholder Demos**
   - Present the crisis (even with 8 products)
   - Show the solution framework
   - Demonstrate decision-support tools

---

## Priority Recommendation

### HIGH PRIORITY: Expand PRODUCT_COSTS.csv

**Why**: This single file unlocks the entire platform for all products

**How**:
1. Export product list from your system
2. Add columns:
   - `procurement_cost` (from your accounting)
   - `operational_cost` (13.33 for all)
   - `sgl_commission` (2 for Potato, 3 for Onion, 5 for others)
   - `selling_price` (current prices Oct 2025)
   - `notes` (optional)
3. Save as CSV
4. Restart backend
5. Refresh dashboard

**Impact**: Immediate full product coverage!

### MEDIUM PRIORITY: Real Volume Integration

**Why**: Enables accurate weekly P&L

**How**: Implement Steps 1-4 above

**Impact**: See actual profit/loss for all products

---

## You're Ready!

The dashboard is **complete and functional**. 

**Start using it now** with the 8 products to:
- Understand the business model crisis
- Test recovery strategies
- Plan implementation

**Then integrate real data** to:
- Get complete product coverage
- See actual weekly P&L
- Make data-driven decisions

---

**Congratulations! You now have a world-class BI platform for your ChipChip business!** 🎉

Next command: Start the servers and navigate to **Overview**!

