"""Check API response for product count"""
import requests
import json

BASE_URL = "http://localhost:8001/api"

try:
    r = requests.get(f"{BASE_URL}/products/metrics", timeout=60)
    if r.status_code == 200:
        data = r.json()
        metrics = data.get('metrics', [])
        window = data.get('window', {})
        
        print("=" * 80)
        print("API RESPONSE ANALYSIS")
        print("=" * 80)
        print(f"Total Products in API: {len(metrics)}")
        print(f"Window: {window.get('start')} to {window.get('end')}")
        print()
        
        # Count by source
        clickhouse_products = [m for m in metrics if m.get('product_id') is not None]
        sheet_products = [m for m in metrics if m.get('product_id') is None]
        
        print(f"Products from ClickHouse: {len(clickhouse_products)}")
        print(f"Products from Google Sheets: {len(sheet_products)}")
        print()
        
        # Check volumes
        zero_volume = [m for m in metrics if m.get('total_volume_kg', 0) <= 0]
        print(f"Products with volume > 0: {len(metrics) - len(zero_volume)}")
        print(f"Products with volume = 0: {len(zero_volume)}")
        print()
        
        if zero_volume:
            print("⚠️  WARNING: Products with zero volume found:")
            for p in zero_volume[:10]:
                print(f"  - {p.get('product_name')}: {p.get('total_volume_kg', 0)} kg")
        else:
            print("✅ All products have volume > 0")
        print()
        
        # Show sample products
        print("Sample products (first 20):")
        for i, m in enumerate(metrics[:20], 1):
            source = "ClickHouse" if m.get('product_id') else "Sheets"
            print(f"  {i}. {m.get('product_name')}: {m.get('total_volume_kg', 0):.2f} kg ({source})")
        
    else:
        print(f"Error: HTTP {r.status_code}")
except Exception as e:
    print(f"Error: {e}")

