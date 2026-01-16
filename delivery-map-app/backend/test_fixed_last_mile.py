"""Test that Last Mile cost fix is working correctly"""
import requests
import json

BASE_URL = "http://localhost:8001/api"

print("=" * 80)
print("TESTING FIXED LAST MILE COST DATA")
print("=" * 80)

# Test with date range around latest data
r = requests.get(f"{BASE_URL}/costs/daily-operational?date_from=2025-11-25&date_to=2025-12-01", timeout=30)
if r.status_code == 200:
    data = r.json()
    print(f"\nDate range: {data.get('date_range')}")
    print(f"Total daily costs: {len(data.get('daily_costs', []))}")
    
    print("\nLast Mile costs for each date:")
    for cost in data.get('daily_costs', []):
        date = cost.get('date')
        last_mile = cost.get('last_mile_cost_per_kg')
        if last_mile is not None:
            print(f"  {date}: {last_mile}")
    
    # Calculate average
    last_mile_values = [c.get('last_mile_cost_per_kg') for c in data.get('daily_costs', []) if c.get('last_mile_cost_per_kg') is not None]
    if last_mile_values:
        avg = sum(last_mile_values) / len(last_mile_values)
        print(f"\nAverage Last Mile Cost: {avg:.2f}")
        print(f"Latest value (2025-12-01): {data.get('daily_costs', [])[-1].get('last_mile_cost_per_kg', 'N/A')}")
        print(f"\nExpected: Latest should be 4.5 (from Row 71)")
else:
    print(f"Error: {r.status_code}")
    print(r.text)

