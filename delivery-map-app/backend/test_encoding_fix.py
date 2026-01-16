#!/usr/bin/env python3
"""Test encoding fix for product names"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from main import load_product_metrics_data, _fix_encoding_issues

print("=" * 70)
print("TESTING ENCODING FIX")
print("=" * 70)

# Test the fix function directly
test_cases = [
    "Red onion ( áˆƒá‰ áˆ» )",
    "Green Chili (áˆµá‰³áˆ­á‰³)",
    "Red Onion (ሃበሻ)",  # Already correct
]

print("\n1. Testing _fix_encoding_issues function:")
print("-" * 70)
for test in test_cases:
    fixed = _fix_encoding_issues(test)
    print(f"  Input:  '{test}'")
    print(f"  Output: '{fixed}'")
    print()

# Test with actual data
print("\n2. Testing with actual product metrics:")
print("-" * 70)
metrics = load_product_metrics_data()

red_onion = [m for m in metrics if 'red onion' in m.get('product_name', '').lower()]
green_chili = [m for m in metrics if 'green chili' in m.get('product_name', '').lower()]

print(f"\nRed Onion variants ({len(red_onion)} found):")
for p in red_onion[:5]:
    name = p.get('product_name', '')
    has_amharic = any('\u1200' <= c <= '\u137F' for c in name)
    status = "✅" if has_amharic or 'áˆ' not in name else "❌"
    print(f"  {status} '{name}'")

print(f"\nGreen Chili variants ({len(green_chili)} found):")
for p in green_chili[:5]:
    name = p.get('product_name', '')
    has_amharic = any('\u1200' <= c <= '\u137F' for c in name)
    status = "✅" if has_amharic or 'áˆ' not in name else "❌"
    print(f"  {status} '{name}'")

# Check for remaining encoding issues
print("\n3. Checking for remaining encoding issues:")
print("-" * 70)
remaining_issues = [m for m in metrics if 'áˆ' in m.get('product_name', '')]
if remaining_issues:
    print(f"  ⚠️  Found {len(remaining_issues)} products with encoding issues:")
    for issue in remaining_issues[:5]:
        print(f"     - '{issue.get('product_name', '')}'")
else:
    print("  ✅ No encoding issues found!")

