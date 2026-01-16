"""
Generate all-time daily per product data file.

This script combines data from:
1. Google Sheets (ChipChip buy/sell prices and volumes)
2. Local shop price history CSV
3. Benchmark API (farm, sunday market, supermarket prices)
4. SGL Order & Price History CSV (for additional historical data)

Output: CSV file with columns:
- Date
- Product name
- ChipChip_Buy_Price
- ChipChip_Sell_Price
- ChipChip_Volume
- Local shop price
- Farm price
- Sunday market price
- Super market price
"""

import pandas as pd
import csv
from pathlib import Path
from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional
import logging
import os
import sys

# Add backend to path to import modules
backend_path = Path(__file__).parent / "delivery-map-app" / "backend"
sys.path.insert(0, str(backend_path))

# Try to import from backend modules
try:
    from services.sheet_data import fetch_raw_sheet_data
except ImportError as e:
    logger.error(f"Failed to import sheet_data: {e}")
    fetch_raw_sheet_data = None

try:
    from main import (
        _normalize_product_name,
        BENCHMARK_API_URL,
        BENCHMARK_API_KEY,
        DATA_POINTS_DIR,
        LOCAL_SHOP_CSV,
        SGL_ORDER_PRICE_CSV,
    )
except ImportError as e:
    logger.warning(f"Failed to import from main: {e}. Using fallback values.")
    # Fallback values
    DATA_POINTS_DIR = Path(__file__).parent / "data_points"
    LOCAL_SHOP_CSV = DATA_POINTS_DIR / "Local shop price history.csv"
    SGL_ORDER_PRICE_CSV = DATA_POINTS_DIR / "SGL Order & Price History Data.csv"
    BENCHMARK_API_URL = os.getenv("BENCHMARK_API_URL")
    BENCHMARK_API_KEY = os.getenv("BENCHMARK_API_KEY")
    
    # Fallback normalize function
    def _normalize_product_name(name: str) -> str:
        """Simple product name normalization."""
        return (name or "").strip()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def _parse_float(value: Any) -> float:
    """Parse float value, handling None, empty strings, and commas."""
    if value is None or value == "":
        return 0.0
    try:
        if isinstance(value, str):
            value = value.replace(',', '').strip()
        return float(value)
    except (ValueError, TypeError):
        return 0.0

def _parse_date(date_str: Any) -> Optional[date]:
    """Parse date string to date object."""
    if date_str is None or date_str == "":
        return None
    try:
        if isinstance(date_str, date):
            return date_str
        if isinstance(date_str, datetime):
            return date_str.date()
        if isinstance(date_str, str):
            # Try various date formats
            for fmt in ['%Y-%m-%d', '%Y/%m/%d', '%d/%m/%Y', '%m/%d/%Y']:
                try:
                    return datetime.strptime(date_str.split()[0], fmt).date()
                except ValueError:
                    continue
            # Try pandas parsing
            parsed = pd.to_datetime(date_str, errors='coerce')
            if pd.notna(parsed):
                return parsed.date()
    except Exception as e:
        logger.debug(f"Failed to parse date '{date_str}': {e}")
    return None

def load_local_shop_prices_by_date() -> Dict[str, Dict[str, float]]:
    """Load local shop prices grouped by date and product."""
    prices_by_date_product: Dict[str, Dict[str, float]] = {}
    
    if not LOCAL_SHOP_CSV.exists():
        logger.warning(f"Local shop CSV not found at {LOCAL_SHOP_CSV}")
        return prices_by_date_product
    
    try:
        with LOCAL_SHOP_CSV.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                date_str = row.get("date", "").strip()
                product = (row.get("product_name") or "").strip()
                price = _parse_float(row.get("Local shop price") or row.get("local_shop_price"))
                
                if not date_str or not product or price <= 0:
                    continue
                
                date_obj = _parse_date(date_str)
                if not date_obj:
                    continue
                
                date_key = date_obj.isoformat()
                if date_key not in prices_by_date_product:
                    prices_by_date_product[date_key] = {}
                
                # Use normalized product name as key
                normalized_product = _normalize_product_name(product)
                prices_by_date_product[date_key][normalized_product] = price
                
    except Exception as e:
        logger.error(f"Failed to load local shop prices: {e}")
    
    return prices_by_date_product

