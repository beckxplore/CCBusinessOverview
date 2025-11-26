import sys
from pathlib import Path
import pandas as pd
from datetime import timedelta

# Add backend to path
backend_path = Path("delivery-map-app/backend")
sys.path.append(str(backend_path.resolve()))

try:
    from services.sheet_data import fetch_raw_sheet_data
except ImportError:
    # Try adjusting path if running from inside backend
    sys.path.append(str(Path.cwd()))
    from services.sheet_data import fetch_raw_sheet_data

def check_latest():
    print("Fetching raw data...")
    df = fetch_raw_sheet_data()
    if df is None:
        print("Failed to fetch.")
        return

    if not pd.api.types.is_datetime64_any_dtype(df['date_dt']):
        df['date_dt'] = pd.to_datetime(df['date_dt'])

    max_date = df['date_dt'].max().date()
    print(f"Latest Date: {max_date}")
    
    # Check last few days volume
    recent = df[df['date_dt'].dt.date > (max_date - timedelta(days=5))]
    daily = recent.groupby(recent['date_dt'].dt.date)['final_volume_kg'].sum()
    print("Daily Volume (Last 5 days):")
    print(daily)

if __name__ == "__main__":
    check_latest()

