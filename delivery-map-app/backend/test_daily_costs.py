"""Test script for daily operational costs endpoint."""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from main import load_daily_operational_costs_data, app
import json

def test_load_function():
    """Test the load function directly."""
    print("=" * 60)
    print("Testing load_daily_operational_costs_data() function")
    print("=" * 60)
    
    # Check Google Sheets configuration first
    from services.google_sheets import is_configured, GoogleSheetsClient
    print(f"\n📋 Google Sheets Configuration:")
    print(f"   Configured: {is_configured()}")
    
    if not is_configured():
        print("\n⚠️  Google Sheets credentials not configured!")
        print("   You need to set one of:")
        print("   - GOOGLE_SERVICE_ACCOUNT_JSON (JSON string)")
        print("   - GOOGLE_SERVICE_ACCOUNT_FILE (path to JSON file)")
        print("\n   Without this, the function cannot access the Google Sheet.")
        return False
    
    # Test the actual load function (which handles duplicate headers)
    print("\n🔍 Testing load function (handles duplicate headers)...")
    
    try:
        costs = load_daily_operational_costs_data()
        print(f"\n✅ Successfully loaded {len(costs)} daily cost records")
        
        if costs:
            print("\n📊 Sample data (first 5 records):")
            for i, cost in enumerate(costs[:5], 1):
                print(f"  {i}. Date: {cost['date']}, Category: {cost['category']}, Cost: {cost['cost_per_kg']} ETB/kg")
            
            # Group by category
            categories = {}
            for cost in costs:
                cat = cost['category']
                if cat not in categories:
                    categories[cat] = []
                categories[cat].append(cost)
            
            print(f"\n📈 Summary by category:")
            for cat, items in categories.items():
                print(f"  - {cat}: {len(items)} records")
                if items:
                    avg = sum(c['cost_per_kg'] for c in items) / len(items)
                    print(f"    Average: {avg:.2f} ETB/kg")
        else:
            print("\n⚠️  No data returned. This could mean:")
            print("   - The Google Sheet is empty")
            print("   - The cost category rows weren't found")
            print("   - Date columns weren't detected")
            
    except Exception as e:
        print(f"\n❌ Error loading data: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

def test_api_endpoint():
    """Test the API endpoint using test client."""
    print("\n" + "=" * 60)
    print("Testing /api/costs/daily-operational endpoint")
    print("=" * 60)
    
    try:
        from fastapi.testclient import TestClient
        client = TestClient(app)
        
        # Test without date range
        print("\n1. Testing without date range...")
        response = client.get("/api/costs/daily-operational")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success! Returned {data.get('count', 0)} records")
            if data.get('daily_costs'):
                print(f"   📅 Date range: {data.get('date_range', {}).get('from')} to {data.get('date_range', {}).get('to')}")
                print(f"   📊 First record: {json.dumps(data['daily_costs'][0], indent=6)}")
        else:
            print(f"   ❌ Error: {response.text}")
            
        # Test with date range
        print("\n2. Testing with date range (last 7 days)...")
        from datetime import datetime, timedelta
        today = datetime.now()
        week_ago = today - timedelta(days=7)
        date_from = week_ago.strftime("%Y-%m-%d")
        date_to = today.strftime("%Y-%m-%d")
        
        response = client.get(f"/api/costs/daily-operational?date_from={date_from}&date_to={date_to}")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success! Returned {data.get('count', 0)} records for date range")
        else:
            print(f"   ❌ Error: {response.text}")
            
    except ImportError:
        print("   ⚠️  TestClient not available. Install with: pip install httpx")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("\n🧪 Testing Daily Operational Costs Integration\n")
    
    # Check environment variables
    sheet_id = os.getenv("GSHEET_DAILY_OPERATIONAL_COST_ID")
    worksheet = os.getenv("GSHEET_DAILY_OPERATIONAL_COST_WORKSHEET")
    
    print(f"📋 Configuration:")
    print(f"   Sheet ID: {sheet_id}")
    print(f"   Worksheet: {worksheet}")
    print()
    
    if not sheet_id:
        print("❌ GSHEET_DAILY_OPERATIONAL_COST_ID not set in environment!")
        sys.exit(1)
    
    # Test the load function
    success = test_load_function()
    
    # Test the API endpoint
    test_api_endpoint()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ Testing complete!")
    else:
        print("⚠️  Testing completed with warnings. Check output above.")
    print("=" * 60 + "\n")

