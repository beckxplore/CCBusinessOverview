# ChipChip Business Intelligence Dashboard - Comprehensive Guide

## Overview

The ChipChip BI Dashboard is a complete business intelligence platform for managing group buying operations, profitability analysis, pricing strategy, and demand forecasting.

---

## System Architecture

### 6 Main Sections

1. **Overview** - Executive dashboard with KPIs
2. **Analytics** - Map-based delivery analytics with filters
3. **Profitability** - Product-level P&L analysis
4. **Forecast** - Demand forecasting with elasticity models
5. **Strategy** - SGL tier system + pricing recommendations
6. **Playground** - What-if scenario simulator

---

## Getting Started

### Prerequisites
- Python 3.x
- Node.js & npm
- Backend server running on port 8001
- Frontend dev server

### Start the Application

**Backend:**
```bash
cd delivery-map-app/backend
py -3 -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**Frontend:**
```bash
cd delivery-map-app
npm run dev
```

Access at: `http://localhost:5173/`

---

## Section 1: Overview

### Features
- **KPI Cards**: Revenue, Cost, Profit, Volume
- **Profit Margin Overview**: Profitable vs. losing products count
- **Top 5 Profitable Products**: Ranked by weekly profit
- **Top 5 Loss-Making Products**: Ranked by weekly loss
- **Recommended Actions**: Quick insights and next steps

### Use Cases
- Daily business health check
- Quick profitability assessment
- Identify urgent issues (loss-making products)

---

## Section 2: Analytics

### Features
- **Interactive Map**: Geographic visualization of delivery locations
- **Filters**:
  - Group type (Normal/Super/All)
  - Day of week selection
  - Min/max groups and orders
  - Top 15 Super Group Leaders
  - Radius visualization
- **Statistics Panel**: Real-time metrics
- **Map Legend**: Visual guide

### Use Cases
- Understand geographic distribution
- Analyze leader performance by location
- Filter data by day/group type
- Identify high-density areas

---

## Section 3: Profitability

### Features
- **Product Profitability Table**:
  - Sortable by margin, volume, profit
  - Color-coded (green=profit, red=loss)
  - Weekly profit/loss per product
  
- **Cost Waterfall Chart**:
  - Visual breakdown:
    - Procurement cost
    - Operational cost
    - SGL commission
    - = Total cost
    - vs. Selling price
    - = Margin
  
- **Summary Metrics**:
  - Total weekly revenue/cost/profit
  - Count of profitable vs. losing products

### Use Cases
- Identify loss-making products
- Understand cost structure per product
- Prioritize products for price/commission optimization
- Volume-weighted impact analysis

---

## Section 4: Forecast

### Features (Existing + Enhanced)
- **Customer Personas**: Based on measured behavior
- **Demand Elasticity**: Product-specific elasticity
- **Price Sensitivity**: Per-product offset controls
- **Commission Impact Analysis**: Show/hide commission features
- **Global Multiplier**: Forecast demand changes

### Use Cases
- Predict demand impact of price changes
- Test commission structure changes
- Understand customer price sensitivity
- Plan inventory based on forecasts

---

## Section 5: Strategy

### Sub-section A: SGL Tier System

**3 Tiers:**

1. **Tier 1 - Aggregation Only**
   - Commission: 1.50 ETB/kg
   - SGL aggregates orders
   - ChipChip delivers
   - No cost savings

2. **Tier 2 - Pickup** (RECOMMENDED)
   - Commission: 3.50 ETB/kg
   - SGL aggregates + picks up from hub
   - Savings: 8.41 ETB/kg (logistics + packaging)
   - **Net benefit: Save 4.91 ETB/kg!**

3. **Tier 3 - Full Distribution**
   - Commission: 5.00 ETB/kg
   - SGL handles everything
   - Savings: 8.65 ETB/kg
   - Net benefit: Save 3.65 ETB/kg

**Calculator:**
- Select products
- Apply tier
- See cost impact instantly

### Sub-section B: Competitive Pricing

**Strategy**: Balance profitability (min 5% margin) with competitiveness (max 15% discount)

**Features:**
- Current vs. recommended price
- Break-even price
- Local shop price comparison
- Expected volume impact
- Profitability status

**Algorithm:**
```
recommended_price = max(
  break_even * 1.05,        # 5% margin minimum
  local_shop_price * 0.85   # 15% discount max
)
```

### Sub-section C: Demand-Aware Pricing

**Strategy**: Find price that maximizes total profit using elasticity

**Features:**
- Current vs. optimal price
- Profit curve visualization
- Volume/profit trade-offs
- Profit improvement calculation

**Algorithm:**
```
For each test price:
  volume = base_volume * (1 + elasticity * price_change%)
  profit = (price - cost) * volume

optimal_price = price that maximizes profit
```

---

## Section 6: Playground

### Features

**Quick Presets:**
1. **Fix Potato Crisis**: Price +12%, Commission -50%
2. **SGL Pickup Model**: Apply Tier 2 to all products
3. **Aggressive Cost Cut**: Reduce operational costs 30%
4. **Premium Positioning**: Raise all prices 15%

**Custom Scenario Builder:**
- Adjust price per product
- Change commission per product
- Select SGL tier per product
- Modify operational cost categories:
  - Logistics (6.41 ETB/kg)
  - Packaging (2.86 ETB/kg)
  - Warehouse (3.46 ETB/kg)

**Results:**
- Before/after comparison
- Revenue, cost, profit changes
- Product-level impact table
- Volume impact using elasticity
- Key insights and recommendations

