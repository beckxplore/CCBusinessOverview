import sys
from pathlib import Path
import pandas as pd
from datetime import timedelta
import logging

# Add backend to path
# We are running this from delivery-map-app/backend
# So we need to add the current directory to sys.path to import services
# Actually, main.py does imports like 'from services.sheet_data import ...'
# So if we run from 'delivery-map-app/backend', the current dir is in path.
# However, services is a package.

logging.basicConfig(level=logging.INFO)

try:
    from services.sheet_data import fetch_raw_sheet_data
except ImportError:
    # Fallback if running from wrong dir
    sys.path.append(str(Path(__file__).resolve().parent))
    from services.sheet_data import fetch_raw_sheet_data

def check():
    print("Fetching raw sheet data...")
    df = fetch_raw_sheet_data()
    if df is None:
        print("No data.")
        return

    if not pd.api.types.is_datetime64_any_dtype(df['date_dt']):
        df['date_dt'] = pd.to_datetime(df['date_dt'])

    max_date = df['date_dt'].max()
    print(f"Latest date in sheet: {max_date}")
    
    # Check for any data > Nov 20
    recent = df[df['date_dt'] > '2025-11-20']
    if not recent.empty:
        print(f"Found {len(recent)} entries after Nov 20:")
        print(recent[['date_dt', 'Product Name', 'final_volume_kg', 'GMV']].head())
    else:
        print("No entries after Nov 20.")

if __name__ == "__main__":
    check()

