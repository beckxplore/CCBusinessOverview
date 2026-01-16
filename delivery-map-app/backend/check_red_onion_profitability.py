#!/usr/bin/env python3
"""Check Red Onion profitability status"""

import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from main import load_product_costs_data, load_product_metrics_data

# Load data
costs = load_product_costs_data()
metrics = load_product_metrics_data()

# Filter Red Onion products
red_onion_costs = [p for p in costs if 'onion' in p.get('product_name', '').lower() and 'red' in p.get('product_name', '').lower()]
red_onion_metrics = [m for m in metrics if 'onion' in m.get('product_name', '').lower() and 'red' in m.get('product_name', '').lower()]

print("=" * 70)
print("RED ONION PROFITABILITY ANALYSIS")
print("=" * 70)

# Create a mapping of product names to metrics for volume lookup
metrics_by_name = {m.get('product_name', '').lower(): m for m in red_onion_metrics}

print("\n📊 COST STRUCTURE & WEEKLY VOLUME:")
print("-" * 70)
for p in sorted(red_onion_costs, key=lambda x: x.get('product_name', '')):
    name = p.get('product_name', 'Unknown')
    procurement = p.get('procurement_cost', 0)
    ops = p.get('operational_cost', 0)
    commission = p.get('sgl_commission', 0)
    selling = p.get('selling_price', 0)
    total_cost = procurement + ops + commission
    margin = selling - total_cost
    margin_pct = (margin / total_cost * 100) if total_cost > 0 else 0
    
    # Find matching metrics for volume
    matching_metric = None
    for key, metric in metrics_by_name.items():
        if name.lower() in key or key in name.lower():
            matching_metric = metric
            break
    
    weekly_volume = matching_metric.get('total_volume_kg', 0) if matching_metric else 0
    
    status = "✅ PROFITABLE" if margin > 0 else "❌ LOSING"
    print(f"\n{name}:")
    print(f"  Selling Price: {selling:.2f} ETB/kg")
    print(f"  Procurement:   {procurement:.2f} ETB/kg")
    print(f"  Operational:   {ops:.2f} ETB/kg")
    print(f"  Commission:    {commission:.2f} ETB/kg")
    print(f"  Total Cost:    {total_cost:.2f} ETB/kg")
    print(f"  Margin:        {margin:.2f} ETB/kg ({margin_pct:.1f}%)")
    print(f"  Weekly Volume: {weekly_volume:,.2f} kg (past 7 days)")
    print(f"  Status:        {status}")

print("\n📈 WEEKLY PERFORMANCE SUMMARY (Past 7 Days):")
print("-" * 70)
total_volume = 0
total_revenue = 0
total_profit = 0

for m in sorted(red_onion_metrics, key=lambda x: x.get('total_volume_kg', 0), reverse=True):
    name = m.get('product_name', 'Unknown')
    volume = m.get('total_volume_kg', 0)
    revenue = m.get('total_revenue_etb', 0)
    avg_price = revenue / volume if volume > 0 else 0
    
    total_volume += volume
    total_revenue += revenue
    
    # Find matching cost data
    cost_data = next((c for c in red_onion_costs if c.get('product_name', '').lower() == name.lower()), None)
    if cost_data:
        procurement = cost_data.get('procurement_cost', 0)
        ops = cost_data.get('operational_cost', 0)
        commission = cost_data.get('sgl_commission', 0)
        total_cost_per_kg = procurement + ops + commission
        weekly_cost = total_cost_per_kg * volume
        weekly_profit = revenue - weekly_cost
        profit_pct = (weekly_profit / revenue * 100) if revenue > 0 else 0
        total_profit += weekly_profit
        
        status_icon = "✅" if weekly_profit > 0 else "❌"
        print(f"\n{status_icon} {name}:")
        print(f"  📦 Volume Sold:  {volume:,.2f} kg")
        print(f"  💰 Revenue:      {revenue:,.2f} ETB")
        print(f"  💸 Cost:         {weekly_cost:,.2f} ETB")
        print(f"  📊 Profit/Loss:  {weekly_profit:,.2f} ETB ({profit_pct:+.1f}%)")
        print(f"  💵 Avg Price:    {avg_price:.2f} ETB/kg")
    else:
        print(f"\n⚠️  {name}:")
        print(f"  📦 Volume Sold:  {volume:,.2f} kg")
        print(f"  💰 Revenue:      {revenue:,.2f} ETB")
        print(f"  💵 Avg Price:    {avg_price:.2f} ETB/kg")
        print(f"  ⚠️  No cost data available")

print("\n" + "=" * 70)
print("📊 TOTAL RED ONION SUMMARY (Past 7 Days):")
print("=" * 70)
print(f"  📦 Total Volume Sold:  {total_volume:,.2f} kg")
print(f"  💰 Total Revenue:      {total_revenue:,.2f} ETB")
print(f"  📊 Total Profit/Loss:  {total_profit:,.2f} ETB")
print(f"  📈 Overall Margin:     {(total_profit / total_revenue * 100) if total_revenue > 0 else 0:+.1f}%")

print("\n" + "=" * 70)

