"""Test the seasonality forecasting module."""

import sys
from pathlib import Path
from datetime import date

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "delivery-map-app" / "backend"))

from services.seasonality_forecast import (
    forecast_price_seasonality,
    get_seasonality_features,
    get_multi_horizon_forecast,
    normalize_product_name
)

print("=" * 60)
print("Testing Seasonality-Based Price Forecasting")
print("=" * 60)

# Test cases from the user's example
test_cases = [
    ('Red Onion', 80.0, date(2024, 7, 15), "July -> August (should increase)"),
    ('Tomato', 50.0, date(2024, 8, 15), "August -> September (should increase)"),
    ('Potato', 40.0, date(2024, 3, 15), "March -> April (should decrease)"),
    ('Red Onion A', 75.0, date(2024, 7, 20), "Test product name normalization"),
]

for product, price, test_date, description in test_cases:
    print(f"\n{'='*60}")
    print(f"Product: {product}")
    print(f"Current Price: {price} ETB")
    print(f"Date: {test_date} ({description})")
    print(f"{'='*60}")
    
    # Test normalization
    normalized = normalize_product_name(product)
    print(f"Normalized Product Name: {normalized}")
    
    # Get seasonality features
    features = get_seasonality_features(product, test_date)
    print(f"\nSeasonality Features:")
    print(f"  Current Month Index: {features['current_month_index']}")
    print(f"  Next Month Index: {features['next_month_index']}")
    print(f"  Seasonality Ratio: {features['seasonality_ratio']}")
    print(f"  Is High Season: {features['is_high_season']}")
    print(f"  Is Low Season: {features['is_low_season']}")
    print(f"  Trend: {features['seasonality_trend']}")
    print(f"  Volatility Estimate: {features['volatility_estimate']}")
    
    # Get forecast
    forecast = forecast_price_seasonality(product, price, test_date)
    if forecast:
        print(f"\nForecast Results:")
        print(f"  Predicted Price: {forecast['predicted_price']} ETB")
        print(f"  Percent Change: {forecast['percent_change']}%")
        print(f"  Recommendation: {forecast['recommendation']}")
        print(f"  Risk Level: {forecast['risk_level']}")
        print(f"  Confidence: {forecast['confidence']}")
        print(f"  Seasonality Ratio: {forecast['seasonality_ratio']}")
        
        # Multi-horizon
        print(f"\nMulti-Horizon Forecast:")
        multi = get_multi_horizon_forecast(product, price, test_date)
        for horizon, result in multi.items():
            if result:
                print(f"  {horizon}: {result['predicted_price']} ETB ({result['percent_change']:+.1f}%) - {result['recommendation']} ({result['target_month_name']})")
    else:
        print("\n  ❌ Forecast not available (product not in seasonality index)")

print("\n" + "=" * 60)
print("✅ Seasonality Forecast Testing Complete!")
print("=" * 60)

