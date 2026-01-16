"""Debug date column parsing to find why 2025-12-01 shows wrong value"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from main import GoogleSheetsClient, DAILY_OPERATIONAL_COST_SHEET_ID, DAILY_OPERATIONAL_COST_SHEET_WORKSHEET
from datetime import datetime

def debug_date_columns():
    """Check all date columns and their values for Row 71"""
    client = GoogleSheetsClient.get_instance()
    spreadsheet = client._client.open_by_key(DAILY_OPERATIONAL_COST_SHEET_ID)
    ws = spreadsheet.worksheet(DAILY_OPERATIONAL_COST_SHEET_WORKSHEET)
    
    all_values = ws.get_all_values()
    headers = [str(h).strip() for h in all_values[0]] if all_values else []
    
    # Get Row 71 (index 70)
    row_71 = all_values[70] if len(all_values) > 70 else []
    
    print("=" * 80)
    print("DEBUGGING DATE COLUMNS FOR ROW 71 (Last Mile Costs)")
    print("=" * 80)
    
    # Check all columns that might be dates
    print(f"\nTotal columns: {len(headers)}")
    print(f"Row 71 length: {len(row_71)}")
    
    # Find all date columns
    date_columns = []
    for idx, header in enumerate(headers):
        if idx < 4:  # Skip Day, Responsible, Data Source, Link
            continue
        
        header_str = header.strip()
        if not header_str:
            continue
        
        # Try to parse as date
        parsed_date = None
        for fmt in ["%m/%d/%Y", "%m-%d-%Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%y", "%d/%m/%y"]:
            try:
                temp_date = datetime.strptime(header_str, fmt)
                if temp_date.year < 2020:
                    temp_date = temp_date.replace(year=2000 + (temp_date.year % 100))
                if 2020 <= temp_date.year <= 2030:
                    parsed_date = temp_date.date()
                    break
            except ValueError:
                continue
        
        if parsed_date:
            value = row_71[idx] if idx < len(row_71) else ""
            date_columns.append((idx, parsed_date, header_str, value))
    
    # Sort by date
    date_columns.sort(key=lambda x: x[1])
    
    print(f"\nFound {len(date_columns)} date columns")
    print("\nAll date columns with Row 71 values:")
    for col_idx, date_obj, header, value in date_columns:
        print(f"  Col {col_idx}: {header} -> {date_obj} = '{value}'")
    
    # Check specifically for 2025-12-01
    target_date = datetime(2025, 12, 1).date()
    print(f"\n" + "=" * 80)
    print(f"Columns matching {target_date}:")
    print("=" * 80)
    matches = [dc for dc in date_columns if dc[1] == target_date]
    for col_idx, date_obj, header, value in matches:
        print(f"  Col {col_idx}: '{header}' -> {date_obj} = '{value}'")
        try:
            float_val = float(value) if value.strip() else None
            print(f"    Parsed as: {float_val}")
        except:
            print(f"    Could not parse as float")

if __name__ == "__main__":
    debug_date_columns()

