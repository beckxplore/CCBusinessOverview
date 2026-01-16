"""
Seasonality-Based Price Forecasting

Based on 15-year historical seasonality data for Ethiopian Horticulture.
Uses "Relative Velocity" concept: applies seasonality multiplier to current price.

Formula: P_next = P_current × (I_next / I_current)
Where I = Seasonality Index (1.0 = average, >1.0 = high season, <1.0 = low season)
"""

from typing import Dict, Optional, Tuple
from datetime import date, datetime
import logging

logger = logging.getLogger(__name__)

# Seasonality Index based on 15 years of historical data
# 1.0 = Average Annual Price
# >1.0 = High Season (Shortage)
# <1.0 = Low Season (Harvest Glut)
SEASONALITY_INDEX: Dict[str, Dict[str, float]] = {
    'Red Onion': {
        'Jan': 1.01, 'Feb': 0.73, 'Mar': 0.64, 'Apr': 0.72, 'May': 0.96, 'Jun': 1.20,
        'Jul': 1.21, 'Aug': 1.49, 'Sep': 1.53, 'Oct': 0.73, 'Nov': 0.74, 'Dec': 0.99
    },
    'Tomato': {
        'Jan': 0.82, 'Feb': 0.79, 'Mar': 0.87, 'Apr': 0.84, 'May': 0.57, 'Jun': 0.74,
        'Jul': 1.01, 'Aug': 0.95, 'Sep': 1.53, 'Oct': 1.68, 'Nov': 1.09, 'Dec': 0.97
    },
    'Potato': {
        'Jan': 0.94, 'Feb': 1.18, 'Mar': 1.39, 'Apr': 1.37, 'May': 1.32, 'Jun': 1.13,
        'Jul': 0.90, 'Aug': 0.85, 'Sep': 0.86, 'Oct': 0.81, 'Nov': 0.78, 'Dec': 0.72
    },
    'Avocado': {
        'Jan': 0.91, 'Feb': 0.91, 'Mar': 1.02, 'Apr': 0.98, 'May': 0.65, 'Jun': 0.64,
        'Jul': 0.64, 'Aug': 0.79, 'Sep': 1.07, 'Oct': 1.47, 'Nov': 1.53, 'Dec': 0.80
    },
    'Banana': {
        'Jan': 1.0, 'Feb': 1.0, 'Mar': 1.0, 'Apr': 0.90, 'May': 0.98, 'Jun': 1.07,
        'Jul': 1.10, 'Aug': 1.0, 'Sep': 1.0, 'Oct': 1.0, 'Nov': 0.93, 'Dec': 1.41
    }
}

MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']


def normalize_product_name(product_name: str) -> str:
    """
    Normalize product name to match seasonality index keys.
    Handles variations like "Red Onion A", "Red Onion", "Tomato", etc.
    """
    product_lower = product_name.lower().strip()
    
    # Mapping variations to standard names
    product_mapping = {
        'red onion': 'Red Onion',
        'red onion a': 'Red Onion',
        'red onion b': 'Red Onion',
        'red onion elfora': 'Red Onion',
        'tomato': 'Tomato',
        'tomato a': 'Tomato',
        'potato': 'Potato',
        'potatoes': 'Potato',
        'avocado': 'Avocado',
        'banana': 'Banana',
    }
    
    for key, standard_name in product_mapping.items():
        if key in product_lower:
            return standard_name
    
    # Try direct match
    for standard_name in SEASONALITY_INDEX.keys():
        if standard_name.lower() in product_lower or product_lower in standard_name.lower():
            return standard_name
    
    return product_name  # Return as-is if no match


def get_seasonality_index(product_name: str, month: int) -> Optional[float]:
    """
    Get seasonality index for a product and month.
    
    Args:
        product_name: Product name (will be normalized)
        month: Month number (1-12, where 1=January)
    
    Returns:
        Seasonality index (float) or None if product not found
    """
    normalized_product = normalize_product_name(product_name)
    
    if normalized_product not in SEASONALITY_INDEX:
        return None
    
    if month < 1 or month > 12:
        return None
    
    month_name = MONTH_NAMES[month - 1]
    return SEASONALITY_INDEX[normalized_product].get(month_name)


