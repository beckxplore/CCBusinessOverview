"""
Payday Calendar Service for Price Forecasting

This module provides easy access to payday calendar data for feature engineering.
"""

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional
from pathlib import Path
import json
import logging

from .ethiopian_calendar import (
    get_payday_calendar,
    get_days_to_next_payday,
    get_days_since_last_payday,
    is_pre_payday_manipulation_window,
    is_post_payday_demand_period
)

logger = logging.getLogger(__name__)

# Cache for payday calendar
_payday_calendar_cache: Optional[Dict] = None
_calendar_date_range: Optional[tuple] = None


def initialize_payday_calendar(start_date: date, end_date: date, 
                              cache_file: Optional[Path] = None) -> Dict:
    """
    Initialize and cache the payday calendar.
    
    Args:
        start_date: Start date for calendar
        end_date: End date for calendar
        western_payday_pattern: Days in month for Western paydays (default: [1, 15])
        cache_file: Optional path to cache file for persistence
    """
    global _payday_calendar_cache, _calendar_date_range
    
    # Check if we can load from cache
    if cache_file and cache_file.exists():
        try:
            with open(cache_file, 'r') as f:
                cached = json.load(f)
                cached_start = date.fromisoformat(cached['date_range']['start'])
                cached_end = date.fromisoformat(cached['date_range']['end'])
                
                # Use cache if it covers our date range
                if cached_start <= start_date and cached_end >= end_date:
                    logger.info(f"Loading payday calendar from cache: {cache_file}")
                    _payday_calendar_cache = cached
                    _calendar_date_range = (cached_start, cached_end)
                    return _payday_calendar_cache
        except Exception as e:
            logger.warning(f"Failed to load payday calendar cache: {e}")
    
    # Generate new calendar
    logger.info(f"Generating payday calendar for {start_date} to {end_date}")
    calendar = get_payday_calendar(start_date, end_date)
    
    # Convert dates to ISO strings for JSON serialization
    calendar_serializable = {
        'ethiopian_paydays': [d.isoformat() for d in calendar['ethiopian_paydays']],
        'western_paydays': [d.isoformat() for d in calendar['western_paydays']],
        'all_paydays': [d.isoformat() for d in calendar['all_paydays']],
        'payday_details': [
            {
                **detail,
                'date': detail['date'].isoformat()
            }
            for detail in calendar['payday_details']
        ],
        'date_range': calendar['date_range'],
        'ethiopian_pattern': calendar['ethiopian_pattern'],
        'western_pattern': calendar['western_pattern']
    }
    
    # Cache it
    _payday_calendar_cache = calendar_serializable
    _calendar_date_range = (start_date, end_date)
    
    # Save to cache file if provided
    if cache_file:
        try:
            cache_file.parent.mkdir(parents=True, exist_ok=True)
            with open(cache_file, 'w') as f:
                json.dump(calendar_serializable, f, indent=2)
            logger.info(f"Saved payday calendar to cache: {cache_file}")
        except Exception as e:
            logger.warning(f"Failed to save payday calendar cache: {e}")
    
    return calendar_serializable


def get_payday_calendar_for_date_range(start_date: date, end_date: date) -> Dict:
    """
    Get payday calendar for a specific date range.
    Uses cache if available, otherwise generates new calendar.
    """
    global _payday_calendar_cache, _calendar_date_range
    
    # Check if we need to extend the cache
    if _payday_calendar_cache is None or _calendar_date_range is None:
        # Initialize with extended range (add buffer)
        buffer_days = 30
        extended_start = date(start_date.year - 1, 1, 1) if start_date.month == 1 else start_date - timedelta(days=buffer_days)
        extended_end = date(end_date.year + 1, 12, 31) if end_date.month == 12 else end_date + timedelta(days=buffer_days)
        
        cache_file = Path(__file__).parent.parent.parent / "data" / "payday_calendar_cache.json"
        initialize_payday_calendar(extended_start, extended_end, cache_file)
    
    # Convert cached dates back to date objects for filtering
    cached_start = date.fromisoformat(_payday_calendar_cache['date_range']['start'])
    cached_end = date.fromisoformat(_payday_calendar_cache['date_range']['end'])
    
    # Filter to requested date range
    filtered_calendar = {
        'ethiopian_paydays': [
            d for d in _payday_calendar_cache['ethiopian_paydays']
            if cached_start <= date.fromisoformat(d) <= cached_end
        ],
        'western_paydays': [
            d for d in _payday_calendar_cache['western_paydays']
            if cached_start <= date.fromisoformat(d) <= cached_end
        ],
        'all_paydays': [
            d for d in _payday_calendar_cache['all_paydays']
            if cached_start <= date.fromisoformat(d) <= cached_end
        ],
        'payday_details': [
            detail for detail in _payday_calendar_cache['payday_details']
            if cached_start <= date.fromisoformat(detail['date']) <= cached_end
        ],
        'date_range': {
            'start': start_date.isoformat(),
            'end': end_date.isoformat()
        },
        'ethiopian_pattern': _payday_calendar_cache.get('ethiopian_pattern', '7th-10th of each Gregorian month'),
        'western_pattern': _payday_calendar_cache.get('western_pattern', '27th-31st of each Gregorian month')
    }
    
    return filtered_calendar


