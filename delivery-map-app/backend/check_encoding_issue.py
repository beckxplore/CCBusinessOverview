#!/usr/bin/env python3
"""Check and fix encoding issues with product names"""

import sys
from pathlib import Path
import json

sys.path.insert(0, str(Path(__file__).parent))

from main import load_product_metrics_data

print("=" * 70)
print("CHECKING ENCODING ISSUES IN PRODUCT NAMES")
print("=" * 70)

metrics = load_product_metrics_data()

# Find products with encoding issues (garbled Amharic)
encoding_issues = []
for m in metrics:
    product_name = m.get('product_name', '')
    # Check for common encoding issue patterns
    if 'áˆ' in product_name or 'á‰' in product_name or 'á»' in product_name:
        encoding_issues.append(m)

print(f"\nFound {len(encoding_issues)} products with potential encoding issues:\n")
for issue in encoding_issues[:10]:
    name = issue.get('product_name', '')
    print(f"  ❌ '{name}'")
    print(f"     Volume: {issue.get('total_volume_kg', 0):.2f} kg")
    print(f"     Revenue: {issue.get('total_revenue_etb', 0):.2f} ETB")
    print()

# Check what it should be
print("\nExpected Amharic characters:")
print("  ሃበሻ = 'habesha' (should be in Red Onion variants)")
print("  ቀላፎ = 'qelafo' (should be in Red Onion variants)")

# Try to decode the garbled text
if encoding_issues:
    garbled = encoding_issues[0].get('product_name', '')
    print(f"\nAttempting to fix: '{garbled}'")
    
    # Try to fix double-encoding
    try:
        # If it's Latin-1 encoded UTF-8, try to fix it
        fixed = garbled.encode('latin-1').decode('utf-8')
        print(f"  Fixed: '{fixed}'")
    except:
        print("  Could not auto-fix encoding")

