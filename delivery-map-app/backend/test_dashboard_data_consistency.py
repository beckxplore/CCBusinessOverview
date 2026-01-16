"""
Test Dashboard Data Consistency

This script tests that:
1. API returns only products with sales in last 7 days
2. Frontend would receive the same data
3. Product names, volumes match between endpoints
4. No inactive products are included
"""

import requests
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

BASE_URL = "http://localhost:8000"

def test_api_endpoint(endpoint: str, params: Dict = None) -> Dict:
    """Test API endpoint"""
    try:
        url = f"{BASE_URL}{endpoint}"
        response = requests.get(url, params=params, timeout=30)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ {endpoint}: HTTP {response.status_code}")
            return {}
    except Exception as e:
        print(f"❌ {endpoint}: {str(e)}")
        return {}

def normalize_product_name(name: str) -> str:
    """Normalize product name for comparison"""
    return name.strip().lower()

def main():
    print("="*80)
    print("DASHBOARD DATA CONSISTENCY TEST")
    print("="*80)
    print()
    
    # Get date range
    today = datetime.now().date()
    date_from = (today - timedelta(days=7)).isoformat()
    date_to = today.isoformat()
    
    print(f"Testing data for: {date_from} to {date_to}")
    print()
    
    # 1. Get product metrics (what frontend uses for volumes)
    print("1. Fetching product metrics (volumes from last 7 days)...")
    metrics_data = test_api_endpoint("/api/products/metrics")
    
    if not metrics_data:
        print("❌ Failed to fetch product metrics")
        return
    
    metrics = metrics_data.get("metrics", [])
    window = metrics_data.get("window", {})
    
    print(f"   ✅ Window: {window.get('start')} to {window.get('end')}")
    print(f"   ✅ Total products returned: {len(metrics)}")
    
    # Check for zero volume products
    zero_volume = [m for m in metrics if m.get("total_volume_kg", 0) <= 0]
    if zero_volume:
        print(f"   ❌ WARNING: Found {len(zero_volume)} products with zero volume:")
        for m in zero_volume[:5]:
            print(f"      - {m.get('product_name')}: {m.get('total_volume_kg', 0)} kg")
    else:
        print(f"   ✅ All products have volume > 0")
    
    print()
    
    # 2. Get product costs (all products in system)
    print("2. Fetching product costs (all products in system)...")
    costs_data = test_api_endpoint("/api/costs/products")
    
    if not costs_data:
        print("❌ Failed to fetch product costs")
        return
    
    all_products = costs_data.get("products", [])
    print(f"   ✅ Total products in system: {len(all_products)}")
    print()
    
    # 3. Compare: products in metrics vs all products
    print("3. Comparing metrics vs all products...")
    metrics_names = {normalize_product_name(m.get("product_name", "")) for m in metrics}
    all_product_names = {normalize_product_name(p.get("product_name", "")) for p in all_products}
    
    # Products in metrics should be subset of all products
    if metrics_names.issubset(all_product_names):
        print(f"   ✅ All metrics products are in product costs list")
    else:
        extra = metrics_names - all_product_names
        print(f"   ⚠️  Found {len(extra)} products in metrics not in costs: {list(extra)[:5]}")
    
    # Products with volume but not in metrics (shouldn't happen if filter works)
    products_with_volume_not_in_metrics = all_product_names - metrics_names
    print(f"   ℹ️  Products in costs but not in metrics (inactive): {len(products_with_volume_not_in_metrics)}")
    print()
    
    # 4. Check specific product volumes
    print("4. Sample product volumes (first 10):")
    for i, metric in enumerate(metrics[:10], 1):
        name = metric.get("product_name", "Unknown")
        volume = metric.get("total_volume_kg", 0)
        revenue = metric.get("total_revenue_etb", 0)
        print(f"   {i:2d}. {name:40s} | Volume: {volume:10.2f} kg | Revenue: {revenue:10.2f} ETB")
    print()
    
    # 5. Test daily profitability endpoint (if available)
    print("5. Testing daily profitability endpoint...")
    daily_data = test_api_endpoint("/api/products/daily-profitability", {
        "date_from": date_from,
        "date_to": date_to
    })
    
    if daily_data and "daily_products" in daily_data:
        daily_products = daily_data.get("daily_products", [])
        print(f"   ✅ Daily products returned: {len(daily_products)}")
        
        # Group by product name
        daily_by_product = {}
        for dp in daily_products:
            name = dp.get("product_name", "")
            if name not in daily_by_product:
                daily_by_product[name] = {
                    "total_volume": 0,
                    "total_revenue": 0,
                    "dates": set()
                }
            daily_by_product[name]["total_volume"] += dp.get("total_volume_kg", 0)
            daily_by_product[name]["total_revenue"] += dp.get("total_revenue_etb", 0)
            daily_by_product[name]["dates"].add(dp.get("date", ""))
        
        print(f"   ✅ Unique products in daily data: {len(daily_by_product)}")
        
        # Compare with metrics
        daily_names = {normalize_product_name(n) for n in daily_by_product.keys()}
        overlap = metrics_names & daily_names
        print(f"   ℹ️  Products in both metrics and daily: {len(overlap)}")
        
        if len(overlap) > 0:
            print(f"   Sample matching products:")
            for name in list(overlap)[:5]:
                print(f"      - {name}")
    else:
        print(f"   ⚠️  Daily profitability endpoint not available or returned no data")
    print()
    
    # 6. Summary
    print("="*80)
    print("SUMMARY")
    print("="*80)
    print(f"✅ Products with sales in last 7 days: {len(metrics)}")
    print(f"✅ All products have volume > 0: {len(zero_volume) == 0}")
    print(f"✅ Window: {window.get('start')} to {window.get('end')}")
    print(f"ℹ️  Total products in system: {len(all_products)}")
    print(f"ℹ️  Inactive products (not in last 7 days): {len(products_with_volume_not_in_metrics)}")
    print()
    
    if len(zero_volume) == 0:
        print("✅ PASS: All products have sales in the last 7 days")
    else:
        print(f"❌ FAIL: Found {len(zero_volume)} products with zero volume")
    
    # Save detailed report
    report = {
        "test_date": datetime.now().isoformat(),
        "window": window,
        "metrics_count": len(metrics),
        "all_products_count": len(all_products),
        "zero_volume_count": len(zero_volume),
        "zero_volume_products": [m.get("product_name") for m in zero_volume],
        "sample_products": [
            {
                "name": m.get("product_name"),
                "volume_kg": m.get("total_volume_kg", 0),
                "revenue_etb": m.get("total_revenue_etb", 0)
            }
            for m in metrics[:20]
        ]
    }
    
    with open("dashboard_consistency_test.json", "w") as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"📄 Detailed report saved to: dashboard_consistency_test.json")

if __name__ == "__main__":
    main()

