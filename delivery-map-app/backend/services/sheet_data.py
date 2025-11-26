import gspread
import pandas as pd
from google.oauth2.service_account import Credentials
from pathlib import Path
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

# Configure logging
logger = logging.getLogger(__name__)

# Project Root for finding the key file
# Assuming this file is in backend/services/sheet_data.py, so root is ../../
PROJECT_ROOT = Path(__file__).resolve().parents[3]
KEY_FILE_NAME = 'rugged-weaver-467407-b7-361b4c200e8b.json'
SERVICE_ACCOUNT_FILE = PROJECT_ROOT / KEY_FILE_NAME

SPREADSHEET_ID = '1cOQdUcxsu3reQV1Bi96_9a6isUavEz7YkhsQnRKPNi0'
TARGET_GID = 431565719

def _get_client():
    """Authenticate and return a gspread client."""
    if not SERVICE_ACCOUNT_FILE.exists():
        logger.error(f"Service account file not found at: {SERVICE_ACCOUNT_FILE}")
        return None

    scope = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    
    try:
        creds = Credentials.from_service_account_file(str(SERVICE_ACCOUNT_FILE), scopes=scope)
        client = gspread.authorize(creds)
        return client
    except Exception as e:
        logger.error(f"Failed to authenticate with Google Sheets: {e}")
        return None

def fetch_raw_sheet_data() -> Optional[pd.DataFrame]:
    """
    Fetches raw data from the 'All Data' sheet and performs basic cleaning:
    - Date parsing (created_at -> date_dt)
    - Numeric conversion (removing commas, handling NaNs)
    - Returns the DataFrame with all history
    """
    client = _get_client()
    if not client:
        return None

    try:
        sh = client.open_by_key(SPREADSHEET_ID)
        
        # Find worksheet by GID or default to first
        worksheet = None
        for ws in sh.worksheets():
            if ws.id == TARGET_GID:
                worksheet = ws
                break
        
        if not worksheet:
            logger.warning(f"Worksheet with GID {TARGET_GID} not found. Using the first sheet.")
            worksheet = sh.sheet1

        logger.info(f"Fetching data from Google Sheet: {worksheet.title}")
        
        data = worksheet.get_all_records()
        if not data:
            logger.warning("Sheet is empty.")
            return None

        df = pd.DataFrame(data)
        
        # --- Data Cleaning & Type Conversion ---
        
        if 'created_at' not in df.columns:
            logger.error("Column 'created_at' missing from sheet data.")
            return None

        # Convert 'created_at' to datetime
        df['date_dt'] = pd.to_datetime(df['created_at'], errors='coerce')
        
        # Drop rows with invalid dates
        df = df.dropna(subset=['date_dt'])
        
        if df.empty:
            logger.warning("No valid dates found in 'created_at' column.")
            return None

        # Ensure numeric columns are floats
        numeric_cols = [
            'total_quantity', 'Quantity in KG', 'PurchasingPrice', 'price',
            'Total Order Quantity in KG', 'GMV', 'Total Purchasing Costs'
        ]
        
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(
                    df[col].astype(str).str.replace(',', ''), 
                    errors='coerce'
                ).fillna(0.0)
            else:
                df[col] = 0.0

        # Calculate derived columns row-by-row
        
        # Volume
        # Fix logic: 'Total Order Quantity in KG' seems to contain Revenue or corrupted large numbers sometimes.
        # If 'Total Order Quantity in KG' is suspiciously equal to Revenue or excessively large compared to 'total_quantity',
        # we should trust 'total_quantity' (assuming units ~= kg for these products) or prioritize a different column.
        
        # Let's stick to the original logic but add a sanity check:
        # If 'Total Order Quantity in KG' > 10 * 'total_quantity' (arbitrary large ratio), fallback to 'total_quantity'.
        
        df['final_volume_kg'] = df['Total Order Quantity in KG']
        
        # Fallback 1: If zero/missing, use total_quantity
        mask_zero_vol = df['final_volume_kg'] <= 0
        df.loc[mask_zero_vol, 'final_volume_kg'] = df.loc[mask_zero_vol, 'total_quantity']
        
        # Fallback 2: Sanity check for outliers (e.g. Nov 17 data where KG = Revenue)
        # If final_volume_kg equals GMV (and GMV > 0), it's likely a data entry error copying revenue to volume column.
        # We use a tolerance for floating point equality.
        mask_error = (abs(df['final_volume_kg'] - df['GMV']) < 1.0) & (df['GMV'] > 100)
        if mask_error.any():
             logger.warning(f"Found {mask_error.sum()} rows where Volume ~= Revenue. Using 'total_quantity' fallback.")
             df.loc[mask_error, 'final_volume_kg'] = df.loc[mask_error, 'total_quantity']

        # Revenue
        df['final_revenue'] = df['GMV']
        mask_zero_rev = df['final_revenue'] <= 0
        df.loc[mask_zero_rev, 'final_revenue'] = df.loc[mask_zero_rev, 'price'] * df.loc[mask_zero_rev, 'total_quantity']
        
        # Cost
        df['final_cost'] = df['Total Purchasing Costs']
        mask_zero_cost = df['final_cost'] <= 0
        df.loc[mask_zero_cost, 'final_cost'] = df.loc[mask_zero_cost, 'PurchasingPrice'] * df.loc[mask_zero_cost, 'total_quantity']

        return df

    except Exception as e:
        logger.error(f"Error in fetch_raw_sheet_data: {e}")
        return None

