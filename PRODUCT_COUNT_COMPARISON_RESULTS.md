# Product Count Comparison Test Results

## Test Date: December 1, 2025
## Date Range: November 24-30, 2025 (Last 7 days)

### Dashboard Count
- **Profitability Tab**: 130 products
- **Overview Tab**: "130 products"
- **Date Range**: "Week window Mon, Nov 24 – Sun, Nov 30"

### ClickHouse Direct Query
- **Status**: Running...
- **Query**: Using same structure as `load_product_metrics_data` in main.py
- **Filter**: `HAVING total_volume_kg > 0` (only products with sales)

### Comparison
- **Expected**: Dashboard count should match ClickHouse count
- **Tolerance**: Small differences possible due to:
  - Product name normalization
  - Google Sheets data merging
  - Frontend aggregation

---

## Results
(To be filled after ClickHouse query completes)

