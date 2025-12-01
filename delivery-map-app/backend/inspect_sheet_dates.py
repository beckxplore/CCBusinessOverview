"""Inspect the date format in the Google Sheet."""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))
load_dotenv()

from services.google_sheets import GoogleSheetsClient

sheet_id = os.getenv("GSHEET_DAILY_OPERATIONAL_COST_SHEET_ID")
worksheet_name = os.getenv("GSHEET_DAILY_OPERATIONAL_COST_WORKSHEET", "Daily CP 1 & 2")

try:
    client = GoogleSheetsClient.get_instance()
    spreadsheet = client._client.open_by_key(sheet_id)
    ws = spreadsheet.worksheet(worksheet_name)
    
    # Get first few rows to see the structure
    all_values = ws.get_all_values()
    
    if not all_values:
        print("Sheet is empty")
        sys.exit(1)
    
    # Show header row
    print("=" * 80)
    print("HEADER ROW (Row 1):")
    print("=" * 80)
    headers = all_values[0]
    for i, header in enumerate(headers[:20]):  # First 20 columns
        print(f"Column {i+1} (index {i}): '{header}'")
    
    print("\n" + "=" * 80)
    print("SAMPLE DATA ROWS:")
    print("=" * 80)
    
    # Find rows with cost categories
    day_col_idx = None
    for idx, header in enumerate(headers):
        if str(header).strip().lower() == "day":
            day_col_idx = idx
            break
    
    if day_col_idx is None:
        print("Could not find 'Day' column")
        sys.exit(1)
    
    print(f"\n'Day' column is at index {day_col_idx}\n")
    
    # Show first 10 data rows
    for row_idx, row in enumerate(all_values[1:11], start=2):
        if len(row) > day_col_idx:
            day_value = row[day_col_idx] if day_col_idx < len(row) else ""
            print(f"Row {row_idx}: Day='{day_value}'")
            
            # Show first few date columns
            print(f"  First 5 date columns (after Day column):")
            date_count = 0
            for col_idx in range(day_col_idx + 1, min(len(row), day_col_idx + 6)):
                if col_idx < len(headers):
                    header = headers[col_idx]
                    value = row[col_idx] if col_idx < len(row) else ""
                    print(f"    Column {col_idx}: Header='{header}', Value='{value}'")
                    date_count += 1
            print()
    
    # Show date column headers
    print("=" * 80)
    print("DATE COLUMN HEADERS (first 20 after 'Day' column):")
    print("=" * 80)
    for col_idx in range(day_col_idx + 1, min(len(headers), day_col_idx + 21)):
        header = headers[col_idx]
        print(f"Column {col_idx}: '{header}'")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