def fetch_benchmark_prices_by_date(date_from: date, date_to: date) -> Dict[str, Dict[str, Dict[str, float]]]:
    """
    Fetch benchmark prices from API grouped by date, product, and location group.
    Returns: {date_iso: {product: {location_group: price}}}
    """
    prices_by_date: Dict[str, Dict[str, Dict[str, float]]] = {}
    
    if not BENCHMARK_API_URL or not BENCHMARK_API_KEY:
        logger.warning("Benchmark API not configured")
        return prices_by_date
    
    try:
        import httpx
        
        # Fetch data in chunks to avoid timeout
        current_date = date_from
        while current_date <= date_to:
            chunk_end = min(current_date + timedelta(days=30), date_to)
            
            params = {
                "dateFrom": current_date.strftime("%Y-%m-%d"),
                "dateTo": chunk_end.strftime("%Y-%m-%d"),
                "frequency": "daily",
                "comparisonType": "avg",
                "locationGroups": ",".join(["farm", "sunday-market", "supermarket"]),
            }
            
            headers = {
                "apikey": BENCHMARK_API_KEY,
                "Authorization": f"Bearer {BENCHMARK_API_KEY}",
                "Content-Type": "application/json",
            }
            
            try:
                with httpx.Client(timeout=30.0) as client:
                    response = client.get(BENCHMARK_API_URL, params=params, headers=headers)
                    response.raise_for_status()
                    payload = response.json()
                    
                    data_entries = payload.get("data") or []
                    for entry in data_entries:
                        entry_date_str = entry.get("date", "")
                        product = (entry.get("product_name") or entry.get("product") or "").strip()
                        location_group = (entry.get("location_group") or "").strip()
                        price = _parse_float(entry.get("price"))
                        
                        if not entry_date_str or not product or price <= 0:
                            continue
                        
                        date_obj = _parse_date(entry_date_str)
                        if not date_obj:
                            continue
                        
                        date_key = date_obj.isoformat()
                        if date_key not in prices_by_date:
                            prices_by_date[date_key] = {}
                        
                        normalized_product = _normalize_product_name(product)
                        if normalized_product not in prices_by_date[date_key]:
                            prices_by_date[date_key][normalized_product] = {}
                        
                        # Map location groups to our column names
                        if location_group == "farm":
                            prices_by_date[date_key][normalized_product]["farm"] = price
                        elif location_group == "sunday-market":
                            prices_by_date[date_key][normalized_product]["sunday_market"] = price
                        elif location_group == "supermarket":
                            prices_by_date[date_key][normalized_product]["supermarket"] = price
                            
            except Exception as e:
                logger.warning(f"Failed to fetch benchmark prices for {current_date} to {chunk_end}: {e}")
            
            current_date = chunk_end + timedelta(days=1)
            
    except ImportError:
        logger.warning("httpx not available, skipping benchmark API")
    except Exception as e:
        logger.error(f"Error fetching benchmark prices: {e}")
    
    return prices_by_date

def load_sgl_order_data() -> pd.DataFrame:
    """Load SGL Order & Price History Data."""
    if not SGL_ORDER_PRICE_CSV.exists():
        logger.warning(f"SGL Order CSV not found at {SGL_ORDER_PRICE_CSV}")
        return pd.DataFrame()
    
    try:
        df = pd.read_csv(SGL_ORDER_PRICE_CSV, encoding="utf-8-sig")
        if 'order_date' in df.columns:
            df['date_dt'] = pd.to_datetime(df['order_date'], errors='coerce')
        elif 'created_at' in df.columns:
            df['date_dt'] = pd.to_datetime(df['created_at'], errors='coerce')
        else:
            logger.warning("No date column found in SGL Order CSV")
            return pd.DataFrame()
        
        df = df.dropna(subset=['date_dt'])
        return df
    except Exception as e:
        logger.error(f"Failed to load SGL Order data: {e}")
        return pd.DataFrame()

