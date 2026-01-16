"""Quick check script to verify the endpoint and see how many products it returns"""
import sys
sys.path.insert(0, '.')

from main import app
import requests

# Check if route exists
routes = [r.path for r in app.routes if hasattr(r, 'path')]
daily_profit_routes = [r for r in routes if 'daily-profitability' in r]
print(f"Routes with 'daily-profitability': {daily_profit_routes}")

# Try to call the endpoint
try:
    response = requests.get(
        "http://localhost:8001/api/products/daily-profitability",
        params={"date_from": "2025-04-01", "date_to": "2025-04-10"},
        timeout=60
    )
    print(f"\nStatus Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total count: {data.get('count', 0)}")
        products = data.get('daily_products', [])
        print(f"Products in response: {len(products)}")
        
        # Count unique products
        unique_products = set(p.get('product_name') for p in products)
        print(f"Unique product names: {len(unique_products)}")
        
        # Show first few
        print(f"\nFirst 10 products:")
        for i, p in enumerate(products[:10]):
            print(f"  {i+1}. {p.get('product_name')} - {p.get('date')} - Vol: {p.get('total_volume_kg')}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Error calling endpoint: {e}")

