"""
Data Preparation for Price Forecasting

Loads and prepares historical data for feature engineering and model training.
"""

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np
from pathlib import Path
import logging

from .sheet_data import fetch_raw_sheet_data

logger = logging.getLogger(__name__)


def load_product_price_history(
    product_name: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    data_source: Optional[pd.DataFrame] = None
) -> pd.DataFrame:
    """
    Load price history for a specific product.
    
    Args:
        product_name: Product name (will be normalized)
        start_date: Start date (optional filter)
        end_date: End date (optional filter)
        data_source: Pre-loaded DataFrame (optional, otherwise fetches from Google Sheets)
    
    Returns:
        DataFrame with columns: ['date', 'price', 'volume_kg', 'revenue', 'cost']
    """
    if data_source is None:
        logger.info("Fetching data from Google Sheets...")
        data_source = fetch_raw_sheet_data()
    
    if data_source is None or data_source.empty:
        logger.warning("No data available")
        return pd.DataFrame()
    
    # Normalize product name
    from .seasonality_forecast import normalize_product_name
    normalized_product = normalize_product_name(product_name)
    
    # Filter by product
    if 'Product Name' in data_source.columns:
        # Try exact match first
        product_df = data_source[data_source['Product Name'].str.strip().str.lower() == normalized_product.lower()].copy()
        
        # If no exact match, try partial match
        if len(product_df) == 0:
            product_df = data_source[
                data_source['Product Name'].str.strip().str.lower().str.contains(normalized_product.lower(), na=False)
            ].copy()
    else:
        logger.warning("'Product Name' column not found in data")
        return pd.DataFrame()
    
    if len(product_df) == 0:
        logger.warning(f"No data found for product: {product_name}")
        return pd.DataFrame()
    
    # Ensure date column exists
    if 'date_dt' in product_df.columns:
        product_df['date'] = product_df['date_dt'].dt.date
    elif 'created_at' in product_df.columns:
        product_df['date'] = pd.to_datetime(product_df['created_at']).dt.date
    else:
        logger.warning("No date column found")
        return pd.DataFrame()
    
    # Calculate price (selling price)
    if 'price' in product_df.columns:
        product_df['price'] = pd.to_numeric(product_df['price'], errors='coerce')
    elif 'final_revenue' in product_df.columns and 'final_volume_kg' in product_df.columns:
        # Calculate from revenue/volume
        product_df['price'] = product_df['final_revenue'] / product_df['final_volume_kg'].replace(0, np.nan)
    else:
        logger.warning("Cannot calculate price")
        return pd.DataFrame()
    
    # Get volume
    if 'final_volume_kg' in product_df.columns:
        product_df['volume_kg'] = pd.to_numeric(product_df['final_volume_kg'], errors='coerce')
    else:
        product_df['volume_kg'] = None
    
    # Get revenue and cost
    product_df['revenue'] = pd.to_numeric(product_df.get('final_revenue', 0), errors='coerce').fillna(0)
    product_df['cost'] = pd.to_numeric(product_df.get('final_cost', 0), errors='coerce').fillna(0)
    
    # Select and rename columns
    result_df = product_df[['date', 'price', 'volume_kg', 'revenue', 'cost']].copy()
    
    # Filter by date range
    if start_date:
        result_df = result_df[result_df['date'] >= start_date]
    if end_date:
        result_df = result_df[result_df['date'] <= end_date]
    
    # Sort by date
    result_df = result_df.sort_values('date')
    
    # Remove duplicates (keep last for same date)
    result_df = result_df.drop_duplicates(subset=['date'], keep='last')
    
    # Remove invalid prices
    result_df = result_df[result_df['price'] > 0]
    result_df = result_df[result_df['price'].notna()]
    
    logger.info(f"Loaded {len(result_df)} records for {product_name} ({normalized_product})")
    
    return result_df.reset_index(drop=True)


def prepare_training_data(
    product_name: str,
    forecast_date: date,
    lookback_days: int = 365,
    data_source: Optional[pd.DataFrame] = None
) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, float]]:
    """
    Prepare training data for a specific product and forecast date.
    
    Args:
        product_name: Product name
        forecast_date: Date to forecast from
        lookback_days: How many days of history to use
        data_source: Pre-loaded DataFrame (optional)
    
    Returns:
        Tuple of (price_history, volume_history, current_metrics)
        - price_history: DataFrame with ['date', 'price']
        - volume_history: DataFrame with ['date', 'volume_kg']
        - current_metrics: Dict with current_price, current_volume, etc.
    """
    start_date = forecast_date - timedelta(days=lookback_days)
    
    # Load product data
    product_df = load_product_price_history(
        product_name=product_name,
        start_date=start_date,
        end_date=forecast_date,
        data_source=data_source
    )
    
    if len(product_df) == 0:
        logger.warning(f"No data available for {product_name}")
        return pd.DataFrame(), pd.DataFrame(), {}
    
    # Split into price and volume history
    price_history = product_df[['date', 'price']].copy()
    volume_history = product_df[['date', 'volume_kg']].copy()
    
    # Get current metrics (most recent data)
    latest = product_df.iloc[-1]
    current_metrics = {
        'current_price': float(latest['price']),
        'current_volume': float(latest['volume_kg']) if pd.notna(latest['volume_kg']) else None,
        'current_date': latest['date'],
        'data_points': len(product_df),
        'date_range': {
            'start': product_df['date'].min().isoformat(),
            'end': product_df['date'].max().isoformat()
        }
    }
    
    return price_history, volume_history, current_metrics


