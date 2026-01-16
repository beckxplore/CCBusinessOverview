"""
Comprehensive Feature Engineering for Price Forecasting

Combines:
1. Seasonality features (15-year indices)
2. Payday features (Ethiopian + Western)
3. Holiday features
4. Historical price features
5. Volume/supply features
6. Market structure features
"""

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np
import logging

from .seasonality_forecast import get_seasonality_features, normalize_product_name
from .payday_calendar import get_payday_features, get_payday_calendar_for_date_range

logger = logging.getLogger(__name__)


class PriceForecastFeatureEngine:
    """Feature engineering engine for price forecasting."""
    
    def __init__(self):
        self.payday_calendar_cache = None
        self.price_history_cache = {}
        self.volume_history_cache = {}
    
    def _ensure_payday_calendar(self, current_date: date, lookback_days: int = 365):
        """Ensure payday calendar is loaded for date range."""
        if self.payday_calendar_cache is None:
            start_date = current_date - timedelta(days=lookback_days)
            end_date = current_date + timedelta(days=365)
            self.payday_calendar_cache = get_payday_calendar_for_date_range(start_date, end_date)
        return self.payday_calendar_cache
    
    def extract_all_features(
        self,
        product_name: str,
        current_date: date,
        current_price: float,
        price_history: Optional[pd.DataFrame] = None,
        volume_history: Optional[pd.DataFrame] = None,
        benchmark_prices: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Extract all features for price forecasting.
        
        Args:
            product_name: Product name
            current_date: Current date
            current_price: Current market price
            price_history: DataFrame with columns ['date', 'price'] (optional)
            volume_history: DataFrame with columns ['date', 'volume_kg'] (optional)
            benchmark_prices: Dict with keys like 'local_shop', 'farm', 'supermarket' (optional)
        
        Returns:
            Dictionary of all features
        """
        features = {}
        
        # 1. Seasonality Features (15-year data)
        features.update(self._extract_seasonality_features(product_name, current_date))
        
        # 2. Payday Features
        features.update(self._extract_payday_features(current_date))
        
        # 3. Holiday Features
        features.update(self._extract_holiday_features(current_date))
        
        # 4. Historical Price Features
        if price_history is not None:
            features.update(self._extract_price_features(current_date, current_price, price_history))
        
        # 5. Volume/Supply Features
        if volume_history is not None:
            features.update(self._extract_volume_features(current_date, volume_history))
        
        # 6. Market Structure Features
        if benchmark_prices is not None:
            features.update(self._extract_market_features(current_price, benchmark_prices))
        
        # 7. Calendar Features
        features.update(self._extract_calendar_features(current_date))
        
        return features
    
    def _extract_seasonality_features(self, product_name: str, current_date: date) -> Dict[str, Any]:
        """Extract seasonality features from 15-year data."""
        seasonality = get_seasonality_features(product_name, current_date)
        
        features = {
            'seasonality_current_index': seasonality.get('current_month_index'),
            'seasonality_next_index': seasonality.get('next_month_index'),
            'seasonality_ratio': seasonality.get('seasonality_ratio'),
            'seasonality_is_high_season': seasonality.get('is_high_season'),
            'seasonality_is_low_season': seasonality.get('is_low_season'),
            'seasonality_trend': seasonality.get('seasonality_trend'),
            'seasonality_volatility': seasonality.get('volatility_estimate'),
        }
        
        # Additional derived features
        if seasonality.get('current_month_index') is not None:
            current_idx = seasonality['current_month_index']
            features['seasonality_relative_position'] = (
                (current_idx - 1.0) / max(0.1, seasonality.get('volatility_estimate', 1.0))
                if seasonality.get('volatility_estimate') else None
            )
        
        return features
    
    def _extract_payday_features(self, current_date: date) -> Dict[str, Any]:
        """Extract payday-related features."""
        self._ensure_payday_calendar(current_date)
        payday_features = get_payday_features(current_date, self.payday_calendar_cache)
        
        features = {
            'payday_days_to_ethiopian': payday_features.get('days_to_ethiopian_payday'),
            'payday_days_to_western': payday_features.get('days_to_western_payday'),
            'payday_days_to_next': payday_features.get('days_to_next_payday'),
            'payday_days_since_ethiopian': payday_features.get('days_since_ethiopian_payday'),
            'payday_days_since_western': payday_features.get('days_since_western_payday'),
            'payday_days_since_last': payday_features.get('days_since_last_payday'),
            'payday_is_pre_manipulation': payday_features.get('is_pre_payday_manipulation'),
            'payday_is_post_demand': payday_features.get('is_post_payday_demand'),
            'payday_is_ethiopian': payday_features.get('is_ethiopian_payday'),
            'payday_is_western': payday_features.get('is_western_payday'),
            'payday_is_both': payday_features.get('is_both_paydays'),
            'payday_type': payday_features.get('payday_type'),
        }
        
        # Manipulation risk score
        manipulation_risk = 0.0
        if features['payday_is_pre_manipulation']:
            manipulation_risk += 0.4
        if features['payday_is_both']:
            manipulation_risk += 0.3
        if features['payday_days_to_next'] is not None and features['payday_days_to_next'] <= 2:
            manipulation_risk += 0.3
        
        features['payday_manipulation_risk'] = min(1.0, manipulation_risk)
        
        return features
    
    def _extract_holiday_features(self, current_date: date) -> Dict[str, Any]:
        """Extract holiday-related features."""
        # Fixed Ethiopian holidays
        ethiopian_holidays = {
            'new_year': (9, 11),  # September 11
            'christmas': (1, 7),  # January 7
            'epiphany': (1, 19),  # January 19
            'meskel': (9, 27),    # September 27
        }
        
        features = {
            'holiday_is_new_year': False,
            'holiday_is_christmas': False,
            'holiday_is_epiphany': False,
            'holiday_is_meskel': False,
            'holiday_days_to_next': None,
            'holiday_days_since_last': None,
            'holiday_is_pre_holiday': False,
            'holiday_is_post_holiday': False,
            'holiday_intensity': 0.0,
        }
        
        # Check for fixed holidays
        for holiday_name, (month, day) in ethiopian_holidays.items():
            holiday_date = date(current_date.year, month, day)
            days_diff = (holiday_date - current_date).days
            
            if days_diff == 0:
                features[f'holiday_is_{holiday_name}'] = True
                features['holiday_intensity'] = 2.5 if holiday_name in ['new_year', 'christmas'] else 1.5
            elif 0 < days_diff <= 7:
                features['holiday_is_pre_holiday'] = True
                features['holiday_days_to_next'] = days_diff
                features['holiday_intensity'] = 1.5 if holiday_name in ['new_year', 'christmas'] else 1.2
            elif -3 <= days_diff < 0:
                features['holiday_is_post_holiday'] = True
                features['holiday_days_since_last'] = abs(days_diff)
        
        # Calculate days to next major holiday
        if features['holiday_days_to_next'] is None:
            next_holiday_days = []
            for holiday_name, (month, day) in ethiopian_holidays.items():
                holiday_date = date(current_date.year, month, day)
                if holiday_date < current_date:
                    holiday_date = date(current_date.year + 1, month, day)
                days_diff = (holiday_date - current_date).days
                next_holiday_days.append(days_diff)
            
            if next_holiday_days:
                features['holiday_days_to_next'] = min(next_holiday_days)
        
        # Holiday + Payday overlap (extreme manipulation risk)
        payday_features = get_payday_features(current_date, self.payday_calendar_cache) if self.payday_calendar_cache else {}
        features['holiday_payday_overlap'] = (
            features['holiday_is_pre_holiday'] and 
            payday_features.get('is_pre_payday_manipulation', False)
        )
        
        return features
    
    def _extract_price_features(
        self, 
        current_date: date, 
        current_price: float, 
        price_history: pd.DataFrame
    ) -> Dict[str, Any]:
        """Extract historical price features."""
        features = {}
        
        # Ensure price_history has date column
        if 'date' not in price_history.columns:
            logger.warning("price_history missing 'date' column")
            return features
        
        # Convert date column if needed
        price_df = price_history.copy()
        if not pd.api.types.is_datetime64_any_dtype(price_df['date']):
            price_df['date'] = pd.to_datetime(price_df['date'])
        
        price_df = price_df.sort_values('date')
        price_df = price_df[price_df['date'] <= pd.Timestamp(current_date)]
        
        if len(price_df) == 0:
            return features
        
        # Lag features
        for lag_days in [1, 3, 7, 14, 30]:
            lag_date = current_date - timedelta(days=lag_days)
            lag_prices = price_df[price_df['date'] <= pd.Timestamp(lag_date)]
            if len(lag_prices) > 0:
                lag_price = lag_prices.iloc[-1]['price']
                features[f'price_lag_{lag_days}d'] = lag_price
                features[f'price_change_{lag_days}d'] = current_price - lag_price
                features[f'price_change_pct_{lag_days}d'] = ((current_price - lag_price) / lag_price * 100) if lag_price > 0 else None
            else:
                features[f'price_lag_{lag_days}d'] = None
                features[f'price_change_{lag_days}d'] = None
                features[f'price_change_pct_{lag_days}d'] = None
        
        # Rolling statistics
        for window_days in [7, 30]:
            window_start = current_date - timedelta(days=window_days)
            window_prices = price_df[price_df['date'] >= pd.Timestamp(window_start)]
            
            if len(window_prices) > 0:
                prices = window_prices['price'].values
                features[f'price_mean_{window_days}d'] = float(np.mean(prices))
                features[f'price_std_{window_days}d'] = float(np.std(prices))
                features[f'price_min_{window_days}d'] = float(np.min(prices))
                features[f'price_max_{window_days}d'] = float(np.max(prices))
                features[f'price_range_{window_days}d'] = features[f'price_max_{window_days}d'] - features[f'price_min_{window_days}d']
                features[f'price_cv_{window_days}d'] = (features[f'price_std_{window_days}d'] / features[f'price_mean_{window_days}d']) if features[f'price_mean_{window_days}d'] > 0 else None
            else:
                for stat in ['mean', 'std', 'min', 'max', 'range', 'cv']:
                    features[f'price_{stat}_{window_days}d'] = None
        
        # Trend features
        recent_30d = price_df[price_df['date'] >= pd.Timestamp(current_date - timedelta(days=30))]
        if len(recent_30d) >= 2:
            x = np.arange(len(recent_30d))
            y = recent_30d['price'].values
            slope = np.polyfit(x, y, 1)[0] if len(y) > 1 else 0
            features['price_trend_30d'] = float(slope)
            features['price_trend_direction'] = 'rising' if slope > 0 else 'falling' if slope < 0 else 'stable'
        else:
            features['price_trend_30d'] = None
            features['price_trend_direction'] = None
        
        # Relative position
        all_prices = price_df['price'].values
        if len(all_prices) > 0:
            features['price_relative_to_min'] = (current_price - np.min(all_prices)) / max(0.1, np.min(all_prices))
            features['price_relative_to_max'] = (current_price - np.max(all_prices)) / max(0.1, np.max(all_prices))
            features['price_percentile'] = float(np.percentile(all_prices, 50))  # Median
            features['price_zscore_30d'] = (
                (current_price - features.get('price_mean_30d', current_price)) / 
                max(0.1, features.get('price_std_30d', 1.0))
            ) if features.get('price_std_30d') else None
        else:
            features['price_relative_to_min'] = None
            features['price_relative_to_max'] = None
            features['price_percentile'] = None
            features['price_zscore_30d'] = None
        
        return features
    
    def _extract_volume_features(self, current_date: date, volume_history: pd.DataFrame) -> Dict[str, Any]:
        """Extract volume/supply signal features."""
        features = {}
        
        if 'date' not in volume_history.columns:
            logger.warning("volume_history missing 'date' column")
            return features
        
        volume_df = volume_history.copy()
        if not pd.api.types.is_datetime64_any_dtype(volume_df['date']):
            volume_df['date'] = pd.to_datetime(volume_df['date'])
        
        volume_df = volume_df.sort_values('date')
        volume_df = volume_df[volume_df['date'] <= pd.Timestamp(current_date)]
        
        if len(volume_df) == 0:
            return features
        
        # Rolling volume statistics
        for window_days in [7, 30]:
            window_start = current_date - timedelta(days=window_days)
            window_volumes = volume_df[volume_df['date'] >= pd.Timestamp(window_start)]
            
            if len(window_volumes) > 0:
                volumes = window_volumes['volume_kg'].values
                features[f'volume_mean_{window_days}d'] = float(np.mean(volumes))
                features[f'volume_sum_{window_days}d'] = float(np.sum(volumes))
                features[f'volume_std_{window_days}d'] = float(np.std(volumes))
            else:
                features[f'volume_mean_{window_days}d'] = None
                features[f'volume_sum_{window_days}d'] = None
                features[f'volume_std_{window_days}d'] = None
        
        # Volume change
        recent_7d = volume_df[volume_df['date'] >= pd.Timestamp(current_date - timedelta(days=7))]
        recent_30d = volume_df[volume_df['date'] >= pd.Timestamp(current_date - timedelta(days=30))]
        
        if len(recent_7d) > 0 and len(recent_30d) > 0:
            vol_7d_avg = np.mean(recent_7d['volume_kg'].values)
            vol_30d_avg = np.mean(recent_30d['volume_kg'].values)
            features['volume_change_7d_vs_30d'] = vol_7d_avg - vol_30d_avg
            features['volume_change_pct_7d_vs_30d'] = ((vol_7d_avg - vol_30d_avg) / vol_30d_avg * 100) if vol_30d_avg > 0 else None
        else:
            features['volume_change_7d_vs_30d'] = None
            features['volume_change_pct_7d_vs_30d'] = None
        
        # Supply signals
        if features.get('volume_mean_30d'):
            all_volumes = volume_df['volume_kg'].values
            if len(all_volumes) > 0:
                vol_percentile = np.percentile(all_volumes, [25, 50, 75])
                current_vol = features['volume_mean_7d'] if features.get('volume_mean_7d') else features['volume_mean_30d']
                
                if current_vol < vol_percentile[0]:
                    features['supply_signal'] = 'shortage'
                elif current_vol > vol_percentile[2]:
                    features['supply_signal'] = 'glut'
                else:
                    features['supply_signal'] = 'normal'
            else:
                features['supply_signal'] = None
        else:
            features['supply_signal'] = None
        
        return features
    
    def _extract_market_features(self, current_price: float, benchmark_prices: Dict[str, float]) -> Dict[str, Any]:
        """Extract market structure features."""
        features = {}
        
        # Price spreads
        if 'local_shop' in benchmark_prices:
            local_price = benchmark_prices['local_shop']
            features['spread_vs_local_shop'] = current_price - local_price
            features['spread_pct_vs_local_shop'] = ((current_price - local_price) / local_price * 100) if local_price > 0 else None
        
        if 'farm' in benchmark_prices:
            farm_price = benchmark_prices['farm']
            features['spread_vs_farm'] = current_price - farm_price
            features['spread_pct_vs_farm'] = ((current_price - farm_price) / farm_price * 100) if farm_price > 0 else None
            features['premium_to_farm'] = features['spread_pct_vs_farm']
        
        if 'supermarket' in benchmark_prices:
            supermarket_price = benchmark_prices['supermarket']
            features['spread_vs_supermarket'] = current_price - supermarket_price
            features['spread_pct_vs_supermarket'] = ((current_price - supermarket_price) / supermarket_price * 100) if supermarket_price > 0 else None
        
        # Market divergence (potential manipulation signal)
        spreads = [v for k, v in features.items() if 'spread_pct' in k and v is not None]
        if spreads:
            features['market_divergence'] = float(np.std(spreads))
            features['market_divergence_high'] = features['market_divergence'] > 20.0
        else:
            features['market_divergence'] = None
            features['market_divergence_high'] = None
        
        return features
    
    def _extract_calendar_features(self, current_date: date) -> Dict[str, Any]:
        """Extract calendar-based features."""
        features = {
            'month': current_date.month,
            'day_of_month': current_date.day,
            'day_of_week': current_date.weekday(),  # 0=Monday, 6=Sunday
            'week_of_year': current_date.isocalendar()[1],
            'day_of_year': current_date.timetuple().tm_yday,
        }
        
        # Cyclical encoding
        features['month_sin'] = np.sin(2 * np.pi * features['month'] / 12)
        features['month_cos'] = np.cos(2 * np.pi * features['month'] / 12)
        features['day_of_year_sin'] = np.sin(2 * np.pi * features['day_of_year'] / 365)
        features['day_of_year_cos'] = np.cos(2 * np.pi * features['day_of_year'] / 365)
        
        # Season indicators
        month = current_date.month
        features['is_rainy_season'] = 6 <= month <= 9  # June-September
        features['is_dry_season'] = month in [10, 11, 12, 1, 2]  # October-February
        
        return features


def extract_features_for_forecast(
    product_name: str,
    current_date: date,
    current_price: float,
    price_history: Optional[pd.DataFrame] = None,
    volume_history: Optional[pd.DataFrame] = None,
    benchmark_prices: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Convenience function to extract all features.
    
    This is the main entry point for feature extraction.
    """
    engine = PriceForecastFeatureEngine()
    return engine.extract_all_features(
        product_name=product_name,
        current_date=current_date,
        current_price=current_price,
        price_history=price_history,
        volume_history=volume_history,
        benchmark_prices=benchmark_prices
    )


if __name__ == "__main__":
    # Test feature extraction
    from datetime import date
    import pandas as pd
    
    print("Testing Feature Engineering")
    print("=" * 60)
    
    # Create sample data
    dates = pd.date_range(start='2024-01-01', end='2024-07-15', freq='D')
    price_history = pd.DataFrame({
        'date': dates,
        'price': 70 + np.random.randn(len(dates)) * 10 + np.sin(np.arange(len(dates)) * 2 * np.pi / 30) * 5
    })
    
    volume_history = pd.DataFrame({
        'date': dates,
        'volume_kg': 1000 + np.random.randn(len(dates)) * 200
    })
    
    benchmark_prices = {
        'local_shop': 85.0,
        'farm': 60.0,
        'supermarket': 90.0
    }
    
    # Extract features
    features = extract_features_for_forecast(
        product_name='Red Onion',
        current_date=date(2024, 7, 15),
        current_price=80.0,
        price_history=price_history,
        volume_history=volume_history,
        benchmark_prices=benchmark_prices
    )
    
    print(f"\nTotal features extracted: {len(features)}")
    print("\nFeature categories:")
    categories = {}
    for key in features.keys():
        category = key.split('_')[0]
        categories[category] = categories.get(category, 0) + 1
    
    for category, count in sorted(categories.items()):
        print(f"  {category}: {count} features")
    
    print("\nSample features:")
    for i, (key, value) in enumerate(list(features.items())[:20]):
        print(f"  {key}: {value}")

