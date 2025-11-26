# ChipChip Dashboard - Quick Start Guide

## Start Servers

### 1. Kill All Processes
```powershell
taskkill /F /IM python.exe /IM node.exe 2>$null
```

### 2. Start Backend (Port 8001)
```powershell
cd D:\Beck\AI\2025\SGL\delivery-map-app\backend
py -3 -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Start Frontend
```powershell
cd D:\Beck\AI\2025\SGL\delivery-map-app
npm run dev
```

### 4. Open Dashboard
Navigate to: `http://localhost:5173/`

---

## Dashboard Navigation

### Sidebar Menu (Left)
- **Overview** - Executive KPIs and quick insights
- **Analytics** - Map view with delivery locations
- **Profitability** - Product P&L analysis
- **Forecast** - Demand forecasting
- **Strategy** - Pricing & SGL tier recommendations
- **Playground** - What-if scenario testing

---

## Quick Actions

### Check Profitability
1. Click **Profitability** in sidebar
2. View product table (sorted by profit)
3. Click any product for detailed cost breakdown
4. Identify loss-making products (red)

### Test Price Changes
1. Click **Playground** in sidebar
2. Adjust product prices in the controls
3. See immediate impact on profit
4. Compare before/after scenarios

### Optimize SGL Tiers
1. Click **Strategy** in sidebar
2. Select **SGL Tier System** tab
3. Review Tier 2 (Pickup) - saves 4.91 ETB/kg
4. Select products to apply tier
5. See cost impact calculation

### Get Pricing Recommendations
1. Click **Strategy** in sidebar
2. Select **Competitive Pricing** tab
   - See break-even prices
   - Get competitive recommendations
3. Select **Demand-Aware Pricing** tab
   - See profit-maximizing prices
   - View demand curves
   - Understand volume trade-offs

---

## Key Insights to Check

### 1. Current Profit/Loss
**Location**: Overview → Weekly Profit KPI

**What to look for:**
- Red = losing money
- Green = profitable
- Current: ~400K ETB weekly loss

### 2. Worst Performing Products
**Location**: Overview → Top 5 Loss-Making Products

**What to look for:**
- Potato: Biggest loss (~113K/week)
- Beetroot, Papaya: Also severe losses
- Need immediate pricing action

### 3. Cost Structure
**Location**: Profitability → Select any product

**What to look for:**
- Logistics: 48% of operational costs (6.41 ETB/kg)
- Packaging: 22% (2.86 ETB/kg)
- High optimization potential

### 4. SGL Tier Opportunity
**Location**: Strategy → SGL Tier System → Tier 2

**What to look for:**
- Commission: 3.50 ETB/kg
- Savings: 8.41 ETB/kg
- **Net: Save 4.91 ETB/kg** ✅

### 5. Pricing Gaps
**Location**: Strategy → Competitive Pricing

**What to look for:**
- Products priced below break-even
- Recommended price increases
- Still competitive vs. local shops

---

## Common Scenarios

### Scenario 1: "How much are we losing on Potato?"
1. Go to **Profitability**
2. Find Potato in table
3. Click to see breakdown
4. Result: -9.33 ETB/kg × 12,000 kg = -112K ETB/week

### Scenario 2: "What if we implement SGL pickup model?"
1. Go to **Playground**
2. Click **SGL Pickup Model** preset
3. View results
4. Result: ~200K ETB/week savings (all products)

### Scenario 3: "What's the optimal price for Avocado?"
1. Go to **Strategy → Demand-Aware Pricing**
2. Select Avocado
3. View profit curve
4. Result: Optimal price shown with max profit

### Scenario 4: "Which products should we prioritize?"
1. Go to **Overview**
2. Check Top 5 Losses
3. Go to **Profitability**
4. Sort by Weekly Profit (ascending)
5. Focus on biggest losses first

---

## Data Files Location

All data files are in: `data_points/`

### Cost Data (Required):
- `PRODUCT_COSTS.csv` - Product cost structure
- `OPERATIONAL_COSTS.csv` - Operational breakdown
- `SGL_TIERS.csv` - Tier definitions

### Analysis Data:
- `ANALYSIS_product_elasticity.csv` - Elasticity measurements
- `ANALYSIS_persona_summary.csv` - Customer personas
- `COMMISSION_LOOKUP.csv` - Commission recommendations

### Volume Data:
- `Weekly Volume normal vs SGL.csv` - Volume trends
- `Weekly per product Volume normal vs SGL.csv` - Product volumes

---

## Troubleshooting

### Dashboard shows "Coming soon..."
- You're on a section that's still loading
- Wait a moment or refresh the page
- Check browser console for errors

### No data in Profitability
- Ensure `PRODUCT_COSTS.csv` exists
- Check backend `/api/costs/products` endpoint
- Verify backend is running

### Calculations seem wrong
- Verify CSV data accuracy
- Check operational cost total = 13.33 ETB/kg
- Ensure prices are current (Oct 2025)

### Backend not responding
```powershell
# Kill and restart
taskkill /F /IM python.exe
cd backend
py -3 -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

---

## Next Steps

1. **Review Overview** - Understand current business health
2. **Check Profitability** - Identify top losses
3. **Test Scenarios in Playground** - Model improvements
4. **Review Strategy Recommendations** - Get actionable pricing
5. **Implement Changes** - Start with Tier 2 + Potato fix

---

**Dashboard Ready!** 🚀

Access at: `http://localhost:5173/`

Start with **Overview** to see your business at a glance.

