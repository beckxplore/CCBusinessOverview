"""Verify that we're reading from the correct rows."""
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
    
    all_values = ws.get_all_values()
    
    # Check the specific rows
    target_rows = [51, 58, 71]  # 1-indexed row numbers
    
    print("=" * 80)
    print("Verifying Cost Category Rows")
    print("=" * 80)
    
    for row_num in target_rows:
        if row_num <= len(all_values):
            row = all_values[row_num - 1]  # Convert to 0-indexed
            day_value = row[0] if len(row) > 0 else ""
            print(f"\nRow {row_num}: '{day_value}'")
            
            # Show first 5 date column values
            print(f"  First 5 date column values:")
            for col_idx in range(4, min(9, len(row))):  # Columns 5-9 (after Day, Responsible, Data Source, Link)
                if col_idx < len(row):
                    value = row[col_idx]
                    header = all_values[0][col_idx] if col_idx < len(all_values[0]) else f"Col{col_idx}"
                    print(f"    {header}: {value}")
        else:
            print(f"\nRow {row_num}: Not found (sheet has {len(all_values)} rows)")
            
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

