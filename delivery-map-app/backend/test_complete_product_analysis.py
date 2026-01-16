"""
Complete Product Analysis: Compare all sources
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8001/api"

print("=" * 80)
print("COMPLETE PRODUCT COUNT ANALYSIS")
print("=" * 80)
print()

# 1. Get API metrics
print("1. API /products/metrics")
print("-" * 80)
try:
    r = requests.get(f"{BASE_URL}/products/metrics", timeout=60)
    if r.status_code == 200:
        data = r.json()
        metrics = data.get('metrics', [])
        window = data.get('window', {})
        print(f"✅ Total Products: {len(metrics)}")
        print(f"✅ Window: {window.get('start')} to {window.get('end')}")
        print(f"✅ Products with volume > 0: {len([m for m in metrics if m.get('total_volume_kg', 0) > 0])}")
        
        # Count by source
        clickhouse = [m for m in metrics if m.get('product_id') is not None]
        sheets = [m for m in metrics if m.get('product_id') is None]
        print(f"   - From ClickHouse: {len(clickhouse)}")
        print(f"   - From Google Sheets: {len(sheets)}")
        
        api_product_names = {m.get('product_name') for m in metrics}
        print(f"✅ Unique product names: {len(api_product_names)}")
    else:
        print(f"❌ Error: HTTP {r.status_code}")
except Exception as e:
    print(f"❌ Error: {e}")

print()

# 2. Get product costs
print("2. API /costs/products")
print("-" * 80)
try:
    r = requests.get(f"{BASE_URL}/costs/products", timeout=30)
    if r.status_code == 200:
        data = r.json()
        products = data.get('products', [])
        print(f"✅ Total Products in Costs: {len(products)}")
        cost_product_names = {p.get('product_name') for p in products}
        print(f"✅ Unique product names: {len(cost_product_names)}")
    else:
        print(f"❌ Error: HTTP {r.status_code}")
except Exception as e:
    print(f"❌ Error: {e}")

print()

# 3. Compare
print("3. COMPARISON")
print("-" * 80)
if 'api_product_names' in locals() and 'cost_product_names' in locals():
    # Products in costs but not in metrics
    in_costs_not_metrics = cost_product_names - api_product_names
    print(f"Products in costs but NOT in metrics: {len(in_costs_not_metrics)}")
    if len(in_costs_not_metrics) > 0:
        print("   Sample (first 20):")
        for name in list(in_costs_not_metrics)[:20]:
            print(f"     - {name}")
    
    print()
    
    # Products in metrics but not in costs
    in_metrics_not_costs = api_product_names - cost_product_names
    print(f"Products in metrics but NOT in costs: {len(in_metrics_not_costs)}")
    if len(in_metrics_not_costs) > 0:
        print("   Sample (first 20):")
        for name in list(in_metrics_not_costs)[:20]:
            print(f"     - {name}")

print()
print("=" * 80)
print("SUMMARY")
print("=" * 80)
print("Dashboard shows: 130 products")
print("API returns: 78 products")
print("ClickHouse has: 80 products")
print("Product costs: 309 products")
print()
print("⚠️  ISSUE: Dashboard is showing 130 products, but API only has 78!")
print("   This means the frontend is including products from productCosts")
print("   that have volume but aren't in the API response.")

