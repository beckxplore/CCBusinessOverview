"""
Price Forecasting API Service

Provides high-level interface for price forecasting that combines:
1. Seasonality-based forecasts (15-year data)
2. Market-specific adjustments (holidays, paydays, supply)
3. Ensemble model predictions (XGBoost + SARIMA + Seasonality)
"""

from datetime import date, datetime
from typing import Dict, Optional, Any
import logging
from pathlib import Path

from .seasonality_forecast import forecast_price_seasonality, get_multi_horizon_forecast, get_weekly_forecast
from .feature_engineering import extract_features_for_forecast
from .data_preparation import prepare_training_data, load_benchmark_prices, load_product_price_history

logger = logging.getLogger(__name__)

# Model cache
_ensemble_model_cache: Dict[str, Any] = {}
MODELS_DIR = Path(__file__).parent.parent.parent / "models" / "price_forecasting"


def _load_ensemble_model(product_name: str) -> Optional[Any]:
    """Load trained ensemble model for product (with caching)."""
    if product_name in _ensemble_model_cache:
        return _ensemble_model_cache[product_name]
    
    try:
        from .model_training import EnsemblePriceForecaster
        
        # Normalize product name for file path
        normalized_name = product_name.replace(' ', '_').lower()
        model_path = MODELS_DIR / normalized_name / "ensemble_model.pkl"
        
        if not model_path.exists():
            logger.debug(f"No trained model found for {product_name} at {model_path}")
            return None
        
        ensemble = EnsemblePriceForecaster()
        ensemble.load(model_path)
        
        _ensemble_model_cache[product_name] = ensemble
        logger.info(f"Loaded trained ensemble model for {product_name}")
        
        return ensemble
    except Exception as e:
        logger.warning(f"Failed to load ensemble model for {product_name}: {e}")
        return None


