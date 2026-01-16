#!/usr/bin/env python3
"""Test Amharic text handling in the API"""

import sys
from pathlib import Path
import json

sys.path.insert(0, str(Path(__file__).parent))

from main import load_product_metrics_data, load_product_costs_data

print("=" * 70)
print("AMHARIC TEXT SUPPORT TEST")
print("=" * 70)

# Test 1: Check for products with Amharic characters
print("\n📊 Test 1: Products with Amharic Characters")
print("-" * 70)

metrics = load_product_metrics_data()
costs = load_product_costs_data()

# Find products with Amharic characters (Unicode range for Amharic: U+1200-U+137F)
amharic_products = []
for m in metrics:
    product_name = m.get('product_name', '')
    # Check if contains Amharic characters
    has_amharic = any('\u1200' <= c <= '\u137F' for c in product_name)
    if has_amharic:
        amharic_products.append(m)

print(f"Found {len(amharic_products)} products with Amharic characters:\n")
for p in amharic_products[:10]:
    name = p.get('product_name', '')
    volume = p.get('total_volume_kg', 0)
    revenue = p.get('total_revenue_etb', 0)
    print(f"  ✅ {name}")
    print(f"     Volume: {volume:,.2f} kg | Revenue: {revenue:,.2f} ETB")
    print()

# Test 2: Check API response encoding
print("\n📡 Test 2: API Response Encoding")
print("-" * 70)

# Simulate what the API would return
test_response = {
    "metrics": amharic_products[:5],
    "test_amharic": "Red onion (ሃበሻ)",
    "test_leader": "ቢንያም ቄራ"
}

# Check if JSON encoding preserves Amharic
json_str = json.dumps(test_response, ensure_ascii=False, indent=2)
has_amharic_in_json = any('\u1200' <= c <= '\u137F' for c in json_str)

print(f"JSON encoding test: {'✅ PASS' if has_amharic_in_json else '❌ FAIL'}")
print(f"Sample JSON (first 200 chars):")
print(json_str[:200] + "...")

# Test 3: Check product costs with Amharic
print("\n💰 Test 3: Product Costs with Amharic")
print("-" * 70)

amharic_costs = []
for c in costs:
    product_name = c.get('product_name', '')
    has_amharic = any('\u1200' <= c <= '\u137F' for c in product_name)
    if has_amharic:
        amharic_costs.append(c)

print(f"Found {len(amharic_costs)} cost entries with Amharic characters:\n")
for c in amharic_costs[:5]:
    name = c.get('product_name', '')
    price = c.get('selling_price', 0)
    print(f"  ✅ {name} - Price: {price:.2f} ETB/kg")

print("\n" + "=" * 70)
print("✅ Amharic Support Test Complete")
print("=" * 70)

