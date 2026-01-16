"""Test the feature engineering pipeline."""

import sys
from pathlib import Path
from datetime import date, timedelta
import pandas as pd
import numpy as np

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "delivery-map-app" / "backend"))

from services.feature_engineering import extract_features_for_forecast, PriceForecastFeatureEngine

print("=" * 60)
print("Testing Feature Engineering Pipeline")
print("=" * 60)

# Create realistic sample data
print("\n1. Creating sample historical data...")
dates = pd.date_range(start='2024-01-01', end='2024-07-15', freq='D')

# Price history with some trends
base_price = 70
trend = np.linspace(0, 10, len(dates))  # Upward trend
seasonal = 5 * np.sin(np.arange(len(dates)) * 2 * np.pi / 30)  # Monthly cycle
noise = np.random.randn(len(dates)) * 8
prices = base_price + trend + seasonal + noise

price_history = pd.DataFrame({
    'date': dates,
    'price': prices
})

# Volume history
base_volume = 1000
volume_trend = np.linspace(0, -100, len(dates))  # Slight downward trend
volume_seasonal = 200 * np.sin(np.arange(len(dates)) * 2 * np.pi / 30)
volume_noise = np.random.randn(len(dates)) * 150
volumes = base_volume + volume_trend + volume_seasonal + volume_noise
volumes = np.maximum(volumes, 100)  # Ensure positive

volume_history = pd.DataFrame({
    'date': dates,
    'volume_kg': volumes
})

benchmark_prices = {
    'local_shop': 85.0,
    'farm': 60.0,
    'supermarket': 90.0
}

print(f"   Price history: {len(price_history)} days")
print(f"   Volume history: {len(volume_history)} days")
print(f"   Benchmark prices: {benchmark_prices}")

# Test feature extraction
print("\n2. Extracting features...")
test_date = date(2024, 7, 15)
current_price = 80.0

features = extract_features_for_forecast(
    product_name='Red Onion',
    current_date=test_date,
    current_price=current_price,
    price_history=price_history,
    volume_history=volume_history,
    benchmark_prices=benchmark_prices
)

print(f"   ✅ Extracted {len(features)} features")

# Categorize features
print("\n3. Feature Categories:")
categories = {}
for key in features.keys():
    category = key.split('_')[0]
    categories[category] = categories.get(category, 0) + 1

for category, count in sorted(categories.items()):
    print(f"   {category:20s}: {count:3d} features")

# Show sample features from each category
print("\n4. Sample Features by Category:")
for category in sorted(categories.keys()):
    category_features = {k: v for k, v in features.items() if k.startswith(category)}
    print(f"\n   {category.upper()}:")
    for i, (key, value) in enumerate(list(category_features.items())[:5]):
        if value is not None:
            if isinstance(value, float):
                print(f"     {key:35s}: {value:8.3f}")
            else:
                print(f"     {key:35s}: {value}")

# Test with different products
print("\n5. Testing with different products:")
test_products = ['Red Onion', 'Tomato', 'Potato', 'Avocado', 'Banana']

for product in test_products:
    features = extract_features_for_forecast(
        product_name=product,
        current_date=test_date,
        current_price=50.0,
        price_history=price_history,
        volume_history=volume_history,
        benchmark_prices=benchmark_prices
    )
    
    seasonality_ratio = features.get('seasonality_ratio')
    if seasonality_ratio:
        trend = features.get('seasonality_trend', 'unknown')
        print(f"   {product:15s}: ratio={seasonality_ratio:.3f}, trend={trend}")
    else:
        print(f"   {product:15s}: No seasonality data")

# Test payday features
print("\n6. Testing Payday Features:")
payday_dates = [
    date(2024, 1, 8),   # Ethiopian payday
    date(2024, 1, 28),  # Western payday
    date(2024, 1, 5),   # Pre-payday manipulation window
    date(2024, 1, 30),  # Post-payday demand period
]

for test_date in payday_dates:
    features = extract_features_for_forecast(
        product_name='Red Onion',
        current_date=test_date,
        current_price=80.0,
        price_history=price_history,
        volume_history=volume_history,
        benchmark_prices=benchmark_prices
    )
    
    is_pre = features.get('payday_is_pre_manipulation', False)
    is_post = features.get('payday_is_post_demand', False)
    is_eth = features.get('payday_is_ethiopian', False)
    is_west = features.get('payday_is_western', False)
    risk = features.get('payday_manipulation_risk', 0.0)
    
    print(f"   {test_date}: pre={is_pre}, post={is_post}, eth={is_eth}, west={is_west}, risk={risk:.2f}")

# Test holiday features
print("\n7. Testing Holiday Features:")
holiday_dates = [
    date(2024, 9, 11),  # Ethiopian New Year
    date(2024, 1, 7),   # Christmas
    date(2024, 9, 4),   # Pre-holiday (7 days before New Year)
    date(2024, 1, 10),  # Post-holiday (3 days after Christmas)
]

for test_date in holiday_dates:
    features = extract_features_for_forecast(
        product_name='Red Onion',
        current_date=test_date,
        current_price=80.0,
        price_history=price_history,
        volume_history=volume_history,
        benchmark_prices=benchmark_prices
    )
    
    is_new_year = features.get('holiday_is_new_year', False)
    is_christmas = features.get('holiday_is_christmas', False)
    is_pre = features.get('holiday_is_pre_holiday', False)
    is_post = features.get('holiday_is_post_holiday', False)
    intensity = features.get('holiday_intensity', 0.0)
    overlap = features.get('holiday_payday_overlap', False)
    
    print(f"   {test_date}: new_year={is_new_year}, christmas={is_christmas}, pre={is_pre}, post={is_post}, intensity={intensity:.1f}, overlap={overlap}")

print("\n" + "=" * 60)
print("✅ Feature Engineering Test Complete!")
print("=" * 60)
print(f"\nTotal features available: {len(features)}")
print("Ready for model training!")