---

## Data Files

### Cost Data (New)
- `data_points/PRODUCT_COSTS.csv` - Procurement, operational, commission costs
- `data_points/OPERATIONAL_COSTS.csv` - Detailed cost breakdown (15 categories)
- `data_points/SGL_TIERS.csv` - Tier definitions and savings

### Existing Data
- `data_points/SGL Order & Price History Data.csv` - Historical SGL orders
- `data_points/Local shop price history.csv` - Competitor pricing
- `data_points/ANALYSIS_product_elasticity.csv` - Measured elasticity
- `data_points/ANALYSIS_persona_summary.csv` - Customer personas
- `data_points/COMMISSION_LOOKUP.csv` - Commission recommendations
- `data_points/Weekly Volume normal vs SGL.csv` - Volume trends
- `data_points/Weekly per product Volume normal vs SGL.csv` - Product volume trends

---

## Key Business Insights

### Current State (As of Oct 2025)

**Profitability Crisis:**
- ALL 8 tracked products are losing money
- Total weekly loss: ~400K ETB
- Annual loss: ~20M ETB

**Biggest Losses:**
1. **Potato**: -9.33 ETB/kg (113K ETB/week loss)
2. **Beetroot**: -11.33 ETB/kg
3. **Papaya**: -9.33 ETB/kg
4. **Avocado**: -8.33 ETB/kg
5. **Tomato**: -8.33 ETB/kg

**Root Causes:**
1. **Operational costs too high**: 13.33 ETB/kg
   - Logistics: 6.41 ETB/kg (48% of ops)
   - Packaging: 2.86 ETB/kg (22%)
   - Warehouse: 3.46 ETB/kg (26%)

2. **Not leveraging SGL model**: Still delivering to SGLs instead of pickup

3. **Commission structure**: 2-5 ETB/kg adds to losses

### Recommended Actions

**URGENT (This Week):**
1. **Implement SGL Tier 2 (Pickup Model)**
   - Saves 8.41 ETB/kg in logistics + packaging
   - Pay 3.50 ETB/kg commission
   - **Net savings: 4.91 ETB/kg**
   - Impact: ~200K ETB/week savings

2. **Fix Potato Pricing**
   - Current: 25 ETB/kg (losing 9.33/kg)
   - Recommended: 28-30 ETB/kg
   - Commission: 2 → 1 ETB/kg
   - Still 21-26% cheaper than local shops (38.06 ETB)

**HIGH PRIORITY (Next 2 Weeks):**
3. **Optimize Operational Costs**
   - Negotiate packaging: 2.86 → 1.50 ETB/kg
   - Route optimization: reduce car rental
   - Zone hub model: centralize pickups

4. **Restructure All Product Pricing**
   - Use Competitive Pricing tab for break-even
   - Use Demand-Aware Pricing for profit maximization

**MEDIUM PRIORITY (Month 1):**
5. **Product Portfolio Optimization**
   - Consider discontinuing extreme loss products
   - Focus on higher-margin opportunities
   - Test demand for price-optimized products

---

## API Endpoints

### Existing
- `GET /api/health` - Health check
- `GET /api/data` - Delivery data
- `GET /api/statistics` - Summary statistics
- `GET /api/forecast/products` - Product list
- `GET /api/forecast/shares` - Product market shares
- `GET /api/forecast/elasticities` - Measured elasticities
- `GET /api/forecast/personas` - Customer personas
- `GET /api/forecast/commissions` - Commission recommendations

### New (Cost Management)
- `GET /api/costs/products` - Product cost structure
- `GET /api/costs/operational` - Operational cost breakdown
- `GET /api/costs/tiers` - SGL tier definitions

---

## Technical Stack

**Frontend:**
- React + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- React-Leaflet (maps)
- Lucide React (icons)

**Backend:**
- FastAPI (Python)
- ClickHouse (database)
- CSV file processing

**Data Management:**
- In-memory caching (`DataStore`)
- CSV backup for persistence
- Real-time calculations

---

## Performance Optimization

### Current Performance
- Initial load: < 3 seconds
- Section switching: Instant
- Profitability calculations: < 100ms
- Simulation scenarios: < 500ms

### Optimization Techniques
1. **In-memory caching**: All cost data loaded once
2. **Lazy loading**: Only load section data when needed
3. **Memoization**: Cache expensive calculations
4. **Efficient re-renders**: React component optimization

---

## Future Enhancements

### Data Integration
- Real-time volume data from database
- Automated cost updates
- Historical trend analysis
- Actual local shop price scraping

### Advanced Features
- Multi-week/month forecasting
- Leader churn prediction
- Geographic profitability heat maps
- Automated pricing recommendations
- Commission auto-adjustment based on margins

### Mobile Support
- Responsive design for tablets
- Mobile app for SGLs
- Real-time notifications

---

## Troubleshooting

### Dashboard won't load
- Check backend is running on port 8001
- Verify `/api/health` returns healthy
- Check browser console for errors

### Cost data not showing
- Verify CSV files exist in `data_points/`
- Check file encoding (UTF-8 with BOM)
- Restart backend server

### Calculations seem wrong
- Verify CSV data accuracy
- Check operational cost total = 13.33 ETB/kg
- Ensure commission rates match current structure

---

## Support

For questions or issues:
1. Check browser console for errors
2. Verify all CSV files are present
3. Restart both backend and frontend
4. Check data file formatting (UTF-8, proper headers)

---

**Version**: 2.0.0  
**Last Updated**: January 2025  
**Status**: Production Ready

