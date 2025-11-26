"""
Comprehensive System and Data Audit Script
Tests all data sources and validates dashboard alignment
"""
import sys
from pathlib import Path
import pandas as pd
from datetime import timedelta
import requests
import json

# Add backend to path
backend_path = Path(__file__).resolve().parent
sys.path.append(str(backend_path))

from services.sheet_data import fetch_raw_sheet_data, fetch_sheet_metrics

API_BASE = "http://localhost:8001/api"

def print_section(title):
    print(f"\n{'='*80}")
    print(f" {title}")
    print(f"{'='*80}\n")

def audit_raw_sheet_data():
    """Step 1: Verify raw Google Sheet data"""
    print_section("STEP 1: RAW GOOGLE SHEET DATA AUDIT")
    
    df = fetch_raw_sheet_data()
    if df is None or df.empty:
        print("❌ ERROR: No data fetched from Google Sheet")
        return None
    
    print(f"✅ Total rows in sheet: {len(df)}")
    
    # Ensure date column is datetime
    if not pd.api.types.is_datetime64_any_dtype(df['date_dt']):
        df['date_dt'] = pd.to_datetime(df['date_dt'])
    
    # Find latest date
    max_date = df['date_dt'].max()
    if hasattr(max_date, 'date'):
        max_date = max_date.date()
    
    print(f"✅ Latest date in sheet: {max_date}")
    
    # Calculate 7-day window
    window_start = max_date - timedelta(days=6)
    print(f"✅ Calculated 7-day window: {window_start} to {max_date}")
    
    # Filter for window
    mask = (df['date_dt'].dt.date >= window_start) & (df['date_dt'].dt.date <= max_date)
    window_df = df[mask].copy()
    
    print(f"✅ Rows in window: {len(window_df)}")
    
    # Calculate totals
    total_volume = window_df['final_volume_kg'].sum()
    total_revenue = window_df['final_revenue'].sum()
    total_cost = window_df['final_cost'].sum()
    
    print(f"\n📊 WINDOW TOTALS:")
    print(f"   Volume: {total_volume:,.2f} kg")
    print(f"   Revenue: {total_revenue:,.2f} ETB")
    print(f"   Cost: {total_cost:,.2f} ETB")
    print(f"   Profit: {total_revenue - total_cost:,.2f} ETB")
    
    # Check for data beyond Nov 20
    nov20 = pd.Timestamp('2025-11-20').date()
    beyond = df[df['date_dt'].dt.date > nov20]
    if not beyond.empty:
        print(f"\n⚠️  Found {len(beyond)} entries after Nov 20:")
        print(f"   Date range: {beyond['date_dt'].min().date()} to {beyond['date_dt'].max().date()}")
    
    return {
        'window_start': window_start,
        'window_end': max_date,
        'total_volume': total_volume,
        'total_revenue': total_revenue,
        'total_cost': total_cost,
        'df': df
    }

def audit_api_endpoints(sheet_audit):
    """Step 2: Verify all API endpoints"""
    print_section("STEP 2: API ENDPOINTS AUDIT")
    
    endpoints = {
        '/api/products/metrics': 'Products Metrics',
        '/api/data': 'Delivery Data',
        '/api/statistics': 'Statistics',
        '/api/costs/products': 'Product Costs',
    }
    
    api_results = {}
    
    for endpoint, name in endpoints.items():
        try:
            print(f"\n🔍 Checking {name} ({endpoint})...")
            r = requests.get(f"{API_BASE}{endpoint}", timeout=10)
            if r.status_code != 200:
                print(f"   ❌ Status {r.status_code}: {r.text[:200]}")
                continue
            
            data = r.json()
            
            # Check window if present
            window = data.get('window')
            if window:
                print(f"   ✅ Window: {window.get('start')} to {window.get('end')}")
                if sheet_audit:
                    expected_start = sheet_audit['window_start'].isoformat()
                    expected_end = sheet_audit['window_end'].isoformat()
                    if window.get('start') != expected_start or window.get('end') != expected_end:
                        print(f"   ⚠️  WARNING: Window mismatch!")
                        print(f"      Expected: {expected_start} to {expected_end}")
                        print(f"      Got: {window.get('start')} to {window.get('end')}")
            else:
                print(f"   ⚠️  No window in response")
            
            # Store for later use
            api_results[endpoint] = data
            
            # Calculate totals for metrics endpoint
            if endpoint == '/api/products/metrics':
                metrics = data.get('metrics', [])
                total_vol = sum(m.get('total_volume_kg', 0) for m in metrics)
                total_rev = sum(m.get('total_revenue_etb', 0) for m in metrics)
                print(f"   📊 Metrics: {len(metrics)} products")
                print(f"      Total Volume: {total_vol:,.2f} kg")
                print(f"      Total Revenue: {total_rev:,.2f} ETB")
                
                if sheet_audit:
                    vol_diff = abs(total_vol - sheet_audit['total_volume'])
                    rev_diff = abs(total_rev - sheet_audit['total_revenue'])
                    if vol_diff > 100:
                        print(f"   ⚠️  Volume difference: {vol_diff:,.2f} kg")
                    if rev_diff > 1000:
                        print(f"   ⚠️  Revenue difference: {rev_diff:,.2f} ETB")
            
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
    
    return api_results

def main():
    print_section("COMPREHENSIVE SYSTEM & DATA AUDIT")
    print("Starting full system test...\n")
    
    # Step 1: Raw sheet data
    sheet_audit = audit_raw_sheet_data()
    if not sheet_audit:
        print("\n❌ CRITICAL: Cannot proceed without sheet data")
        return
    
    # Step 2: API endpoints
    api_results = audit_api_endpoints(sheet_audit)
    
    # Step 3: Summary
    print_section("AUDIT SUMMARY")
    print("✅ Raw sheet data verified")
    print("✅ API endpoints checked")
    print("\n📋 NEXT STEPS:")
    print("   1. Verify dashboard displays correct date window")
    print("   2. Cross-check all metrics in Overview tab")
    print("   3. Verify each tab's data alignment")
    
if __name__ == "__main__":
    main()

