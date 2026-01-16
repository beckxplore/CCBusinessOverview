"""
Ethiopian Calendar Utilities for Price Forecasting

The Ethiopian calendar has 13 months:
- 12 months of 30 days each (Meskerem, Tikimt, Hidar, Tahsas, Tir, Yekatit, Megabit, Miazia, Ginbot, Sene, Hamle, Nehase)
- 1 month of 5-6 days (Pagume)

Ethiopian New Year is on September 11 (Gregorian).
The Ethiopian calendar is approximately 7-8 years behind the Gregorian calendar.
"""

from datetime import datetime, date, timedelta
from typing import List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

# Ethiopian month names
ETHIOPIAN_MONTHS = [
    "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit",
    "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume"
]

# Days in each Ethiopian month (first 12 have 30, Pagume has 5-6)
ETHIOPIAN_MONTH_DAYS = [30] * 12 + [5]  # Pagume is 5 in non-leap, 6 in leap

# Ethiopian New Year in Gregorian calendar (September 11)
ETHIOPIAN_NEW_YEAR_MONTH = 9
ETHIOPIAN_NEW_YEAR_DAY = 11


def is_gregorian_leap_year(year: int) -> bool:
    """Check if a Gregorian year is a leap year."""
    return (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)


def is_ethiopian_leap_year(eth_year: int) -> bool:
    """Check if an Ethiopian year is a leap year."""
    # Ethiopian leap years align with Gregorian leap years
    greg_year = eth_year + 8
    return is_gregorian_leap_year(greg_year)


def gregorian_to_ethiopian(greg_date: date) -> Tuple[int, int, int]:
    """
    Convert Gregorian date to Ethiopian date.
    Returns (ethiopian_year, ethiopian_month, ethiopian_day)
    """
    greg_year = greg_date.year
    greg_month = greg_date.month
    greg_day = greg_date.day
    
    # Calculate days since Ethiopian New Year
    eth_new_year = date(greg_year, ETHIOPIAN_NEW_YEAR_MONTH, ETHIOPIAN_NEW_YEAR_DAY)
    
    # If date is before Ethiopian New Year, use previous year's New Year
    if greg_date < eth_new_year:
        eth_new_year = date(greg_year - 1, ETHIOPIAN_NEW_YEAR_MONTH, ETHIOPIAN_NEW_YEAR_DAY)
        eth_year = greg_year - 8
    else:
        eth_year = greg_year - 7
    
    # Calculate days since Ethiopian New Year
    days_since_new_year = (greg_date - eth_new_year).days
    
    # Determine Ethiopian month and day
    eth_month = 1
    eth_day = 1
    
    for month_idx in range(12):  # First 12 months
        if days_since_new_year >= ETHIOPIAN_MONTH_DAYS[month_idx]:
            days_since_new_year -= ETHIOPIAN_MONTH_DAYS[month_idx]
            eth_month += 1
        else:
            break
    
    # Handle Pagume (13th month)
    if eth_month == 13:
        pagume_days = 6 if is_ethiopian_leap_year(eth_year) else 5
        if days_since_new_year >= pagume_days:
            # Move to next year
            eth_year += 1
            eth_month = 1
            eth_day = days_since_new_year - pagume_days + 1
        else:
            eth_day = days_since_new_year + 1
    else:
        eth_day = days_since_new_year + 1
    
    return (eth_year, eth_month, eth_day)


def ethiopian_to_gregorian(eth_year: int, eth_month: int, eth_day: int) -> date:
    """
    Convert Ethiopian date to Gregorian date.
    """
    # Calculate Gregorian year (Ethiopian year + 7 or 8)
    greg_year = eth_year + 8
    
    # Ethiopian New Year date
    eth_new_year = date(greg_year, ETHIOPIAN_NEW_YEAR_MONTH, ETHIOPIAN_NEW_YEAR_DAY)
    
    # Calculate days to add
    days_to_add = 0
    
    # Add days from previous months
    for month_idx in range(eth_month - 1):
        if month_idx < 12:
            days_to_add += ETHIOPIAN_MONTH_DAYS[month_idx]
        else:
            # Pagume
            pagume_days = 6 if is_ethiopian_leap_year(eth_year) else 5
            days_to_add += pagume_days
    
    # Add days in current month
    days_to_add += eth_day - 1
    
    # Calculate final date
    result_date = eth_new_year + timedelta(days=days_to_add)
    
    # Adjust year if needed
    if result_date.year != greg_year:
        # Recalculate with previous year's New Year
        greg_year = eth_year + 7
        eth_new_year = date(greg_year, ETHIOPIAN_NEW_YEAR_MONTH, ETHIOPIAN_NEW_YEAR_DAY)
        result_date = eth_new_year + timedelta(days=days_to_add)
    
    return result_date


