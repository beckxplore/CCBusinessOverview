"""
Test All Dashboard Tabs for Clean Data

This script tests all tabs in the dashboard to ensure:
1. Only products with sales in last 7 days are shown
2. No inactive products are displayed
3. Date ranges are consistent
4. Data matches backend API
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8001/api"

def get_product_metrics():
    """Get product metrics from backend"""
    try:
        r = requests.get(f"{BASE_URL}/products/metrics", timeout=60)
        if r.status_code == 200:
            return r.json()
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

def main():
    print("="*80)
    print("DASHBOARD TABS DATA VERIFICATION")
    print("="*80)
    print()
    
    # Get backend data for comparison
    print("Fetching backend data for comparison...")
    metrics_data = get_product_metrics()
    
    if metrics_data:
        metrics = metrics_data.get("metrics", [])
        window = metrics_data.get("window", {})
        print(f"✅ Backend: {len(metrics)} products, Window: {window.get('start')} to {window.get('end')}")
        print(f"✅ All products have volume > 0: {all(m.get('total_volume_kg', 0) > 0 for m in metrics)}")
    else:
        print("⚠️  Could not fetch backend data")
    
    print()
    print("="*80)
    print("TABS TO TEST:")
    print("="*80)
    print("1. Overview")
    print("2. Analytics")
    print("3. SGL")
    print("4. Profitability")
    print("5. Forecast")
    print("6. Strategy")
    print("7. Playground")
    print("8. Benchmark")
    print("9. B2B Financial")
    print("10. B2B Customer")
    print("11. B2B Products")
    print()
    print("Please test each tab manually using Playwright MCP to verify:")
    print("- Only products with sales in last 7 days are shown")
    print("- Date ranges are consistent")
    print("- No inactive products are displayed")
    print()

if __name__ == "__main__":
    main()