def get_payday_features(current_date: date, payday_calendar: Optional[Dict] = None) -> Dict:
    """
    Get all payday-related features for a given date.
    
    Returns:
        {
            'days_to_ethiopian_payday': int | None,
            'days_to_western_payday': int | None,
            'days_to_next_payday': int | None,
            'days_since_ethiopian_payday': int | None,
            'days_since_western_payday': int | None,
            'days_since_last_payday': int | None,
            'is_pre_payday_manipulation': bool,
            'is_post_payday_demand': bool,
            'is_ethiopian_payday': bool,
            'is_western_payday': bool,
            'is_both_paydays': bool,
            'payday_type': 'ethiopian' | 'western' | 'both' | 'none'
        }
    """
    if payday_calendar is None:
        # Generate calendar for date range around current_date
        start = date(current_date.year - 1, 1, 1)
        end = date(current_date.year + 1, 12, 31)
        payday_calendar = get_payday_calendar_for_date_range(start, end)
    
    # Convert string dates to date objects for calculations
    ethiopian_paydays = [date.fromisoformat(d) for d in payday_calendar['ethiopian_paydays']]
    western_paydays = [date.fromisoformat(d) for d in payday_calendar['western_paydays']]
    all_paydays = [date.fromisoformat(d) for d in payday_calendar['all_paydays']]
    
    # Check if today is a payday
    is_ethiopian_payday = current_date in ethiopian_paydays
    is_western_payday = current_date in western_paydays
    is_both_paydays = is_ethiopian_payday and is_western_payday
    
    # Days to next paydays
    days_to_ethiopian = None
    for payday in sorted(ethiopian_paydays):
        if payday > current_date:
            days_to_ethiopian = (payday - current_date).days
            break
    
    days_to_western = None
    for payday in sorted(western_paydays):
        if payday > current_date:
            days_to_western = (payday - current_date).days
            break
    
    days_to_next = None
    for payday in sorted(all_paydays):
        if payday > current_date:
            days_to_next = (payday - current_date).days
            break
    
    # Days since last paydays
    days_since_ethiopian = None
    for payday in sorted(ethiopian_paydays, reverse=True):
        if payday <= current_date:
            days_since_ethiopian = (current_date - payday).days
            break
    
    days_since_western = None
    for payday in sorted(western_paydays, reverse=True):
        if payday <= current_date:
            days_since_western = (current_date - payday).days
            break
    
    days_since_last = None
    for payday in sorted(all_paydays, reverse=True):
        if payday <= current_date:
            days_since_last = (current_date - payday).days
            break
    
    # Manipulation and demand windows
    is_pre_manipulation = (days_to_next is not None and 3 <= days_to_next <= 5)
    is_post_demand = (days_since_last is not None and 1 <= days_since_last <= 3)
    
    # Determine payday type
    if is_both_paydays:
        payday_type = 'both'
    elif is_ethiopian_payday:
        payday_type = 'ethiopian'
    elif is_western_payday:
        payday_type = 'western'
    else:
        payday_type = 'none'
    
    return {
        'days_to_ethiopian_payday': days_to_ethiopian,
        'days_to_western_payday': days_to_western,
        'days_to_next_payday': days_to_next,
        'days_since_ethiopian_payday': days_since_ethiopian,
        'days_since_western_payday': days_since_western,
        'days_since_last_payday': days_since_last,
        'is_pre_payday_manipulation': is_pre_manipulation,
        'is_post_payday_demand': is_post_demand,
        'is_ethiopian_payday': is_ethiopian_payday,
        'is_western_payday': is_western_payday,
        'is_both_paydays': is_both_paydays,
        'payday_type': payday_type
    }


if __name__ == "__main__":
    # Test the payday calendar service
    from datetime import date
    
    test_date = date(2024, 9, 15)
    print(f"Testing payday features for {test_date}")
    
    features = get_payday_features(test_date)
    for key, value in features.items():
        print(f"  {key}: {value}")