def get_ethiopian_payday_dates(start_date: date, end_date: date) -> List[date]:
    """
    Get Ethiopian payday dates within a date range.
    
    Ethiopian paydays occur between 7th-10th of each Gregorian month.
    We'll use the 8th as the standard payday date (middle of the range).
    """
    paydays = []
    current_date = start_date
    
    # Start from the first month in the range
    year = current_date.year
    month = current_date.month
    
    # If we're past the 10th, move to next month
    if current_date.day > 10:
        month += 1
        if month > 12:
            month = 1
            year += 1
    
    while True:
        # Ethiopian payday is around 8th of each month (7th-10th range)
        # We'll use 8th as the standard, but can adjust if needed
        try:
            payday = date(year, month, 8)
        except ValueError:
            # Invalid date, skip
            month += 1
            if month > 12:
                month = 1
                year += 1
            continue
        
        if payday > end_date:
            break
        
        if payday >= start_date:
            paydays.append(payday)
        
        # Move to next month
        month += 1
        if month > 12:
            month = 1
            year += 1
    
    return sorted(paydays)


def get_western_payday_dates(start_date: date, end_date: date) -> List[date]:
    """
    Get Western calendar payday dates within a date range.
    
    Western paydays occur around the end of each Gregorian month (27th-30th/31st).
    We'll use the 28th as the standard payday date (middle of the range).
    """
    paydays = []
    current_date = start_date
    
    # Start from the first month in the range
    year = current_date.year
    month = current_date.month
    
    # If we're past the 28th, move to next month
    if current_date.day > 28:
        month += 1
        if month > 12:
            month = 1
            year += 1
    
    while True:
        # Western payday is around 28th of each month (27th-31st range)
        # We'll use 28th as the standard, but can adjust if needed
        try:
            payday = date(year, month, 28)
        except ValueError:
            # Invalid date (e.g., Feb 28 in non-leap year), use last day of month
            if month == 12:
                next_month = date(year + 1, 1, 1)
            else:
                next_month = date(year, month + 1, 1)
            payday = next_month - timedelta(days=1)
        
        if payday > end_date:
            break
        
        if payday >= start_date:
            paydays.append(payday)
        
        # Move to next month
        month += 1
        if month > 12:
            month = 1
            year += 1
    
    return sorted(paydays)


