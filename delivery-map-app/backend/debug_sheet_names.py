
import gspread
import pandas as pd
from google.oauth2.service_account import Credentials
from pathlib import Path
import logging
from datetime import datetime, timedelta

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Paths
PROJECT_ROOT = Path(__file__).resolve().parents[2]
KEY_FILE_NAME = 'rugged-weaver-467407-b7-361b4c200e8b.json'
SERVICE_ACCOUNT_FILE = PROJECT_ROOT / KEY_FILE_NAME
SPREADSHEET_ID = '1cOQdUcxsu3reQV1Bi96_9a6isUavEz7YkhsQnRKPNi0'
TARGET_GID = 431565719

def check_sheet_names():
    scope = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    creds = Credentials.from_service_account_file(str(SERVICE_ACCOUNT_FILE), scopes=scope)
    client = gspread.authorize(creds)

    sh = client.open_by_key(SPREADSHEET_ID)
    worksheet = None
    for ws in sh.worksheets():
        if ws.id == TARGET_GID:
            worksheet = ws
            break
    
    if not worksheet:
        worksheet = sh.sheet1
        print("Target sheet not found, using first sheet.")

    print(f"Fetching data from: {worksheet.title}")
    data = worksheet.get_all_records()
    df = pd.DataFrame(data)
    
    if 'created_at' not in df.columns:
        print("Error: 'created_at' column missing.")
        return

    df['date_dt'] = pd.to_datetime(df['created_at'], errors='coerce')
    df = df.dropna(subset=['date_dt'])
    
    max_date = df['date_dt'].max()
    window_start = max_date - timedelta(days=6)
    print(f"Window: {window_start} to {max_date}")
    
    recent_df = df[df['date_dt'] >= window_start]
    
    unique_products = recent_df['Product Name'].unique()
    print("\nUnique Products in Last 7 Days:")
    for p in sorted(unique_products):
        print(f" - '{p}'")

    print(f"\nIs 'Red onion ( ሃበሻ )' present? {'Red onion ( ሃበሻ )' in unique_products}")

if __name__ == "__main__":
    check_sheet_names()

