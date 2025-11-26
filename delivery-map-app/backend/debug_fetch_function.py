
import sys
import os
from pathlib import Path

# Add backend to sys.path
backend_path = Path(__file__).resolve().parents[2]
sys.path.append(str(backend_path))

from services.sheet_data import fetch_sheet_metrics

def test_fetch():
    print("Fetching metrics...")
    metrics = fetch_sheet_metrics()
    if not metrics:
        print("No metrics returned.")
        return

    print(f"Returned {len(metrics)} items.")
    
    found = False
    for m in metrics:
        if 'ሃበሻ' in m['product_name']:
            print(f"Found in fetch_sheet_metrics: {m['product_name']}")
            found = True
            
    if not found:
        print("Product with 'ሃበሻ' NOT found in fetch_sheet_metrics output.")

    # Also check strict equality
    target = "Red onion ( ሃበሻ )"
    exact = [m for m in metrics if m['product_name'] == target]
    if exact:
        print(f"Exact match found: {target}")
    else:
        print(f"Exact match NOT found for: {target}")

if __name__ == "__main__":
    test_fetch()

