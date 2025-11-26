import requests
try:
    print("Testing API...")
    r = requests.get("http://localhost:8001/api/products/metrics")
    r.raise_for_status()
    data = r.json()
    print("Window:", data.get("window"))
    metrics = data.get("metrics", [])
    total_rev = sum(float(m.get("total_revenue_etb", 0)) for m in metrics)
    total_vol = sum(float(m.get("total_volume_kg", 0)) for m in metrics)
    print(f"API Total Revenue: {total_rev:,.2f}")
    print(f"API Total Volume: {total_vol:,.2f}")
except Exception as e:
    print(f"Error: {e}")
