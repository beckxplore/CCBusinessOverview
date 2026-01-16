"""Debug which rows are being matched as last_mile costs"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from main import GoogleSheetsClient, DAILY_OPERATIONAL_COST_SHEET_ID, DAILY_OPERATIONAL_COST_SHEET_WORKSHEET
from datetime import datetime

def debug_row_matching():
    """Find all rows that match last_mile category"""
    print("=" * 80)
    print("DEBUGGING ROW MATCHING FOR LAST MILE COSTS")
    print("=" * 80)
    
    client = GoogleSheetsClient.get_instance()
    spreadsheet = client._client.open_by_key(DAILY_OPERATIONAL_COST_SHEET_ID)
    ws = spreadsheet.worksheet(DAILY_OPERATIONAL_COST_SHEET_WORKSHEET)
    
    all_values = ws.get_all_values()
    headers = [str(h).strip() for h in all_values[0]] if all_values else []
    
    # Find Day column
    day_col_idx = None
    for idx, header in enumerate(headers):
        if header.lower().strip() == "day":
            day_col_idx = idx
            break
    
    print(f"Day column index: {day_col_idx}")
    
    # Find date columns
    date_column_indices = []
    for idx, header in enumerate(headers):
        if idx < 4:  # Skip Day, Responsible, Data Source, Link
            continue
        try:
            date_str = header.strip()
            if not date_str:
                continue
            for fmt in ["%m/%d/%Y", "%m-%d-%Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%y", "%d/%m/%y"]:
                try:
                    parsed_date = datetime.strptime(date_str, fmt)
                    if parsed_date.year < 2020:
                        parsed_date = parsed_date.replace(year=2000 + (parsed_date.year % 100))
                    if 2020 <= parsed_date.year <= 2030:
                        date_column_indices.append((idx, parsed_date.date(), header))
                        break
                except ValueError:
                    continue
        except:
            continue
    
    date_column_indices.sort(key=lambda x: x[1])
    
    # Known cost rows
    known_cost_rows = {
        50: "warehouse",  # Row 51
        57: "fulfilment",  # Row 58
        70: "last_mile",   # Row 71
    }
    
    cost_categories = {
        "warehouse": ["warehouse costs per kg", "warehouse cost per kg", "warehouse costs"],
        "fulfilment": ["fulfilment costs per kg", "fulfillment costs per kg", "fulfilment cost per kg", "fulfillment cost per kg", "fulfilment costs"],
        "last_mile": ["last mile costs per kg", "last mile cost per kg", "last mile costs", "last-mile costs per kg"]
    }
    
    print(f"\nChecking rows for last_mile matches...")
    print(f"Total rows: {len(all_values)}")
    
    last_mile_matches = []
    
    # Check all rows starting from row 2
    for row_index_in_array, row in enumerate(all_values[1:], start=1):
        if len(row) <= day_col_idx:
            continue
        
        day_value = str(row[day_col_idx]).strip().lower()
        if not day_value:
            continue
        
        category_type = None
        
        # Check if this row index matches known cost rows
        if row_index_in_array in known_cost_rows:
            category_type = known_cost_rows[row_index_in_array]
        else:
            # Check keyword matching
            for cat_type, keywords in cost_categories.items():
                if any(keyword in day_value for keyword in keywords):
                    category_type = cat_type
                    break
        
        if category_type == "last_mile":
            actual_row_num = row_index_in_array + 1
            print(f"\nFound last_mile match:")
            print(f"  Row number: {actual_row_num} (index {row_index_in_array})")
            print(f"  Day column value: '{day_value}'")
            print(f"  Match type: {'Known row' if row_index_in_array in known_cost_rows else 'Keyword match'}")
            
            # Check values for latest date (2025-12-01)
            target_date = datetime(2025, 12, 1).date()
            for col_idx, date_obj, header in date_column_indices:
                if date_obj == target_date and col_idx < len(row):
                    value = row[col_idx].strip()
                    if value:
                        try:
                            float_val = float(value)
                            if float_val > 0:
                                print(f"    Date {date_obj} (col {col_idx}): {value} -> {float_val}")
                                last_mile_matches.append({
                                    'row': actual_row_num,
                                    'date': date_obj,
                                    'value': float_val,
                                    'day_value': day_value
                                })
                        except:
                            pass
    
    print(f"\n" + "=" * 80)
    print(f"SUMMARY FOR 2025-12-01:")
    print("=" * 80)
    for match in last_mile_matches:
        print(f"Row {match['row']}: {match['value']} (Day column: '{match['day_value']}')")
    
    if last_mile_matches:
        values = [m['value'] for m in last_mile_matches]
        print(f"\nAll values found: {values}")
        print(f"Expected (Row 71): 4.5")
        print(f"Average of all matches: {sum(values)/len(values):.2f}")

if __name__ == "__main__":
    debug_row_matching()