def get_seasonality_features(product_name: str, current_date: date) -> Dict:
    """
    Get seasonality features for a product on a given date.
    
    Returns:
        {
            'current_month_index': float,
            'next_month_index': float,
            'seasonality_ratio': float,
            'is_high_season': bool,
            'is_low_season': bool,
            'seasonality_trend': str,  # 'rising', 'falling', 'stable'
            'volatility_estimate': float  # based on index range
        }
    """
    current_month = current_date.month
    next_month = current_month + 1 if current_month < 12 else 1
    
    current_index = get_seasonality_index(product_name, current_month)
    next_index = get_seasonality_index(product_name, next_month)
    
    if current_index is None or next_index is None:
        return {
            'current_month_index': None,
            'next_month_index': None,
            'seasonality_ratio': None,
            'is_high_season': None,
            'is_low_season': None,
            'seasonality_trend': None,
            'volatility_estimate': None
        }
    
    ratio = next_index / current_index if current_index > 0 else None
    
    # Determine trend
    if ratio is None:
        trend = None
    elif ratio > 1.05:
        trend = 'rising'
    elif ratio < 0.95:
        trend = 'falling'
    else:
        trend = 'stable'
    
    # Calculate volatility estimate (range of indices for this product)
    normalized_product = normalize_product_name(product_name)
    if normalized_product in SEASONALITY_INDEX:
        indices = list(SEASONALITY_INDEX[normalized_product].values())
        volatility = max(indices) - min(indices)
    else:
        volatility = None
    
    return {
        'current_month_index': current_index,
        'next_month_index': next_index,
        'seasonality_ratio': ratio,
        'is_high_season': current_index > 1.0,
        'is_low_season': current_index < 1.0,
        'seasonality_trend': trend,
        'volatility_estimate': volatility
    }


def forecast_price_seasonality(product_name: str, current_price: float, 
                               current_date: date, forecast_horizon_days: int = 30) -> Optional[Dict]:
    """
    Forecast price using seasonality-based relative velocity approach.
    
    Formula: P_next = P_current × (I_next / I_current)
    
    Args:
        product_name: Product name
        current_price: Current market price in ETB
        current_date: Current date
        forecast_horizon_days: Days ahead to forecast (default: 30 for next month)
    
    Returns:
        {
            'predicted_price': float,
            'percent_change': float,
            'recommendation': str,  # 'BUY', 'WAIT', 'HOLD'
            'risk_level': str,  # 'High', 'Low'
            'current_month_index': float,
            'next_month_index': float,
            'seasonality_ratio': float,
            'confidence': str  # 'High', 'Medium', 'Low'
        }
    """
    current_month = current_date.month
    next_month = current_month + 1 if current_month < 12 else 1
    
    current_index = get_seasonality_index(product_name, current_month)
    next_index = get_seasonality_index(product_name, next_month)
    
    if current_index is None or next_index is None:
        logger.warning(f"Seasonality index not found for product: {product_name}")
        return None
    
    if current_index == 0:
        logger.warning(f"Zero seasonality index for product: {product_name}, month: {current_month}")
        return None
    
    # Calculate ratio and forecast
    ratio = next_index / current_index
    predicted_price = current_price * ratio
    percent_change = (ratio - 1) * 100
    
    # Determine recommendation
    if percent_change > 5:
        recommendation = 'BUY'
        risk_level = 'High' if abs(percent_change) > 15 else 'Medium'
    elif percent_change < -5:
        recommendation = 'WAIT'
        risk_level = 'High' if abs(percent_change) > 15 else 'Medium'
    else:
        recommendation = 'HOLD'
        risk_level = 'Low'
    
    # Confidence based on volatility
    normalized_product = normalize_product_name(product_name)
    if normalized_product in SEASONALITY_INDEX:
        indices = list(SEASONALITY_INDEX[normalized_product].values())
        volatility = max(indices) - min(indices)
        if volatility > 0.5:
            confidence = 'High'  # Strong seasonal pattern
        elif volatility > 0.3:
            confidence = 'Medium'
        else:
            confidence = 'Low'  # Weak seasonal pattern
    else:
        confidence = 'Low'
    
    return {
        'predicted_price': round(predicted_price, 2),
        'percent_change': round(percent_change, 1),
        'recommendation': recommendation,
        'risk_level': risk_level,
        'current_month_index': current_index,
        'next_month_index': next_index,
        'seasonality_ratio': round(ratio, 3),
        'confidence': confidence,
        'method': 'seasonality_relative_velocity'
    }