def generate_all_time_data(output_file: str = "all_time_daily_product_data.csv"):
    """Generate the all-time daily product data file."""
    logger.info("Starting all-time data generation...")
    
    # 1. Load ChipChip data from Google Sheets
    logger.info("Loading ChipChip data from Google Sheets...")
    if fetch_raw_sheet_data is None:
        logger.error("fetch_raw_sheet_data function not available. Please check imports.")
        return
    
    chipchip_df = fetch_raw_sheet_data()
    if chipchip_df is None or chipchip_df.empty:
        logger.error("No ChipChip data available from Google Sheets")
        return
    
    logger.info(f"Loaded {len(chipchip_df)} rows from Google Sheets")
    
    # Ensure we have required columns
    required_cols = ['date_dt', 'Product Name']
    missing_cols = [col for col in required_cols if col not in chipchip_df.columns]
    if missing_cols:
        logger.error(f"Missing required columns: {missing_cols}")
        return
    
    # 2. Load local shop prices
    logger.info("Loading local shop prices...")
    local_shop_prices = load_local_shop_prices_by_date()
    logger.info(f"Loaded local shop prices for {len(local_shop_prices)} dates")
    
    # 3. Get date range
    chipchip_df['date'] = chipchip_df['date_dt'].dt.date
    min_date = chipchip_df['date'].min()
    max_date = chipchip_df['date'].max()
    logger.info(f"Date range: {min_date} to {max_date}")
    
    # 4. Fetch benchmark prices
    logger.info("Fetching benchmark prices from API...")
    benchmark_prices = fetch_benchmark_prices_by_date(min_date, max_date)
    logger.info(f"Fetched benchmark prices for {len(benchmark_prices)} dates")
    
    # 5. Load SGL order data for additional historical context
    logger.info("Loading SGL Order data...")
    sgl_df = load_sgl_order_data()
    if not sgl_df.empty:
        logger.info(f"Loaded {len(sgl_df)} rows from SGL Order CSV")
    
    # 6. Aggregate ChipChip data by date and product
    logger.info("Aggregating ChipChip data by date and product...")
    
    # Calculate buy price (purchasing price) and sell price (selling price)
    chipchip_df['buy_price'] = chipchip_df.apply(
        lambda row: _parse_float(row.get('PurchasingPrice', 0)) if _parse_float(row.get('PurchasingPrice', 0)) > 0 
        else (_parse_float(row.get('final_cost', 0)) / _parse_float(row.get('final_volume_kg', 1)) 
              if _parse_float(row.get('final_volume_kg', 0)) > 0 else 0.0),
        axis=1
    )
    
    chipchip_df['sell_price'] = chipchip_df.apply(
        lambda row: _parse_float(row.get('price', 0)) if _parse_float(row.get('price', 0)) > 0
        else (_parse_float(row.get('final_revenue', 0)) / _parse_float(row.get('final_volume_kg', 1))
              if _parse_float(row.get('final_volume_kg', 0)) > 0 else 0.0),
        axis=1
    )
    
    chipchip_df['volume_kg'] = chipchip_df['final_volume_kg']
    
    # Group by date and product
    grouped = chipchip_df.groupby(['date', 'Product Name']).agg({
        'buy_price': 'mean',  # Average buy price for the day
        'sell_price': 'mean',  # Average sell price for the day
        'volume_kg': 'sum',    # Total volume for the day
    }).reset_index()
    
    grouped['product_name'] = grouped['Product Name'].apply(lambda x: _normalize_product_name(str(x).strip()))
    
    logger.info(f"Aggregated to {len(grouped)} date-product combinations")
    
    # 7. Build output data
    logger.info("Building output data...")
    output_rows = []
    
    for _, row in grouped.iterrows():
        date_obj = row['date']
        date_str = date_obj.isoformat() if isinstance(date_obj, date) else str(date_obj)
        product_name = row['product_name']
        
        # Get ChipChip data
        chipchip_buy = row['buy_price']
        chipchip_sell = row['sell_price']
        chipchip_volume = row['volume_kg']
        
        # Get local shop price for this date and product
        local_shop_price = None
        if date_str in local_shop_prices:
            local_shop_price = local_shop_prices[date_str].get(product_name)
        
        # Get benchmark prices for this date and product
        farm_price = None
        sunday_market_price = None
        supermarket_price = None
        
        if date_str in benchmark_prices:
            product_prices = benchmark_prices[date_str].get(product_name, {})
            farm_price = product_prices.get("farm")
            sunday_market_price = product_prices.get("sunday_market")
            supermarket_price = product_prices.get("supermarket")
        
        # Forward fill benchmark prices if not available for this date
        # (some benchmark prices are not daily, so we use the most recent available)
        if farm_price is None or sunday_market_price is None or supermarket_price is None:
            # Look backwards for the most recent benchmark prices
            check_date = date_obj
            for _ in range(30):  # Check up to 30 days back
                check_date_str = check_date.isoformat()
                if check_date_str in benchmark_prices:
                    product_prices = benchmark_prices[check_date_str].get(product_name, {})
                    if farm_price is None and "farm" in product_prices:
                        farm_price = product_prices["farm"]
                    if sunday_market_price is None and "sunday_market" in product_prices:
                        sunday_market_price = product_prices["sunday_market"]
                    if supermarket_price is None and "supermarket" in product_prices:
                        supermarket_price = product_prices["supermarket"]
                    
                    if farm_price and sunday_market_price and supermarket_price:
                        break
                check_date = check_date - timedelta(days=1)
                if check_date < min_date:
                    break
        
        output_rows.append({
            'Date': date_str,
            'Product': product_name,
            'ChipChip_Buy_Price': round(chipchip_buy, 2) if chipchip_buy > 0 else '',
            'ChipChip_Sell_Price': round(chipchip_sell, 2) if chipchip_sell > 0 else '',
            'ChipChip_Volume': round(chipchip_volume, 2) if chipchip_volume > 0 else '',
            'Local shop price': round(local_shop_price, 2) if local_shop_price else '',
            'Farm price': round(farm_price, 2) if farm_price else '',
            'Sunday market price': round(sunday_market_price, 2) if sunday_market_price else '',
            'Super market price': round(supermarket_price, 2) if supermarket_price else '',
        })
    
    # 8. Write to CSV
    logger.info(f"Writing {len(output_rows)} rows to {output_file}...")
    output_df = pd.DataFrame(output_rows)
    output_df = output_df.sort_values(['Date', 'Product'])
    output_df.to_csv(output_file, index=False, encoding='utf-8-sig')
    
    logger.info(f"✅ Successfully generated {output_file}")
    logger.info(f"   Total rows: {len(output_rows)}")
    logger.info(f"   Date range: {output_df['Date'].min()} to {output_df['Date'].max()}")
    logger.info(f"   Unique products: {output_df['Product'].nunique()}")
    logger.info(f"   Unique dates: {output_df['Date'].nunique()}")

if __name__ == "__main__":
    output_path = Path(__file__).parent / "all_time_daily_product_data.csv"
    generate_all_time_data(str(output_path))
