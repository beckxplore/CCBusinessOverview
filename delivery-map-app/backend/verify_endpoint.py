import json
import sys

# Read from stdin if piped, otherwise we can't easily get the curl output unless I saved it.
# I'll just use the python script to fetch it again using httpx or requests, or just re-use the verification script logic
# but hitting the localhost endpoint to be 100% sure it's what the frontend sees.

import httpx

def check_endpoint():
    try:
        resp = httpx.get("http://localhost:8001/api/products/metrics")
        data = resp.json()
        metrics = data.get("metrics", [])
        
        total_revenue = sum(m['total_revenue_etb'] for m in metrics)
        total_volume = sum(m['total_volume_kg'] for m in metrics)
        
        print(f"API Revenue: {total_revenue:,.2f}")
        print(f"API Volume:  {total_volume:,.2f}")
        
        if abs(total_revenue - 1379776.50) < 100:
             print("SUCCESS: API matches expected ~1.38M")
        else:
             print("FAILURE: API mismatch")
             
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_endpoint()

