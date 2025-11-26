import sys
import os
from pathlib import Path
import pandas as pd
from datetime import datetime

# Add current directory to path so we can import services
sys.path.append(os.getcwd())

try:
    from services.sheet_data import fetch_raw_sheet_data
except ImportError:
    sys.path.append(str(Path(os.getcwd()) / 'delivery-map-app' / 'backend'))
    from services.sheet_data import fetch_raw_sheet_data

def analyze_nov17_outlier():
    print("Fetching raw sheet data...")
    df = fetch_raw_sheet_data()
    
    if df is None or df.empty:
        print("No data.")
        return

    target_date = datetime(2025, 11, 17).date()
    
    mask = (df['date_dt'].dt.date == target_date)
    daily_df = df[mask].copy()
    
    print(f"\nANALYSIS FOR {target_date}")
    print(f"Total Records: {len(daily_df)}")
    print(f"Total Volume: {daily_df['final_volume_kg'].sum():,.2f}")
    print(f"Total Revenue: {daily_df['final_revenue'].sum():,.2f}")
    
    print("\nTOP 5 ORDERS BY VOLUME:")
    top_vol = daily_df.sort_values('final_volume_kg', ascending=False).head(5)
    for _, row in top_vol.iterrows():
        print(f"- Product: {row.get('Product Name')}")
        print(f"  Vol: {row.get('final_volume_kg'):,.2f}")
        print(f"  Rev: {row.get('final_revenue'):,.2f}")
        print(f"  Raw 'Total Order Quantity in KG': {row.get('Total Order Quantity in KG')}")
        print(f"  Raw 'total_quantity': {row.get('total_quantity')}")
        print("-" * 20)

if __name__ == "__main__":
    analyze_nov17_outlier()

