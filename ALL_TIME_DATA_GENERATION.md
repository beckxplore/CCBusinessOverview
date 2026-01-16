# All-Time Daily Product Data Generation

This document explains how to generate the all-time daily per product data file.

## Output Format

The generated CSV file (`all_time_daily_product_data.csv`) contains the following columns:

- **Date**: Date in YYYY-MM-DD format
- **Product**: Product name (normalized)
- **ChipChip_Buy_Price**: ChipChip purchasing/buy price (ETB)
- **ChipChip_Sell_Price**: ChipChip selling price (ETB)
- **ChipChip_Volume**: Total volume sold in kg
- **Local shop price**: Local shop benchmark price (ETB) - empty if not available
- **Farm price**: Farm benchmark price (ETB) - empty if not available
- **Sunday market price**: Sunday market benchmark price (ETB) - empty if not available
- **Super market price**: Supermarket benchmark price (ETB) - empty if not available

## Data Sources

The script combines data from multiple sources:

### 1. ChipChip Transaction Data (Google Sheets)
- **Source**: Google Sheets via `fetch_raw_sheet_data()` function
- **Columns Used**:
  - `created_at` → Date
  - `Product Name` → Product
  - `PurchasingPrice` or calculated from `final_cost`/`final_volume_kg` → ChipChip_Buy_Price
  - `price` or calculated from `final_revenue`/`final_volume_kg` → ChipChip_Sell_Price
  - `final_volume_kg` → ChipChip_Volume
- **Availability**: ✅ Available via `services/sheet_data.py`

### 2. Local Shop Prices (CSV)
- **Source**: `data_points/Local shop price history.csv`
- **Format**: CSV with columns: `date`, `product_name`, `Local shop price`
- **Availability**: ✅ File exists in repository

### 3. Benchmark Prices (API)
- **Source**: Supabase Benchmark API
- **Location Groups**: farm, sunday-market, supermarket
- **API Endpoint**: Configured via `BENCHMARK_API_URL` environment variable
- **API Key**: Configured via `BENCHMARK_API_KEY` environment variable
- **Availability**: ⚠️ Requires API credentials in `.env` file

### 4. SGL Order Data (CSV - Optional)
- **Source**: `data_points/SGL Order & Price History Data.csv`
- **Usage**: Loaded for reference but not directly used in output (can be used for validation)
- **Availability**: ✅ File exists in repository

## Required APIs and Queries

### ✅ Available APIs/Queries:

1. **Google Sheets API** (`services/sheet_data.py`)
   - Function: `fetch_raw_sheet_data()`
   - Returns: All historical transaction data with dates, products, prices, volumes
   - Status: ✅ Fully implemented

2. **Local Shop Price CSV**
   - File: `data_points/Local shop price history.csv`
   - Format: CSV with date, product_name, price columns
   - Status: ✅ File available

3. **Benchmark Price API** (`main.py`)
   - Function: `_fetch_benchmark_price_map()`
   - Endpoint: Configured via `BENCHMARK_API_URL`
   - Returns: Prices by location group (farm, sunday-market, supermarket)
   - Status: ⚠️ Requires API credentials

### ⚠️ Configuration Required:

To use the Benchmark API, ensure your `.env` file contains:
```env
BENCHMARK_API_URL=https://your-api-url.com/benchmark
BENCHMARK_API_KEY=your-api-key
```

## How to Run

1. **Install dependencies** (if not already installed):
   ```bash
   pip install pandas gspread google-auth httpx
   ```

2. **Set up environment variables** (if using Benchmark API):
   - Ensure `.env` file in `delivery-map-app/backend/` has `BENCHMARK_API_URL` and `BENCHMARK_API_KEY`

3. **Run the script**:
   ```bash
   python generate_all_time_data.py
   ```

4. **Output**:
   - File: `all_time_daily_product_data.csv` in the project root
   - Format: CSV with all columns listed above

## Data Handling Notes

- **Missing Benchmark Prices**: If benchmark prices are not available for a specific date, the script will look backwards up to 30 days to find the most recent available price (forward-fill logic)
- **Empty Values**: Missing data is represented as empty strings in the CSV (not zeros)
- **Product Normalization**: Product names are normalized using the `_normalize_product_name()` function to handle aliases and variations
- **Date Range**: The script automatically determines the date range from the ChipChip data (min to max date)

## Troubleshooting

### Issue: "No ChipChip data available from Google Sheets"
- **Solution**: Check that Google Sheets credentials are configured and the sheet is accessible

### Issue: "Benchmark API not configured"
- **Solution**: This is a warning, not an error. The script will still run but benchmark prices will be empty. Add API credentials to `.env` if you want benchmark prices.

### Issue: "Local shop CSV not found"
- **Solution**: Ensure `data_points/Local shop price history.csv` exists

## Example Output

```csv
Date,Product,ChipChip_Buy_Price,ChipChip_Sell_Price,ChipChip_Volume,Local shop price,Farm price,Sunday market price,Super market price
2024-01-01,Onion,40,55,500,60,35,50,85
2024-01-02,Onion,42,56,450,60,35,50,85
2024-01-01,Tomato,30,45,300,100,25,40,90
```

## Notes

- Some benchmark prices (farm, sunday market, supermarket) may not be available daily - these will be left empty in the output as requested
- The script aggregates ChipChip data by date and product (averages prices, sums volumes)
- All prices are in ETB (Ethiopian Birr)
- Volumes are in kg
