"""
Model Training for Price Forecasting

Trains and evaluates:
1. XGBoost model (93 features)
2. SARIMA time series model
3. Ensemble model combining all approaches
"""

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import pandas as pd
import numpy as np
import pickle
import json
from pathlib import Path
import logging

from .data_preparation import create_feature_dataset, load_product_price_history
from .feature_engineering import extract_features_for_forecast, PriceForecastFeatureEngine

logger = logging.getLogger(__name__)

# Try to import ML libraries (will fail gracefully if not installed)
try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    logger.warning("XGBoost not available. Install with: pip install xgboost")

try:
    from statsmodels.tsa.statespace.sarimax import SARIMAX
    from statsmodels.tsa.seasonal import seasonal_decompose
    SARIMA_AVAILABLE = True
except ImportError:
    SARIMA_AVAILABLE = False
    logger.warning("SARIMA not available. Install with: pip install statsmodels")

try:
    from sklearn.model_selection import train_test_split, TimeSeriesSplit
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("Scikit-learn not available. Install with: pip install scikit-learn")


MODELS_DIR = Path(__file__).parent.parent.parent / "models" / "price_forecasting"
MODELS_DIR.mkdir(parents=True, exist_ok=True)


class XGBoostPriceForecaster:
    """XGBoost model for price forecasting."""
    
    def __init__(self, n_estimators: int = 200, max_depth: int = 6, learning_rate: float = 0.1):
        self.model = None
        self.scaler = StandardScaler() if SKLEARN_AVAILABLE else None
        self.feature_names = []
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.learning_rate = learning_rate
        self.is_trained = False
    
    def prepare_features(self, feature_df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare features and target from feature dataset."""
        # Remove non-feature columns
        exclude_cols = ['date', 'current_price', 'target_price', 'target_price_change', 'target_price_change_pct']
        feature_cols = [col for col in feature_df.columns if col not in exclude_cols]
        
        # Filter out rows without target
        valid_df = feature_df[feature_df['target_price'].notna()].copy()
        
        if len(valid_df) == 0:
            return pd.DataFrame(), pd.Series(dtype=float)
        
        # Extract features and target
        X = valid_df[feature_cols].copy()
        y = valid_df['target_price'].copy()
        
        # Handle missing values (fill with median or 0)
        X = X.fillna(X.median()).fillna(0)
        
        # Convert boolean columns to int
        for col in X.columns:
            if X[col].dtype == bool:
                X[col] = X[col].astype(int)
        
        # Store feature names
        self.feature_names = list(X.columns)
        
        return X, y
    
    def train(self, feature_df: pd.DataFrame, validation_split: float = 0.2) -> Dict[str, float]:
        """Train XGBoost model."""
        if not XGBOOST_AVAILABLE:
            raise ImportError("XGBoost is not installed. Install with: pip install xgboost")
        
        logger.info("Preparing features for XGBoost training...")
        X, y = self.prepare_features(feature_df)
        
        if len(X) == 0:
            raise ValueError("No valid training data available")
        
        logger.info(f"Training XGBoost with {len(X)} samples and {len(X.columns)} features")
        
        # Time series split (don't shuffle for time series)
        if len(X) > 10:
            split_idx = int(len(X) * (1 - validation_split))
            X_train, X_val = X.iloc[:split_idx], X.iloc[split_idx:]
            y_train, y_val = y.iloc[:split_idx], y.iloc[split_idx:]
        else:
            X_train, X_val = X, X
            y_train, y_val = y, y
        
        # Scale features
        if self.scaler:
            X_train_scaled = pd.DataFrame(
                self.scaler.fit_transform(X_train),
                columns=X_train.columns,
                index=X_train.index
            )
            X_val_scaled = pd.DataFrame(
                self.scaler.transform(X_val),
                columns=X_val.columns,
                index=X_val.index
            )
        else:
            X_train_scaled = X_train
            X_val_scaled = X_val
        
        # Train model
        self.model = xgb.XGBRegressor(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            learning_rate=self.learning_rate,
            random_state=42,
            n_jobs=-1
        )
        
        self.model.fit(
            X_train_scaled,
            y_train,
            eval_set=[(X_val_scaled, y_val)],
            early_stopping_rounds=20,
            verbose=False
        )
        
        # Evaluate
        train_pred = self.model.predict(X_train_scaled)
        val_pred = self.model.predict(X_val_scaled)
        
        metrics = {
            'train_mae': float(mean_absolute_error(y_train, train_pred)),
            'train_rmse': float(np.sqrt(mean_squared_error(y_train, train_pred))),
            'train_r2': float(r2_score(y_train, train_pred)),
            'val_mae': float(mean_absolute_error(y_val, val_pred)),
            'val_rmse': float(np.sqrt(mean_squared_error(y_val, val_pred))),
            'val_r2': float(r2_score(y_val, val_pred)),
            'n_features': len(self.feature_names),
            'n_samples': len(X)
        }
        
        self.is_trained = True
        logger.info(f"XGBoost training complete. Val MAE: {metrics['val_mae']:.2f}, Val R²: {metrics['val_r2']:.3f}")
        
        return metrics
    
    def predict(self, features: Dict[str, Any]) -> float:
        """Predict price from features."""
        if not self.is_trained or self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        # Convert features dict to DataFrame
        feature_row = pd.DataFrame([features])
        
        # Ensure all feature columns exist
        for col in self.feature_names:
            if col not in feature_row.columns:
                feature_row[col] = 0
        
        # Select only training features
        X = feature_row[self.feature_names].copy()
        X = X.fillna(0)
        
        # Convert boolean to int
        for col in X.columns:
            if X[col].dtype == bool:
                X[col] = X[col].astype(int)
        
        # Scale
        if self.scaler:
            X_scaled = pd.DataFrame(
                self.scaler.transform(X),
                columns=X.columns
            )
        else:
            X_scaled = X
        
        # Predict
        prediction = self.model.predict(X_scaled)[0]
        
        return float(prediction)
    
    def save(self, filepath: Path):
        """Save model to disk."""
        if not self.is_trained:
            raise ValueError("Model not trained. Cannot save.")
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'n_estimators': self.n_estimators,
            'max_depth': self.max_depth,
            'learning_rate': self.learning_rate
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        logger.info(f"Saved XGBoost model to {filepath}")
    
    def load(self, filepath: Path):
        """Load model from disk."""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.feature_names = model_data['feature_names']
        self.n_estimators = model_data['n_estimators']
        self.max_depth = model_data['max_depth']
        self.learning_rate = model_data['learning_rate']
        self.is_trained = True
        
        logger.info(f"Loaded XGBoost model from {filepath}")


class SARIMAPriceForecaster:
    """SARIMA time series model for price forecasting."""
    
    def __init__(self, order: Tuple[int, int, int] = (1, 1, 1), seasonal_order: Tuple[int, int, int, int] = (1, 1, 1, 12)):
        self.model = None
        self.order = order
        self.seasonal_order = seasonal_order
        self.is_trained = False
        self.price_history = None
    
    def train(self, price_history: pd.DataFrame) -> Dict[str, float]:
        """Train SARIMA model on price history."""
        if not SARIMA_AVAILABLE:
            raise ImportError("statsmodels is not installed. Install with: pip install statsmodels")
        
        if 'date' not in price_history.columns or 'price' not in price_history.columns:
            raise ValueError("price_history must have 'date' and 'price' columns")
        
        logger.info(f"Training SARIMA model on {len(price_history)} price points...")
        
        # Prepare time series
        price_df = price_history.copy()
        price_df['date'] = pd.to_datetime(price_df['date'])
        price_df = price_df.sort_values('date')
        price_df = price_df.set_index('date')
        
        # Resample to daily (fill missing days)
        price_series = price_df['price'].resample('D').mean()
        price_series = price_series.fillna(method='ffill').fillna(method='bfill')
        
        if len(price_series) < 30:
            raise ValueError(f"Need at least 30 data points, got {len(price_series)}")
        
        # Store history
        self.price_history = price_series
        
        # Train SARIMA
        try:
            self.model = SARIMAX(
                price_series,
                order=self.order,
                seasonal_order=self.seasonal_order,
                enforce_stationarity=False,
                enforce_invertibility=False
            ).fit(disp=False)
        except Exception as e:
            logger.warning(f"SARIMA training failed with order {self.order}, trying simpler model: {e}")
            # Try simpler model
            try:
                self.model = SARIMAX(
                    price_series,
                    order=(1, 1, 1),
                    seasonal_order=(1, 1, 1, 7),  # Weekly seasonality
                    enforce_stationarity=False,
                    enforce_invertibility=False
                ).fit(disp=False)
            except Exception as e2:
                logger.error(f"SARIMA training failed: {e2}")
                raise
        
        # Evaluate on last 20% of data
        split_idx = int(len(price_series) * 0.8)
        train_data = price_series[:split_idx]
        test_data = price_series[split_idx:]
        
        # Forecast on test set
        forecast = self.model.forecast(steps=len(test_data))
        
        metrics = {
            'mae': float(mean_absolute_error(test_data, forecast)),
            'rmse': float(np.sqrt(mean_squared_error(test_data, forecast))),
            'mape': float(np.mean(np.abs((test_data - forecast) / test_data)) * 100),
            'n_samples': len(price_series)
        }
        
        self.is_trained = True
        logger.info(f"SARIMA training complete. Test MAE: {metrics['mae']:.2f}, MAPE: {metrics['mape']:.2f}%")
        
        return metrics
    
    def predict(self, steps: int = 1) -> float:
        """Predict price for next step(s)."""
        if not self.is_trained or self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        forecast = self.model.forecast(steps=steps)
        return float(forecast[-1])  # Return last step
    
    def save(self, filepath: Path):
        """Save model to disk."""
        if not self.is_trained:
            raise ValueError("Model not trained. Cannot save.")
        
        model_data = {
            'model': self.model,
            'order': self.order,
            'seasonal_order': self.seasonal_order,
            'price_history': self.price_history
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        logger.info(f"Saved SARIMA model to {filepath}")
    
    def load(self, filepath: Path):
        """Load model from disk."""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        self.model = model_data['model']
        self.order = model_data['order']
        self.seasonal_order = model_data['seasonal_order']
        self.price_history = model_data['price_history']
        self.is_trained = True
        
        logger.info(f"Loaded SARIMA model from {filepath}")


class EnsemblePriceForecaster:
    """Ensemble model combining XGBoost, SARIMA, and seasonality."""
    
    def __init__(
        self,
        xgboost_weight: float = 0.40,
        sarima_weight: float = 0.25,
        seasonality_weight: float = 0.25,
        baseline_weight: float = 0.10
    ):
        self.xgboost_model = None
        self.sarima_model = None
        self.xgboost_weight = xgboost_weight
        self.sarima_weight = sarima_weight
        self.seasonality_weight = seasonality_weight
        self.baseline_weight = baseline_weight
        self.is_trained = False
    
    def train(
        self,
        product_name: str,
        feature_df: pd.DataFrame,
        price_history: pd.DataFrame
    ) -> Dict[str, Any]:
        """Train all models in ensemble."""
        logger.info("Training ensemble model...")
        
        metrics = {}
        
        # Train XGBoost
        if XGBOOST_AVAILABLE and len(feature_df) > 50:
            try:
                self.xgboost_model = XGBoostPriceForecaster()
                xgb_metrics = self.xgboost_model.train(feature_df)
                metrics['xgboost'] = xgb_metrics
                logger.info("✅ XGBoost trained")
            except Exception as e:
                logger.warning(f"XGBoost training failed: {e}")
                self.xgboost_model = None
        else:
            logger.warning("Skipping XGBoost (not available or insufficient data)")
        
        # Train SARIMA
        if SARIMA_AVAILABLE and len(price_history) >= 30:
            try:
                self.sarima_model = SARIMAPriceForecaster()
                sarima_metrics = self.sarima_model.train(price_history)
                metrics['sarima'] = sarima_metrics
                logger.info("✅ SARIMA trained")
            except Exception as e:
                logger.warning(f"SARIMA training failed: {e}")
                self.sarima_model = None
        else:
            logger.warning("Skipping SARIMA (not available or insufficient data)")
        
        self.is_trained = True
        logger.info("✅ Ensemble training complete")
        
        return metrics
    
    def predict(
        self,
        product_name: str,
        current_price: float,
        current_date: date,
        features: Dict[str, Any],
        price_history: Optional[pd.DataFrame] = None
    ) -> Dict[str, Any]:
        """Get ensemble prediction."""
        predictions = {}
        weights = {}
        
        # XGBoost prediction
        if self.xgboost_model and self.xgboost_model.is_trained:
            try:
                xgb_pred = self.xgboost_model.predict(features)
                predictions['xgboost'] = xgb_pred
                weights['xgboost'] = self.xgboost_weight
            except Exception as e:
                logger.warning(f"XGBoost prediction failed: {e}")
        
        # SARIMA prediction
        if self.sarima_model and self.sarima_model.is_trained:
            try:
                sarima_pred = self.sarima_model.predict(steps=1)
                predictions['sarima'] = sarima_pred
                weights['sarima'] = self.sarima_weight
            except Exception as e:
                logger.warning(f"SARIMA prediction failed: {e}")
        
        # Seasonality prediction (from seasonality_forecast)
        try:
            from .seasonality_forecast import forecast_price_seasonality
            seasonality_result = forecast_price_seasonality(
                product_name=product_name,
                current_price=current_price,
                current_date=current_date,
                horizons=1
            )
            if seasonality_result:
                seasonality_pred = seasonality_result['predicted_price']
                predictions['seasonality'] = seasonality_pred
                weights['seasonality'] = self.seasonality_weight
        except Exception as e:
            logger.warning(f"Seasonality prediction failed: {e}")
        
        # Baseline (current price)
        predictions['baseline'] = current_price
        weights['baseline'] = self.baseline_weight
        
        # Weighted average
        total_weight = sum(weights.values())
        if total_weight > 0:
            ensemble_pred = sum(predictions[k] * weights[k] for k in predictions.keys()) / total_weight
        else:
            ensemble_pred = current_price  # Fallback
        
        return {
            'ensemble_prediction': ensemble_pred,
            'component_predictions': predictions,
            'component_weights': weights
        }
    
    def save(self, filepath: Path):
        """Save ensemble model."""
        if not self.is_trained:
            raise ValueError("Model not trained. Cannot save.")
        
        model_data = {
            'xgboost_model': self.xgboost_model,
            'sarima_model': self.sarima_model,
            'xgboost_weight': self.xgboost_weight,
            'sarima_weight': self.sarima_weight,
            'seasonality_weight': self.seasonality_weight,
            'baseline_weight': self.baseline_weight
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        logger.info(f"Saved ensemble model to {filepath}")
    
    def load(self, filepath: Path):
        """Load ensemble model."""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        self.xgboost_model = model_data['xgboost_model']
        self.sarima_model = model_data['sarima_model']
        self.xgboost_weight = model_data['xgboost_weight']
        self.sarima_weight = model_data['sarima_weight']
        self.seasonality_weight = model_data['seasonality_weight']
        self.baseline_weight = model_data['baseline_weight']
        self.is_trained = True
        
        logger.info(f"Loaded ensemble model from {filepath}")


def train_models_for_product(
    product_name: str,
    forecast_date: date,
    lookback_days: int = 365
) -> Dict[str, Any]:
    """
    Train all models for a specific product.
    
    Returns:
        Dictionary with training results and model paths
    """
    logger.info(f"Training models for {product_name}...")
    
    # Prepare data
    feature_df = create_feature_dataset(
        product_name=product_name,
        forecast_date=forecast_date,
        lookback_days=lookback_days
    )
    
    price_history = load_product_price_history(
        product_name=product_name,
        end_date=forecast_date
    )
    
    if len(feature_df) == 0 or len(price_history) == 0:
        raise ValueError(f"Insufficient data for {product_name}")
    
    # Train ensemble
    ensemble = EnsemblePriceForecaster()
    metrics = ensemble.train(
        product_name=product_name,
        feature_df=feature_df,
        price_history=price_history
    )
    
    # Save models
    product_dir = MODELS_DIR / product_name.replace(' ', '_').lower()
    product_dir.mkdir(parents=True, exist_ok=True)
    
    ensemble_path = product_dir / "ensemble_model.pkl"
    ensemble.save(ensemble_path)
    
    if ensemble.xgboost_model:
        xgb_path = product_dir / "xgboost_model.pkl"
        ensemble.xgboost_model.save(xgb_path)
    
    if ensemble.sarima_model:
        sarima_path = product_dir / "sarima_model.pkl"
        ensemble.sarima_model.save(sarima_path)
    
    # Save metadata
    metadata = {
        'product_name': product_name,
        'forecast_date': forecast_date.isoformat(),
        'lookback_days': lookback_days,
        'training_date': date.today().isoformat(),
        'metrics': metrics,
        'model_paths': {
            'ensemble': str(ensemble_path),
            'xgboost': str(xgb_path) if ensemble.xgboost_model else None,
            'sarima': str(sarima_path) if ensemble.sarima_model else None
        }
    }
    
    metadata_path = product_dir / "metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    logger.info(f"✅ Models trained and saved for {product_name}")
    
    return metadata


if __name__ == "__main__":
    # Test model training
    from datetime import date
    
    print("Testing Model Training")
    print("=" * 60)
    
    # Test with Red Onion
    try:
        result = train_models_for_product(
            product_name='Red Onion',
            forecast_date=date(2024, 12, 1),
            lookback_days=365
        )
        
        print("\n✅ Training complete!")
        print(f"Metrics: {result['metrics']}")
        print(f"Models saved to: {result['model_paths']}")
    except Exception as e:
        print(f"\n❌ Training failed: {e}")
        import traceback
        traceback.print_exc()