def fetch_sheet_metrics() -> Optional[Dict[str, Any]]:
    """
    Fetches data from the 'All Data' sheet, filters for the last 7 days based on the
    latest date in the 'created_at' column, and aggregates metrics by Product Name.
    Returns a dict with 'metrics' (list) and 'window' (dict with start/end dates).
    """
    df = fetch_raw_sheet_data()
    if df is None or df.empty:
        return None

    try:
        # Determine the "Last 7 Days" window based on the LATEST date in the sheet
        # This ensures we show a full week of data even if sheet updates are lagging.
        max_date = df['date_dt'].max()
        # Normalize to midnight/date object if it's a timestamp
        if hasattr(max_date, 'date'):
            max_date = max_date.date()
            
        window_start = max_date - timedelta(days=6) # inclusive 7 days: [max-6, max]
        
        logger.info(f"Sheet Data Window: {window_start} to {max_date}")
        
        # Filter for the last 7 days
        mask = (df['date_dt'].dt.date >= window_start) & (df['date_dt'].dt.date <= max_date)
        recent_df = df[mask].copy()
        
        if recent_df.empty:
            logger.warning("No data found in the last 7 days window.")
            return {
                "metrics": [],
                "window": {"start": window_start, "end": max_date}
            }

        # --- Aggregation ---
        if 'Product Name' not in recent_df.columns:
             logger.error("Column 'Product Name' missing.")
             return {
                 "metrics": [],
                 "window": {"start": window_start, "end": max_date}
             }

        grouped = recent_df.groupby('Product Name').agg({
            'final_volume_kg': 'sum',
            'final_revenue': 'sum',
            'final_cost': 'sum',
            'total_quantity': 'sum',
            'price': 'last',
            'created_at': 'count'
        }).reset_index()

        metrics_list = []
        
        for _, row in grouped.iterrows():
            product_name = str(row['Product Name']).strip()
            if not product_name:
                continue
                
            vol_kg = float(row['final_volume_kg'])
            revenue = float(row['final_revenue'])
            cost = float(row['final_cost'])
            total_units = float(row['total_quantity'])
            order_count = int(row['created_at'])
            latest_price = float(row['price'])
            
            avg_sell_price = revenue / vol_kg if vol_kg > 0 else 0.0
            
            entry = {
                "product_name": product_name,
                "product_id": None,
                "total_volume_kg": vol_kg,
                "sgl_volume_kg": 0.0, 
                "normal_volume_kg": 0.0,
                "avg_selling_price": avg_sell_price,
                "latest_selling_price": latest_price,
                "total_revenue_etb": revenue,
                "order_count": order_count,
                "total_cost_etb": cost,
                "gross_profit_etb": revenue - cost
            }
            metrics_list.append(entry)
            
        return {
            "metrics": metrics_list,
            "window": {"start": window_start, "end": max_date}
        }

    except Exception as e:
        logger.error(f"Error in fetch_sheet_metrics aggregation: {e}")
        return None

if __name__ == "__main__":
    # Local test
    import sys
    logging.basicConfig(level=logging.INFO)
    data = fetch_sheet_metrics()
    if data:
        print(f"Fetched {len(data)} products.")
        tomato = next((item for item in data if 'Tomato' in item['product_name']), None)
        if tomato:
            print("Tomato Sample:", tomato)
        else:
            print("Sample:", data[0] if data else "None")
    else:
        print("No data fetched.")
