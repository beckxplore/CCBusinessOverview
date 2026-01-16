"""
Test script for Ethiopian Calendar and Payday Calendar Generator

Run this to verify the calendar functions work correctly.
"""

import sys
from pathlib import Path
from datetime import date

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "delivery-map-app" / "backend"))

from services.ethiopian_calendar import (
    gregorian_to_ethiopian,
    ethiopian_to_gregorian,
    get_payday_calendar,
    get_days_to_next_payday,
    get_days_since_last_payday,
    is_pre_payday_manipulation_window,
    is_post_payday_demand_period
)
from services.payday_calendar import get_payday_features

def test_ethiopian_calendar():
    """Test Ethiopian calendar conversions."""
    print("=" * 60)
    print("Testing Ethiopian Calendar Conversions")
    print("=" * 60)
    
    # Test dates
    test_dates = [
        date(2024, 9, 11),  # Ethiopian New Year
        date(2024, 1, 7),   # Ethiopian Christmas
        date(2024, 9, 15),  # Random date
        date(2025, 1, 1),   # New Year
    ]
    
    for greg_date in test_dates:
        eth_year, eth_month, eth_day = gregorian_to_ethiopian(greg_date)
        converted_back = ethiopian_to_gregorian(eth_year, eth_month, eth_day)
        
        print(f"\nGregorian: {greg_date}")
        print(f"  → Ethiopian: {eth_year}-{eth_month:02d}-{eth_day:02d}")
        print(f"  → Converted back: {converted_back}")
        print(f"  → Match: {'✓' if converted_back == greg_date else '✗'}")


def test_payday_calendar():
    """Test payday calendar generation."""
    print("\n" + "=" * 60)
    print("Testing Payday Calendar Generation")
    print("=" * 60)
    
    start_date = date(2024, 1, 1)
    end_date = date(2025, 12, 31)
    
    print(f"\nGenerating calendar for {start_date} to {end_date}")
    calendar = get_payday_calendar(start_date, end_date)
    
    print(f"\nEthiopian Paydays: {len(calendar['ethiopian_paydays'])}")
    print(f"Western Paydays: {len(calendar['western_paydays'])}")
    print(f"Total Unique Paydays: {len(calendar['all_paydays'])}")
    
    print("\nFirst 20 Paydays:")
    for i, detail in enumerate(calendar['payday_details'][:20], 1):
        print(f"  {i:2d}. {detail['date']} - {detail['type']:8s} (Month {detail['gregorian_month']:2d}, Day {detail['gregorian_day']:2d})", end="")
        if 'ethiopian_month_name' in detail:
            print(f" - {detail['ethiopian_month_name']}", end="")
        print()


def test_payday_features():
    """Test payday feature extraction."""
    print("\n" + "=" * 60)
    print("Testing Payday Features")
    print("=" * 60)
    
    from services.payday_calendar import get_payday_features
    
    test_dates = [
        date(2024, 9, 11),  # Ethiopian New Year (likely payday)
        date(2024, 9, 8),   # 3 days before payday (manipulation window)
        date(2024, 9, 12),  # 1 day after payday (demand period)
        date(2024, 9, 15),  # Random date
        date(2024, 1, 1),   # Western payday
        date(2024, 1, 15),  # Western payday
    ]
    
    for test_date in test_dates:
        print(f"\nDate: {test_date}")
        features = get_payday_features(test_date)
        
        print(f"  Days to next payday: {features['days_to_next_payday']}")
        print(f"  Days since last payday: {features['days_since_last_payday']}")
        print(f"  Pre-payday manipulation window: {features['is_pre_payday_manipulation']}")
        print(f"  Post-payday demand period: {features['is_post_payday_demand']}")
        print(f"  Payday type: {features['payday_type']}")


def generate_payday_calendar_csv():
    """Generate a CSV file with all paydays for easy viewing."""
    print("\n" + "=" * 60)
    print("Generating Payday Calendar CSV")
    print("=" * 60)
    
    start_date = date(2024, 1, 1)
    end_date = date(2025, 12, 31)
    
    calendar = get_payday_calendar(start_date, end_date)
    
    output_file = Path(__file__).parent / "payday_calendar_2024_2025.csv"
    
    import csv
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Date', 'Type', 'Gregorian Month', 'Gregorian Day', 'Ethiopian Month', 'Notes'])
        
        for detail in calendar['payday_details']:
            row = [
                detail['date'],
                detail['type'],
                detail['gregorian_month'],
                detail['gregorian_day'],
                detail.get('ethiopian_month_name', ''),
                'Both calendars' if detail['type'] == 'both' else ''
            ]
            writer.writerow(row)
    
    print(f"\n✓ Generated payday calendar CSV: {output_file}")
    print(f"  Total paydays: {len(calendar['all_paydays'])}")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Ethiopian Calendar & Payday Calendar Test Suite")
    print("=" * 60)
    
    try:
        test_ethiopian_calendar()
        test_payday_calendar()
        test_payday_features()
        generate_payday_calendar_csv()
        
        print("\n" + "=" * 60)
        print("✓ All tests completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

