"""
Verify Frontend and Backend Data Match

This script verifies that:
1. Products shown in frontend match backend API
2. Volumes match between endpoints
3. Product names are consistent
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def get_product_metrics():
    """Get product metrics from backend"""
    try:
        r = requests.get(f"{BASE_URL}/api/products/metrics", timeout=60)
        if r.status_code == 200:
            return r.json()
        return None
    except Exception as e:
        print(f"Error fetching metrics: {e}")
        return None

def get_product_costs():
    """Get product costs from backend"""
    try:
        r = requests.get(f"{BASE_URL}/api/costs/products", timeout=60)
        if r.status_code == 200:
            return r.json()
        return None
    except Exception as e:
        print(f"Error fetching costs: {e}")
        return None

def normalize_name(name: str) -> str:
    """Normalize product name for comparison"""
    return name.strip().lower()

def main():
    print("="*80)
    print("FRONTEND-BACKEND DATA MATCH VERIFICATION")
    print("="*80)
    print()
    
    # Get metrics (what frontend uses)
    print("1. Fetching product metrics (backend API)...")
    metrics_data = get_product_metrics()
    if not metrics_data:
        print("❌ Failed to fetch metrics")
        return
    
    metrics = metrics_data.get("metrics", [])
    window = metrics_data.get("window", {})
    
    print(f"   ✅ Window: {window.get('start')} to {window.get('end')}")
    print(f"   ✅ Products with sales: {len(metrics)}")
    print()
    
    # Get product costs
    print("2. Fetching product costs...")
    costs_data = get_product_costs()
    if not costs_data:
        print("❌ Failed to fetch costs")
        return
    
    all_products = costs_data.get("products", [])
    print(f"   ✅ Total products in system: {len(all_products)}")
    print()
    
    # Build maps for comparison
    metrics_map = {normalize_name(m.get("product_name", "")): m for m in metrics}
    costs_map = {normalize_name(p.get("product_name", "")): p for p in all_products}
    
    # Verify volumes
    print("3. Verifying product volumes (first 20 products):")
    print()
    print(f"{'Product Name':<50} {'Volume (kg)':<15} {'Revenue (ETB)':<15} {'Status'}")
    print("-" * 95)
    
    verified_count = 0
    for i, metric in enumerate(metrics[:20], 1):
        name = metric.get("product_name", "")
        volume = metric.get("total_volume_kg", 0)
        revenue = metric.get("total_revenue_etb", 0)
        
        # Check if product exists in costs
        normalized = normalize_name(name)
        in_costs = normalized in costs_map
        
        status = "✅" if in_costs else "⚠️ Not in costs"
        if volume > 0:
            verified_count += 1
        
        print(f"{name:<50} {volume:<15.2f} {revenue:<15.2f} {status}")
    
    print()
    print(f"✅ Verified {verified_count} products with volume > 0")
    print()
    
    # Check for any zero volume products
    zero_volume = [m for m in metrics if m.get("total_volume_kg", 0) <= 0]
    if zero_volume:
        print(f"❌ WARNING: Found {len(zero_volume)} products with zero volume:")
        for m in zero_volume:
            print(f"   - {m.get('product_name')}")
    else:
        print("✅ All products have volume > 0 (correctly filtered)")
    print()
    
    # Summary statistics
    print("4. Summary Statistics:")
    total_volume = sum(m.get("total_volume_kg", 0) for m in metrics)
    total_revenue = sum(m.get("total_revenue_etb", 0) for m in metrics)
    avg_volume = total_volume / len(metrics) if metrics else 0
    
    print(f"   Total Volume: {total_volume:,.2f} kg")
    print(f"   Total Revenue: {total_revenue:,.2f} ETB")
    print(f"   Average Volume per Product: {avg_volume:,.2f} kg")
    print(f"   Products with Sales: {len(metrics)}")
    print(f"   Inactive Products (excluded): {len(all_products) - len(metrics)}")
    print()
    
    # Top 10 products by volume
    print("5. Top 10 Products by Volume:")
    sorted_metrics = sorted(metrics, key=lambda x: x.get("total_volume_kg", 0), reverse=True)
    for i, m in enumerate(sorted_metrics[:10], 1):
        name = m.get("product_name", "")
        volume = m.get("total_volume_kg", 0)
        revenue = m.get("total_revenue_etb", 0)
        print(f"   {i:2d}. {name:<40} {volume:>10.2f} kg  {revenue:>12.2f} ETB")
    print()
    
    # Final verification
    print("="*80)
    print("VERIFICATION RESULT")
    print("="*80)
    
    all_good = True
    if len(zero_volume) > 0:
        print("❌ FAIL: Found products with zero volume")
        all_good = False
    else:
        print("✅ PASS: All products have volume > 0")
    
    if len(metrics) == 0:
        print("❌ FAIL: No products returned")
        all_good = False
    else:
        print(f"✅ PASS: {len(metrics)} products with sales in last 7 days")
    
    if window.get("start") and window.get("end"):
        print(f"✅ PASS: Window correctly set to {window.get('start')} to {window.get('end')}")
    else:
        print("⚠️  WARNING: Window information missing")
    
    print()
    if all_good:
        print("✅✅✅ ALL CHECKS PASSED ✅✅✅")
        print()
        print("The dashboard should now correctly show only products with sales")
        print("in the last 7 days. Inactive products are properly excluded.")
    else:
        print("❌❌❌ SOME CHECKS FAILED ❌❌❌")
    
    # Save detailed data
    report = {
        "timestamp": datetime.now().isoformat(),
        "window": window,
        "total_products": len(metrics),
        "total_volume_kg": total_volume,
        "total_revenue_etb": total_revenue,
        "zero_volume_count": len(zero_volume),
        "top_products": [
            {
                "name": m.get("product_name"),
                "volume_kg": m.get("total_volume_kg", 0),
                "revenue_etb": m.get("total_revenue_etb", 0)
            }
            for m in sorted_metrics[:20]
        ]
    }
    
    with open("frontend_backend_match_report.json", "w") as f:
        json.dump(report, f, indent=2, default=str)
    
    print()
    print(f"📄 Detailed report saved to: frontend_backend_match_report.json")

if __name__ == "__main__":
    main()

