"""Test daily operational costs API"""
import requests
import json

BASE_URL = "http://localhost:8001/api"

# Test 1: Request Nov 25 - Dec 1
print("=" * 80)
print("TEST 1: Request Nov 25 - Dec 1")
print("=" * 80)
r = requests.get(f"{BASE_URL}/costs/daily-operational?date_from=2025-11-25&date_to=2025-12-01", timeout=30)
if r.status_code == 200:
    data = r.json()
    print(f"Status: {r.status_code}")
    print(f"Daily costs count: {len(data.get('daily_costs', []))}")
    print(f"Response count: {data.get('count', 0)}")
    print(f"Date range: {data.get('date_range')}")
    print("\nDates returned:")
    for cost in data.get('daily_costs', []):
        print(f"  - {cost.get('date')}")
else:
    print(f"Error: {r.status_code}")
    print(r.text)

print("\n" + "=" * 80)
print("TEST 2: Request all data (no date filter)")
print("=" * 80)
r2 = requests.get(f"{BASE_URL}/costs/daily-operational", timeout=30)
if r2.status_code == 200:
    data2 = r2.json()
    dates = sorted(set([d.get('date') for d in data2.get('daily_costs', [])]))
    print(f"Total dates available: {len(dates)}")
    print(f"First date: {dates[0] if dates else 'None'}")
    print(f"Last date: {dates[-1] if dates else 'None'}")
    print("\nDates around Nov 25 - Dec 1:")
    target_dates = ['2025-11-25', '2025-11-26', '2025-11-27', '2025-11-28', '2025-11-29', '2025-11-30', '2025-12-01']
    for d in target_dates:
        status = '✅' if d in dates else '❌'
        print(f"  {status} {d}")

