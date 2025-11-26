# Dashboard Data Sources

This document outlines where each data point in the dashboard comes from.

## Frontend API Endpoints

The frontend (`delivery-map-app/src/utils/apiClient.ts`) calls the backend API at:
- **Base URL**: `http://localhost:8001/api` (when running locally)
- **Backend Port**: 8001 (not 8000)

## Data Flow Overview

```
Frontend (React) → Backend API (FastAPI on port 8001) → Data Sources
```

## Primary Data Sources

### 1. **Delivery Data** (`/api/data`)
- **Source**: **ClickHouse Database**
- **Query**: Aggregates data from multiple ClickHouse tables:
  - `orders` - Order records
  - `groups_carts` - Shopping cart items
  - `groups` - Group information
  - `group_deals` - Deal/offer information
  - `delivery_location` - Delivery location coordinates
  - `users` - User/leader information
- **Time Window**: Dynamic week window (Thursday to Thursday, starting from April 1, 2025)
- **Data Points**:
  - Group deal category (NORMAL_GROUPS vs SUPER_GROUPS)
  - Leader information (ID, name, phone)
  - Delivery location (coordinates, name)
  - Order metrics (total orders, orders by day of week)
  - Volume metrics (total_kg, avg_kg_per_ordering_day)
  - Group metrics (unique members, total groups)
  - Product metrics (products_ordered)
  - Date metrics (last_order_date, active_days)

### 2. **Statistics** (`/api/statistics`)
- **Source**: **ClickHouse Database**
- **Query**: Aggregates from same tables as delivery data
- **Data Points**:
  - Total orders
  - Normal group orders vs Super group orders
  - Unique locations
  - Geographic bounds

### 3. **Forecast Weekly Summary** (`/api/forecast/weekly-summary`)
- **Source**: **ClickHouse Database** (primary) with CSV fallback
- **Fallback**: Uses marker data if ClickHouse fails
- **Data Points**:
  - Weekly orders count
  - Weekly volume (total_kg)
  - Week start date
  - Data source indicator (clickhouse, fallback, or markers)

### 4. **Forecast Products** (`/api/forecast/products`)
- **Source**: **CSV Files** in `data_points/` directory
- **Files Used**:
  - `SGL Order & Price History Data.csv`
  - `Weekly per product Volume normal vs SGL.csv`
- **Data Points**: Product-level forecast data

### 5. **Forecast Shares** (`/api/forecast/shares`)
- **Source**: **CSV Files**
- **Files Used**: Same as forecast products
- **Data Points**: Market share information

### 6. **Forecast Elasticities** (`/api/forecast/elasticities`)
- **Source**: **CSV Files**
- **Files Used**: `ANALYSIS_product_elasticity.csv`
- **Data Points**: Price elasticity coefficients by product

### 7. **Forecast Personas** (`/api/forecast/personas`)
- **Source**: **CSV Files**
- **Files Used**: 
  - `ANALYSIS_persona_summary.csv`
  - `SGL_persona_cleaned.csv`
- **Data Points**: Persona analysis data

### 8. **Forecast Commissions** (`/api/forecast/commissions`)
- **Source**: **CSV Files**
- **Files Used**: `COMMISSION_LOOKUP.csv`
- **Data Points**: Commission structure data

### 9. **Product Costs** (`/api/costs/products`)
- **Source**: **Google Sheets** (primary) or **CSV Files** (fallback)
- **Google Sheets**: 
  - Sheet ID from `GSHEET_PROCUREMENT_ID` env var
  - Worksheet: `ProcurementCosts` (or `GSHEET_PROCUREMENT_WORKSHEET`)
- **CSV Fallback**: `Sales & Purchases.csv`
- **Data Points**: Product purchase prices, selling prices, quantities

### 10. **Operational Costs** (`/api/costs/operational`)
- **Source**: **Google Sheets** (primary) or **CSV Files** (fallback)
- **Google Sheets**:
  - Sheet ID from `GSHEET_OPERATIONAL_COST_ID` env var
  - Worksheet: `OperationalCosts` (or `GSHEET_OPERATIONAL_COST_WORKSHEET`)
- **CSV Fallback**: `OPERATIONAL_COSTS.csv`
- **Data Points**: Operational expense data

### 11. **SGL Tiers** (`/api/costs/tiers`)
- **Source**: **CSV Files**
- **Files Used**: `SGL_TIERS.csv`
- **Data Points**: Super Group Leader tier structure

