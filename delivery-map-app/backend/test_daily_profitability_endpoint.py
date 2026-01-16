"""Test script for the daily product profitability endpoint"""
import requests
import json
from datetime import datetime, timedelta

def test_endpoint():
    base_url = "http://localhost:8001/api/products/daily-profitability"
    
    # Test 1: Basic call with date range
    print("=" * 80)
    print("Test 1: Basic call with date range")
    print("=" * 80)
    try:
        response = requests.get(
            base_url,
            params={
                "date_from": "2025-04-01",
                "date_to": "2025-04-05"
            },
            timeout=30
        )
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Count: {data.get('count', 0)}")
            print(f"Date Range: {data.get('date_range', {})}")
            if data.get('daily_products'):
                print(f"\nFirst product entry:")
                first = data['daily_products'][0]
                for key, value in first.items():
                    print(f"  {key}: {value}")
        else:
            print(f"Error: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
    
    # Test 2: Without date range (should use default)
    print("\n" + "=" * 80)
    print("Test 2: Without date range (default)")
    print("=" * 80)
    try:
        response = requests.get(base_url, timeout=30)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Count: {data.get('count', 0)}")
        else:
            print(f"Error: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    print("Testing Daily Product Profitability Endpoint")
    print("=" * 80)
    print("Note: Make sure the backend server is running on port 8001")
    print("=" * 80 + "\n")
    test_endpoint()