def get_price_forecast(
    product_name: str,
    current_price: float,
    current_date: Optional[date] = None,
    forecast_horizon_days: int = 30,
    include_adjustments: bool = True,
    data_source: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Get comprehensive price forecast for a product.
    
    This is the main API function that combines:
    - Seasonality base forecast (15-year data)
    - Market-specific adjustments
    - Confidence intervals
    - Recommendations
    
    Args:
        product_name: Product name
        current_price: Current market price in ETB
        current_date: Current date (defaults to today)
        forecast_horizon_days: Days ahead to forecast (default: 30)
        include_adjustments: Whether to apply market adjustments (default: True)
        data_source: Pre-loaded data source (optional)
    
    Returns:
        Comprehensive forecast dictionary
    """
    if current_date is None:
        current_date = date.today()
    
    # Step 1: Try to use trained ensemble model if available
    ensemble_model = _load_ensemble_model(product_name)
    ensemble_prediction = None
    
    if ensemble_model and ensemble_model.is_trained:
        try:
            # Extract features for ensemble
            price_history, volume_history, metrics = prepare_training_data(
                product_name=product_name,
                forecast_date=current_date,
                lookback_days=365,
                data_source=data_source
            )
            
            benchmark_prices = load_benchmark_prices(product_name, current_date)
            
            features = extract_features_for_forecast(
                product_name=product_name,
                current_date=current_date,
                current_price=current_price,
                price_history=price_history if len(price_history) > 0 else None,
                volume_history=volume_history if len(volume_history) > 0 else None,
                benchmark_prices=benchmark_prices if benchmark_prices else None
            )
            
            # Get ensemble prediction
            ensemble_result = ensemble_model.predict(
                product_name=product_name,
                current_price=current_price,
                current_date=current_date,
                features=features,
                price_history=price_history if len(price_history) > 0 else None
            )
            
            ensemble_prediction = ensemble_result['ensemble_prediction']
            logger.info(f"Using ensemble model prediction: {ensemble_prediction:.2f} ETB")
            
        except Exception as e:
            logger.warning(f"Ensemble model prediction failed, falling back to seasonality: {e}")
            ensemble_model = None
    
    # Step 2: Get seasonality base forecast (fallback or baseline)
    seasonality_forecast = forecast_price_seasonality(
        product_name=product_name,
        current_price=current_price,
        current_date=current_date,
        forecast_horizon_days=forecast_horizon_days
    )
    
    if seasonality_forecast is None:
        return {
            'error': f'No seasonality data available for {product_name}',
            'product': product_name,
            'current_price': current_price,
            'current_date': current_date.isoformat()
        }
    
    # Use ensemble prediction if available, otherwise use seasonality
    if ensemble_prediction is not None:
        base_forecast = ensemble_prediction
        base_percent_change = ((base_forecast - current_price) / current_price * 100) if current_price > 0 else 0
        forecast_method = 'ensemble'
    else:
        base_forecast = seasonality_forecast['predicted_price']
        base_percent_change = seasonality_forecast['percent_change']
        forecast_method = 'seasonality_relative_velocity'
    
    # Step 2: Apply market adjustments if requested
    adjusted_forecast = base_forecast
    adjustments = {}
    
    if include_adjustments:
        # Load historical data for feature extraction
        try:
            price_history, volume_history, metrics = prepare_training_data(
                product_name=product_name,
                forecast_date=current_date,
                lookback_days=365,
                data_source=data_source
            )
            
            # Load benchmark prices
            benchmark_prices = load_benchmark_prices(product_name, current_date)
            
            # Extract features
            features = extract_features_for_forecast(
                product_name=product_name,
                current_date=current_date,
                current_price=current_price,
                price_history=price_history if len(price_history) > 0 else None,
                volume_history=volume_history if len(volume_history) > 0 else None,
                benchmark_prices=benchmark_prices if benchmark_prices else None
            )
            
            # Calculate adjustments
            holiday_adjustment = _calculate_holiday_adjustment(features)
            payday_adjustment = _calculate_payday_adjustment(features)
            supply_adjustment = _calculate_supply_adjustment(features)
            volatility_adjustment = _calculate_volatility_adjustment(features)
            
            adjustments = {
                'holiday': holiday_adjustment,
                'payday': payday_adjustment,
                'supply': supply_adjustment,
                'volatility': volatility_adjustment
            }
            
            # Combine adjustments (weighted)
            total_adjustment = (
                0.3 * holiday_adjustment +
                0.3 * payday_adjustment +
                0.2 * supply_adjustment +
                0.2 * volatility_adjustment
            )
            
            adjusted_forecast = base_forecast * (1 + total_adjustment)
            adjustments['total'] = total_adjustment
            
        except Exception as e:
            logger.warning(f"Failed to apply market adjustments: {e}")
            adjustments = {'error': str(e)}
    
    # Step 3: Calculate confidence intervals
    confidence_intervals = _calculate_confidence_intervals(
        base_forecast=base_forecast,
        adjusted_forecast=adjusted_forecast,
        seasonality_volatility=seasonality_forecast.get('seasonality_ratio', 1.0),
        features=features if include_adjustments else {}
    )
    
    # Step 4: Determine recommendation
    recommendation = _determine_recommendation(
        base_percent_change=base_percent_change,
        adjusted_forecast=adjusted_forecast,
        current_price=current_price,
        features=features if include_adjustments else {}
    )
    
    # Step 5: Get multi-horizon forecast
    multi_horizon = get_multi_horizon_forecast(
        product_name=product_name,
        current_price=current_price,
        current_date=current_date
    )
    
    # Step 6: Get 6-week weekly forecast
    weekly_forecast = get_weekly_forecast(
        product_name=product_name,
        current_price=current_price,
        current_date=current_date,
        num_weeks=6
    )
    
    return {
        'product': product_name,
        'current_price': current_price,
        'current_date': current_date.isoformat(),
        'forecast_horizon_days': forecast_horizon_days,
        
        'base_forecast': {
            'method': forecast_method,
            'predicted_price': round(base_forecast, 2),
            'percent_change': round(base_percent_change, 1),
            'seasonality_ratio': seasonality_forecast.get('seasonality_ratio'),
            'confidence': seasonality_forecast.get('confidence', 'Medium'),
            'uses_trained_model': ensemble_prediction is not None
        },
        
        'adjusted_forecast': {
            'predicted_price': round(adjusted_forecast, 2),
            'percent_change': round(((adjusted_forecast - current_price) / current_price * 100), 1),
            'adjustments': adjustments
        },
        
        'confidence_intervals': confidence_intervals,
        
        'recommendation': recommendation,
        
        'multi_horizon': multi_horizon,
        
        'weekly_forecast': weekly_forecast,  # 6-week weekly forecast
        
        'risk_indicators': {
            'volatility_level': _get_volatility_level(features if include_adjustments else {}),
            'manipulation_risk': features.get('payday_manipulation_risk', 0.0) if include_adjustments else 0.0,
            'supply_risk': _get_supply_risk(features if include_adjustments else {}),
            'holiday_impact': features.get('holiday_intensity', 0.0) if include_adjustments else 0.0
        }
    }


def _calculate_holiday_adjustment(features: Dict) -> float:
    """Calculate holiday impact adjustment (as multiplier)."""
    if features.get('holiday_is_new_year') or features.get('holiday_is_christmas'):
        return 0.15  # +15% for major holidays
    elif features.get('holiday_is_pre_holiday'):
        return 0.10  # +10% pre-holiday
    elif features.get('holiday_is_post_holiday'):
        return -0.05  # -5% post-holiday (demand drop)
    elif features.get('holiday_payday_overlap'):
        return 0.20  # +20% for holiday+payday overlap
    return 0.0


def _calculate_payday_adjustment(features: Dict) -> float:
    """Calculate payday manipulation adjustment."""
    if features.get('payday_is_pre_manipulation'):
        return 0.10  # +10% in manipulation window
    elif features.get('payday_is_post_demand'):
        return 0.05  # +5% post-payday demand
    elif features.get('payday_is_both'):
        return 0.15  # +15% when both paydays coincide
    return 0.0


def _calculate_supply_adjustment(features: Dict) -> float:
    """Calculate supply signal adjustment."""
    supply_signal = features.get('supply_signal')
    if supply_signal == 'shortage':
        return 0.15  # +15% for shortage
    elif supply_signal == 'glut':
        return -0.10  # -10% for glut
    return 0.0


def _calculate_volatility_adjustment(features: Dict) -> float:
    """Calculate volatility-based adjustment."""
    price_cv_30d = features.get('price_cv_30d')
    if price_cv_30d is None:
        return 0.0
    
    # High volatility increases uncertainty (wider confidence intervals, not price adjustment)
    # Return 0 for now, volatility affects confidence, not point forecast
    return 0.0


def _calculate_confidence_intervals(
    base_forecast: float,
    adjusted_forecast: float,
    seasonality_volatility: float,
    features: Dict
) -> Dict[str, Any]:
    """Calculate confidence intervals for forecast."""
    # Base uncertainty from seasonality
    base_uncertainty = abs(seasonality_volatility - 1.0) * 0.1
    
    # Additional uncertainty from market factors
    market_uncertainty = 0.0
    if features.get('payday_manipulation_risk', 0) > 0.5:
        market_uncertainty += 0.05
    if features.get('market_divergence_high', False):
        market_uncertainty += 0.05
    if features.get('holiday_payday_overlap', False):
        market_uncertainty += 0.05
    
    total_uncertainty = base_uncertainty + market_uncertainty
    
    # Calculate intervals
    std_dev = adjusted_forecast * total_uncertainty
    
    return {
        '50%': [
            round(adjusted_forecast - 0.67 * std_dev, 2),
            round(adjusted_forecast + 0.67 * std_dev, 2)
        ],
        '80%': [
            round(adjusted_forecast - 1.28 * std_dev, 2),
            round(adjusted_forecast + 1.28 * std_dev, 2)
        ],
        '95%': [
            round(adjusted_forecast - 1.96 * std_dev, 2),
            round(adjusted_forecast + 1.96 * std_dev, 2)
        ]
    }


def _determine_recommendation(
    base_percent_change: float,
    adjusted_forecast: float,
    current_price: float,
    features: Dict
) -> Dict[str, Any]:
    """Determine recommendation based on forecast."""
    adjusted_percent_change = ((adjusted_forecast - current_price) / current_price * 100) if current_price > 0 else 0
    
    # Use adjusted forecast if available, otherwise base
    percent_change = adjusted_percent_change if adjusted_percent_change != 0 else base_percent_change
    
    if percent_change > 5:
        action = 'BUY NOW'
        sentiment = 'Price Rising'
        urgency = 'High' if percent_change > 15 else 'Medium'
        color_code = 'red'
    elif percent_change < -5:
        action = 'WAIT / DE-STOCK'
        sentiment = 'Price Falling'
        urgency = 'High' if percent_change < -15 else 'Medium'
        color_code = 'green'
    else:
        action = 'HOLD'
        sentiment = 'Stable'
        urgency = 'Low'
        color_code = 'gray'
    
    # Add reasoning
    reasoning_parts = []
    if features.get('seasonality_trend') == 'rising':
        reasoning_parts.append('Strong seasonality signal')
    if features.get('holiday_intensity', 0) > 1.5:
        reasoning_parts.append('Holiday demand expected')
    if features.get('payday_is_pre_manipulation'):
        reasoning_parts.append('Pre-payday manipulation risk')
    if features.get('supply_signal') == 'shortage':
        reasoning_parts.append('Supply shortage detected')
    
    reasoning = ' + '.join(reasoning_parts) if reasoning_parts else 'Normal market conditions'
    
    return {
        'action': action,
        'sentiment': sentiment,
        'urgency': urgency,
        'color_code': color_code,
        'reasoning': reasoning,
        'percent_change': round(percent_change, 1)
    }


def _get_volatility_level(features: Dict) -> str:
    """Get volatility level from features."""
    price_cv = features.get('price_cv_30d')
    if price_cv is None:
        return 'unknown'
    elif price_cv > 0.2:
        return 'high'
    elif price_cv > 0.1:
        return 'medium'
    else:
        return 'low'


def _get_supply_risk(features: Dict) -> float:
    """Get supply risk score (0-1)."""
    supply_signal = features.get('supply_signal')
    if supply_signal == 'shortage':
        return 0.7
    elif supply_signal == 'glut':
        return 0.2
    else:
        return 0.0


if __name__ == "__main__":
    # Test the forecast API
    from datetime import date
    
    print("Testing Price Forecast API")
    print("=" * 60)
    
    forecast = get_price_forecast(
        product_name='Red Onion',
        current_price=80.0,
        current_date=date(2024, 7, 15),
        include_adjustments=True
    )
    
    print(f"\nProduct: {forecast['product']}")
    print(f"Current Price: {forecast['current_price']} ETB")
    print(f"Date: {forecast['current_date']}")
    
    print(f"\nBase Forecast (Seasonality):")
    base = forecast['base_forecast']
    print(f"  Predicted: {base['predicted_price']} ETB ({base['percent_change']}%)")
    print(f"  Confidence: {base['confidence']}")
    
    print(f"\nAdjusted Forecast:")
    adj = forecast['adjusted_forecast']
    print(f"  Predicted: {adj['predicted_price']} ETB ({adj['percent_change']}%)")
    if 'adjustments' in adj:
        print(f"  Adjustments: {adj['adjustments']}")
    
    print(f"\nRecommendation:")
    rec = forecast['recommendation']
    print(f"  Action: {rec['action']}")
    print(f"  Reasoning: {rec['reasoning']}")
    print(f"  Urgency: {rec['urgency']}")
    
    print(f"\nConfidence Intervals:")
    ci = forecast['confidence_intervals']
    print(f"  50%: {ci['50%']}")
    print(f"  80%: {ci['80%']}")
    print(f"  95%: {ci['95%']}")