### 12. **Product Metrics** (`/api/products/metrics`)
- **Source**: **ClickHouse Database** + **CSV Files**
- **ClickHouse**: Recent order data (last 30 days by default, configurable via `PRODUCT_METRICS_LOOKBACK_DAYS`)
- **CSV**: `Sales & Purchases.csv` for historical data
- **Data Points**: Product performance metrics

### 13. **Local Shop Prices** (`/api/benchmark/local-prices`)
- **Source**: **External Benchmark API** (primary) → **Google Sheets** (fallback) → **CSV Files** (final fallback)
- **External Benchmark API** (ACTIVE): 
  - Supabase Function: `https://ladquxscytpamcpyyayc.supabase.co/functions/v1/get-benchmark-data`
  - API Key: Configured in `.env` file
  - Fetches last 7 days of benchmark prices from multiple location groups
- **Google Sheets** (fallback):
  - Sheet ID from `GSHEET_LOCAL_PRICE_ID` env var
  - Worksheet: `LocalShopPrices` (or `GSHEET_LOCAL_PRICE_WORKSHEET`)
- **CSV Fallback**: `Local shop price history.csv` or `Local shop price history.xlsx`
- **Data Points**: Competitive pricing data from local shops

### 14. **Persona Leaders** (`/api/personas/leaders`)
- **Source**: **CSV Files**
- **Files Used**: 
  - `ANALYSIS_leader_personas.csv`
  - `SGL_persona_leaders_unique.csv`
- **Data Points**: Leader persona classifications

### 15. **SGL Retention** (`/api/sgl/retention`)
- **Source**: **ClickHouse Database**
- **Query**: Calculates retention metrics for Super Group Leaders
- **Data Points**: Weekly retention rates, leader retention statistics

## Data Source Priority/Fallback Chain

Many endpoints use a fallback chain:

1. **Google Sheets** (if configured) → 
2. **CSV Files** (if Sheets unavailable) → 
3. **ClickHouse** (for some metrics) →
4. **Error/Empty Response** (if all fail)

## Configuration

### Environment Variables (Backend `.env` file)

**ClickHouse Connection:**
- `CLICKHOUSE_HOST`
- `CLICKHOUSE_PORT_STR` (default: 8123)
- `CLICKHOUSE_USER`
- `CLICKHOUSE_PASSWORD`
- `CLICKHOUSE_DATABASE`
- `CLICKHOUSE_SECURE_STR` (true/false)
- `CLICKHOUSE_VERIFY_STR` (true/false)

**Google Sheets (Optional):**
- `GSHEET_PROCUREMENT_ID`
- `GSHEET_PROCUREMENT_WORKSHEET` (default: "ProcurementCosts")
- `GSHEET_LOCAL_PRICE_ID`
- `GSHEET_LOCAL_PRICE_WORKSHEET` (default: "LocalShopPrices")
- `GSHEET_OPERATIONAL_COST_ID`
- `GSHEET_OPERATIONAL_COST_WORKSHEET` (default: "OperationalCosts")

**External APIs (Optional):**
- `BENCHMARK_API_URL`
- `BENCHMARK_API_KEY`

**Time Windows:**
- `PRODUCT_METRICS_LOOKBACK_DAYS` (default: 30)
- `SELLING_PRICE_LOOKBACK_DAYS` (default: 30)
- `FORECAST_WEEKLY_LOOKBACK_WEEKS` (default: 26)

## CSV Files Location

All CSV files are located in: `data_points/` directory (project root)

Key files:
- `Sales & Purchases.csv` - Product cost and sales data
- `SGL Order & Price History Data.csv` - SGL order history
- `Weekly per product Volume normal vs SGL.csv` - Volume data
- `COMMISSION_LOOKUP.csv` - Commission structure
- `OPERATIONAL_COSTS.csv` - Operational expenses
- `SGL_TIERS.csv` - SGL tier definitions
- `Local shop price history.csv` - Competitive pricing
- `ANALYSIS_product_elasticity.csv` - Price elasticity
- `ANALYSIS_persona_summary.csv` - Persona data
- `SGL_persona_cleaned.csv` - Cleaned persona data
- `ANALYSIS_leader_personas.csv` - Leader personas
- `SGL_persona_leaders_unique.csv` - Unique leader personas

## Current Status

- **Backend Port**: 8001 (configured in `apiClient.ts`)
- **Frontend Port**: 5173 (Vite dev server)
- **Primary Data Source**: ClickHouse database for delivery/order data
- **Secondary Data Sources**: CSV files for forecast/cost data
- **External Benchmark API**: ✅ **ACTIVE** - Configured and being used for local shop prices and sensitivity calculations
- **Optional Data Sources**: Google Sheets for cost data (fallback if Benchmark API unavailable)