def get_weekly_forecast(product_name: str, current_price: float, 
                        current_date: date, num_weeks: int = 6) -> list:
    """
    Get weekly forecasts for the next N weeks.
    
    Args:
        product_name: Product name
        current_price: Current market price in ETB
        current_date: Current date
        num_weeks: Number of weeks to forecast (default: 6)
    
    Returns:
        List of weekly forecast dictionaries:
        [
            {
                'week': int,  # Week number (1-6)
                'week_start_date': str,  # ISO format date
                'predicted_price': float,
                'percent_change': float,  # Change from current price
                'week_over_week_change': float,  # Change from previous week
                'recommendation': str,  # 'BUY', 'WAIT', 'HOLD'
                'month': int,
                'month_name': str
            },
            ...
        ]
    """
    from datetime import timedelta
    
    normalized_product = normalize_product_name(product_name)
    if normalized_product not in SEASONALITY_INDEX:
        logger.warning(f"No seasonality data for {product_name}")
        return []
    
    weekly_forecasts = []
    current_price_forecast = current_price
    
    for week_num in range(1, num_weeks + 1):
        # Calculate the date for this week (start of week)
        week_start_date = current_date + timedelta(days=(week_num - 1) * 7)
        
        # Get month for this week
        week_month = week_start_date.month
        week_month_name = MONTH_NAMES[week_month - 1]
        
        # Get seasonality index for this week's month
        week_index = get_seasonality_index(product_name, week_month)
        current_month_index = get_seasonality_index(product_name, current_date.month)
        
        if week_index is None or current_month_index is None or current_month_index == 0:
            # Fallback: use linear interpolation or previous week's price
            if weekly_forecasts:
                predicted_price = weekly_forecasts[-1]['predicted_price']
            else:
                predicted_price = current_price
        else:
            # Calculate price based on seasonality ratio
            # Use ratio from current month to target month
            ratio = week_index / current_month_index
            predicted_price = current_price * ratio
        
        # Calculate percent change from current price
        percent_change = ((predicted_price - current_price) / current_price * 100) if current_price > 0 else 0
        
        # Calculate week-over-week change
        if week_num == 1:
            week_over_week_change = percent_change
        else:
            prev_price = weekly_forecasts[-1]['predicted_price']
            week_over_week_change = ((predicted_price - prev_price) / prev_price * 100) if prev_price > 0 else 0
        
        # Determine recommendation based on percent change
        if percent_change > 5:
            recommendation = 'BUY'
        elif percent_change < -5:
            recommendation = 'WAIT'
        else:
            recommendation = 'HOLD'
        
        weekly_forecasts.append({
            'week': week_num,
            'week_start_date': week_start_date.isoformat(),
            'predicted_price': round(predicted_price, 2),
            'percent_change': round(percent_change, 1),
            'week_over_week_change': round(week_over_week_change, 1),
            'recommendation': recommendation,
            'month': week_month,
            'month_name': week_month_name,
            'seasonality_index': round(week_index, 3) if week_index else None
        })
        
        # Update current price for next iteration (for smoother transitions)
        current_price_forecast = predicted_price
    
    return weekly_forecasts


def get_multi_horizon_forecast(product_name: str, current_price: float, 
                               current_date: date) -> Dict:
    """
    Get forecasts for multiple horizons (1 month, 2 months, 3 months).
    
    Returns:
        {
            '1_month': forecast_dict,
            '2_month': forecast_dict,
            '3_month': forecast_dict
        }
    """
    results = {}
    
    for horizon_months in [1, 2, 3]:
        current_month = current_date.month
        target_month = ((current_month - 1 + horizon_months) % 12) + 1
        
        current_index = get_seasonality_index(product_name, current_month)
        target_index = get_seasonality_index(product_name, target_month)
        
        if current_index is None or target_index is None:
            results[f'{horizon_months}_month'] = None
            continue
        
        if current_index == 0:
            results[f'{horizon_months}_month'] = None
            continue
        
        ratio = target_index / current_index
        predicted_price = current_price * ratio
        percent_change = (ratio - 1) * 100
        
        # Determine recommendation
        if percent_change > 5:
            recommendation = 'BUY'
        elif percent_change < -5:
            recommendation = 'WAIT'
        else:
            recommendation = 'HOLD'
        
        results[f'{horizon_months}_month'] = {
            'predicted_price': round(predicted_price, 2),
            'percent_change': round(percent_change, 1),
            'recommendation': recommendation,
            'target_month': target_month,
            'target_month_name': MONTH_NAMES[target_month - 1],
            'seasonality_ratio': round(ratio, 3)
        }
    
    return results


if __name__ == "__main__":
    # Test the seasonality forecast
    from datetime import date
    
    test_cases = [
        ('Red Onion', 80.0, date(2024, 7, 15)),  # July -> August (should increase)
        ('Tomato', 50.0, date(2024, 8, 15)),     # August -> September (should increase)
        ('Potato', 40.0, date(2024, 3, 15)),     # March -> April (should decrease)
    ]
    
    print("Testing Seasonality-Based Price Forecasting")
    print("=" * 60)
    
    for product, price, test_date in test_cases:
        print(f"\nProduct: {product}")
        print(f"Current Price: {price} ETB")
        print(f"Date: {test_date}")
        
        forecast = forecast_price_seasonality(product, price, test_date)
        if forecast:
            print(f"  Predicted Price: {forecast['predicted_price']} ETB")
            print(f"  Percent Change: {forecast['percent_change']}%")
            print(f"  Recommendation: {forecast['recommendation']}")
            print(f"  Risk Level: {forecast['risk_level']}")
            print(f"  Confidence: {forecast['confidence']}")
            print(f"  Ratio: {forecast['seasonality_ratio']}")
        
        # Multi-horizon
        multi = get_multi_horizon_forecast(product, price, test_date)
        print(f"  Multi-horizon:")
        for horizon, result in multi.items():
            if result:
                print(f"    {horizon}: {result['predicted_price']} ETB ({result['percent_change']}%) - {result['recommendation']}")

