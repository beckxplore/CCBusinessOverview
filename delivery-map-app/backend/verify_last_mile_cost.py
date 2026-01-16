"""Verify Last Mile Cost data from Google Sheet"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from main import load_daily_operational_costs_data, GoogleSheetsClient
import json
from datetime import datetime

def verify_row_numbers():
    """Verify the actual row numbers being read from the sheet"""
    print("=" * 80)
    print("VERIFYING ROW NUMBERS AND DATA")
    print("=" * 80)
    
    # Get raw sheet data
    from main import DAILY_OPERATIONAL_COST_SHEET_ID, DAILY_OPERATIONAL_COST_SHEET_WORKSHEET
    
    if not DAILY_OPERATIONAL_COST_SHEET_ID:
        print("ERROR: DAILY_OPERATIONAL_COST_SHEET_ID not configured")
        return
    
    try:
        client = GoogleSheetsClient.get_instance()
        spreadsheet = client._client.open_by_key(DAILY_OPERATIONAL_COST_SHEET_ID)
        ws = spreadsheet.worksheet(DAILY_OPERATIONAL_COST_SHEET_WORKSHEET)
        
        all_values = ws.get_all_values()
        
        print(f"\nTotal rows in sheet: {len(all_values)}")
        print(f"\nChecking specific rows:")
        
        # Check Row 51 (index 50) - Warehouse
        if len(all_values) > 50:
            row_51 = all_values[50]  # 0-indexed, so row 51 is index 50
            print(f"\nRow 51 (Warehouse): {row_51[0] if row_51 else 'EMPTY'}")
            print(f"  Full row: {row_51[:10]}")  # First 10 columns
        
        # Check Row 58 (index 57) - Fulfilment
        if len(all_values) > 57:
            row_58 = all_values[57]  # 0-indexed, so row 58 is index 57
            print(f"\nRow 58 (Fulfilment): {row_58[0] if row_58 else 'EMPTY'}")
            print(f"  Full row: {row_58[:10]}")  # First 10 columns
        
        # Check Row 71 (index 70) - Last Mile
        if len(all_values) > 70:
            row_71 = all_values[70]  # 0-indexed, so row 71 is index 70
            print(f"\nRow 71 (Last Mile): {row_71[0] if row_71 else 'EMPTY'}")
            print(f"  Full row: {row_71[:10]}")  # First 10 columns
        
        # Check headers to find date columns
        headers = [str(h).strip() for h in all_values[0]] if all_values else []
        print(f"\nHeaders (first 15 columns): {headers[:15]}")
        
        # Find date columns
        date_cols = []
        for idx, header in enumerate(headers):
            if idx < 4:  # Skip Day, Responsible, Data Source, Link
                continue
            try:
                # Try to parse as date
                date_str = header.strip()
                if not date_str:
                    continue
                for fmt in ["%m/%d/%Y", "%m-%d-%Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%y", "%d/%m/%y"]:
                    try:
                        parsed_date = datetime.strptime(date_str, fmt)
                        if parsed_date.year < 2020:
                            parsed_date = parsed_date.replace(year=2000 + (parsed_date.year % 100))
                        if 2020 <= parsed_date.year <= 2030:
                            date_cols.append((idx, parsed_date.date(), header))
                            break
                    except ValueError:
                        continue
            except:
                continue
        
        # Sort by date
        date_cols.sort(key=lambda x: x[1])
        
        print(f"\nFound {len(date_cols)} date columns")
        print("Latest 5 date columns:")
        for col_idx, date_obj, header in date_cols[-5:]:
            print(f"  Column {col_idx}: {header} -> {date_obj}")
            
            # Get values from Row 71 (Last Mile) for this date
            if len(all_values) > 70 and len(all_values[70]) > col_idx:
                value = all_values[70][col_idx]
                print(f"    Row 71 value: {value}")
        
        print("\n" + "=" * 80)
        print("LOADED DATA FROM API FUNCTION")
        print("=" * 80)
        
        # Now check what the function returns
        daily_costs = load_daily_operational_costs_data()
        
        # Filter for last_mile costs
        last_mile_costs = [d for d in daily_costs if d.get('category') == 'last_mile']
        
        print(f"\nTotal last_mile costs loaded: {len(last_mile_costs)}")
        
        # Get latest 10 dates
        if last_mile_costs:
            sorted_costs = sorted(last_mile_costs, key=lambda x: x.get('date', ''))
            print("\nLatest 10 Last Mile costs:")
            for cost in sorted_costs[-10:]:
                print(f"  Date: {cost.get('date')}, Cost: {cost.get('cost_per_kg')}")
            
            # Calculate average of latest values
            latest_costs = [c.get('cost_per_kg', 0) for c in sorted_costs[-7:]]  # Last 7 days
            if latest_costs:
                avg = sum(latest_costs) / len(latest_costs)
                print(f"\nAverage of last 7 days: {avg:.2f}")
                print(f"Latest single value: {sorted_costs[-1].get('cost_per_kg')}")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_row_numbers()