def load_benchmark_prices(
    product_name: str,
    current_date: date,
    benchmark_data: Optional[Dict] = None
) -> Dict[str, float]:
    """
    Load benchmark prices for a product.
    
    Args:
        product_name: Product name
        current_date: Current date
        benchmark_data: Pre-loaded benchmark data (optional)
    
    Returns:
        Dict with keys: 'local_shop', 'farm', 'supermarket', 'sunday_market'
    """
    benchmark_prices = {}
    
    # TODO: Load from benchmark API or CSV
    # For now, return empty dict - will be populated from API/CSV in actual implementation
    
    return benchmark_prices


def create_feature_dataset(
    product_name: str,
    forecast_date: date,
    lookback_days: int = 365,
    data_source: Optional[pd.DataFrame] = None
) -> pd.DataFrame:
    """
    Create a complete feature dataset for training.
    
    This function:
    1. Loads historical data
    2. Extracts features for each date
    3. Creates a training-ready DataFrame
    
    Args:
        product_name: Product name
        forecast_date: Date to forecast from
        lookback_days: How many days of history to use
        data_source: Pre-loaded DataFrame (optional)
    
    Returns:
        DataFrame with all features for each date
    """
    from .feature_engineering import extract_features_for_forecast
    
    # Load data
    price_history, volume_history, current_metrics = prepare_training_data(
        product_name=product_name,
        forecast_date=forecast_date,
        lookback_days=lookback_days,
        data_source=data_source
    )
    
    if len(price_history) == 0:
        return pd.DataFrame()
    
    # Extract features for each date (for training)
    feature_rows = []
    
    # Use a sliding window approach
    min_days_for_features = 30  # Need at least 30 days of history
    
    for i in range(min_days_for_features, len(price_history)):
        current_row = price_history.iloc[i]
        current_date = current_row['date']
        current_price = current_row['price']
        
        # Get historical data up to this point
        historical_prices = price_history.iloc[:i+1].copy()
        historical_volumes = volume_history.iloc[:i+1].copy() if len(volume_history) > i else pd.DataFrame()
        
        # Extract features
        features = extract_features_for_forecast(
            product_name=product_name,
            current_date=current_date,
            current_price=current_price,
            price_history=historical_prices,
            volume_history=historical_volumes if len(historical_volumes) > 0 else None,
            benchmark_prices=None  # TODO: Load benchmark prices
        )
        
        # Add target (next day price)
        if i < len(price_history) - 1:
            features['target_price'] = price_history.iloc[i+1]['price']
            features['target_price_change'] = price_history.iloc[i+1]['price'] - current_price
            features['target_price_change_pct'] = (
                (price_history.iloc[i+1]['price'] - current_price) / current_price * 100
            ) if current_price > 0 else None
        else:
            features['target_price'] = None
            features['target_price_change'] = None
            features['target_price_change_pct'] = None
        
        features['date'] = current_date
        features['current_price'] = current_price
        
        feature_rows.append(features)
    
    if len(feature_rows) == 0:
        return pd.DataFrame()
    
    # Convert to DataFrame
    feature_df = pd.DataFrame(feature_rows)
    
    logger.info(f"Created feature dataset with {len(feature_df)} rows and {len(feature_df.columns)} columns")
    
    return feature_df


if __name__ == "__main__":
    # Test data preparation
    from datetime import date
    
    print("Testing Data Preparation")
    print("=" * 60)
    
    # Test loading data
    print("\n1. Loading product price history...")
    price_df = load_product_price_history('Red Onion', end_date=date(2024, 12, 1))
    
    if len(price_df) > 0:
        print(f"   ✅ Loaded {len(price_df)} records")
        print(f"   Date range: {price_df['date'].min()} to {price_df['date'].max()}")
        print(f"   Price range: {price_df['price'].min():.2f} to {price_df['price'].max():.2f} ETB")
        print(f"   Average price: {price_df['price'].mean():.2f} ETB")
    else:
        print("   ⚠️  No data loaded (may need Google Sheets access)")
    
    # Test feature dataset creation
    if len(price_df) > 0:
        print("\n2. Creating feature dataset...")
        feature_df = create_feature_dataset('Red Onion', date(2024, 12, 1), lookback_days=180)
        
        if len(feature_df) > 0:
            print(f"   ✅ Created dataset with {len(feature_df)} rows")
            print(f"   Features: {len(feature_df.columns)} columns")
            print(f"   Sample columns: {list(feature_df.columns[:10])}")
        else:
            print("   ⚠️  Could not create feature dataset")