def get_payday_calendar(start_date: date, end_date: date) -> dict:
    """
    Generate complete payday calendar for both Ethiopian and Western calendars.
    
    Ethiopian paydays: 7th-10th of each Gregorian month (using 8th as standard)
    Western paydays: 27th-31st of each Gregorian month (using 28th as standard)
    
    Returns:
        {
            'ethiopian_paydays': [list of dates],
            'western_paydays': [list of dates],
            'all_paydays': [combined sorted list],
            'payday_details': [
                {
                    'date': date,
                    'type': 'ethiopian' | 'western' | 'both',
                    'gregorian_month': int,
                    'gregorian_day': int
                }
            ]
        }
    """
    ethiopian_paydays = get_ethiopian_payday_dates(start_date, end_date)
    western_paydays = get_western_payday_dates(start_date, end_date)
    
    # Combine and deduplicate
    all_paydays_set = set(ethiopian_paydays) | set(western_paydays)
    all_paydays = sorted(list(all_paydays_set))
    
    # Create detailed payday information
    payday_details = []
    for payday_date in all_paydays:
        is_ethiopian = payday_date in ethiopian_paydays
        is_western = payday_date in western_paydays
        
        detail = {
            'date': payday_date,
            'type': 'both' if (is_ethiopian and is_western) else ('ethiopian' if is_ethiopian else 'western'),
            'gregorian_month': payday_date.month,
            'gregorian_day': payday_date.day
        }
        
        # Add Ethiopian calendar info if applicable
        if is_ethiopian:
            eth_year, eth_month, eth_day = gregorian_to_ethiopian(payday_date)
            detail['ethiopian_month'] = eth_month
            detail['ethiopian_month_name'] = ETHIOPIAN_MONTHS[eth_month - 1] if eth_month <= 12 else ETHIOPIAN_MONTHS[12]
            detail['ethiopian_year'] = eth_year
            detail['ethiopian_day'] = eth_day
        
        payday_details.append(detail)
    
    return {
        'ethiopian_paydays': ethiopian_paydays,
        'western_paydays': western_paydays,
        'all_paydays': all_paydays,
        'payday_details': payday_details,
        'date_range': {
            'start': start_date.isoformat(),
            'end': end_date.isoformat()
        },
        'ethiopian_pattern': '7th-10th of each Gregorian month (using 8th)',
        'western_pattern': '27th-31st of each Gregorian month (using 28th)'
    }


def get_days_to_next_payday(current_date: date, payday_calendar: dict) -> Optional[int]:
    """Get days until next payday (either Ethiopian or Western)."""
    all_paydays = payday_calendar['all_paydays']
    
    for payday in all_paydays:
        if payday > current_date:
            return (payday - current_date).days
    
    return None  # No payday found in calendar range


def get_days_since_last_payday(current_date: date, payday_calendar: dict) -> Optional[int]:
    """Get days since last payday (either Ethiopian or Western)."""
    all_paydays = payday_calendar['all_paydays']
    
    for payday in reversed(all_paydays):
        if payday <= current_date:
            return (current_date - payday).days
    
    return None  # No payday found in calendar range


def is_pre_payday_manipulation_window(current_date: date, payday_calendar: dict, 
                                     days_before: int = 5) -> bool:
    """Check if current date is in pre-payday manipulation window (3-5 days before payday)."""
    days_to_payday = get_days_to_next_payday(current_date, payday_calendar)
    
    if days_to_payday is None:
        return False
    
    # Manipulation window: 3-5 days before payday
    return 3 <= days_to_payday <= days_before


def is_post_payday_demand_period(current_date: date, payday_calendar: dict, 
                                 days_after: int = 3) -> bool:
    """Check if current date is in post-payday demand period (1-3 days after payday)."""
    days_since_payday = get_days_since_last_payday(current_date, payday_calendar)
    
    if days_since_payday is None:
        return False
    
    return 1 <= days_since_payday <= days_after


if __name__ == "__main__":
    # Test the calendar functions
    from datetime import date
    
    start = date(2024, 1, 1)
    end = date(2025, 12, 31)
    
    print("Generating payday calendar for 2024-2025...")
    calendar = get_payday_calendar(start, end, western_payday_pattern=[1, 15])
    
    print(f"\nEthiopian Paydays: {len(calendar['ethiopian_paydays'])}")
    print(f"Western Paydays: {len(calendar['western_paydays'])}")
    print(f"Total Unique Paydays: {len(calendar['all_paydays'])}")
    
    print("\nFirst 10 Paydays:")
    for detail in calendar['payday_details'][:10]:
        print(f"  {detail['date']} - {detail['type']}")
    
    print("\nTesting date: 2024-09-15")
    test_date = date(2024, 9, 15)
    days_to = get_days_to_next_payday(test_date, calendar)
    days_since = get_days_since_last_payday(test_date, calendar)
    is_pre = is_pre_payday_manipulation_window(test_date, calendar)
    is_post = is_post_payday_demand_period(test_date, calendar)
    
    print(f"  Days to next payday: {days_to}")
    print(f"  Days since last payday: {days_since}")
    print(f"  In pre-payday manipulation window: {is_pre}")
    print(f"  In post-payday demand period: {is_post}")

