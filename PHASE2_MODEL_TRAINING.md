# Phase 2: Model Training Implementation

## Overview
Phase 2 implements machine learning models for price forecasting, building on the seasonality-based approach from Phase 1.

## Models Implemented

### 1. XGBoost Model
- **Purpose**: Gradient boosting model using 93 engineered features
- **Features**: 
  - Seasonality features (15-year indices)
  - Payday features (Ethiopian + Western)
  - Holiday features
  - Historical price features (lags, rolling stats, trends)
  - Volume/supply features
  - Market structure features (benchmark price spreads)
  - Calendar features (cyclical encoding)
- **Training**: Uses time series split (no shuffling)
- **Evaluation**: MAE, RMSE, R² on validation set

### 2. SARIMA Model
- **Purpose**: Time series model for capturing temporal patterns
- **Configuration**: 
  - Order: (1, 1, 1) - ARIMA parameters
  - Seasonal order: (1, 1, 1, 12) - Monthly seasonality
  - Falls back to weekly seasonality (7) if monthly fails
- **Training**: Fits on price history time series
- **Evaluation**: MAE, RMSE, MAPE on test set

### 3. Ensemble Model
- **Purpose**: Combines all models for robust predictions
- **Weights**:
  - XGBoost: 40%
  - SARIMA: 25%
  - Seasonality: 25%
  - Baseline (current price): 10%
- **Fallback**: Uses available models, falls back to seasonality if ML models unavailable

## File Structure

```
delivery-map-app/
├── backend/
│   ├── services/
│   │   ├── model_training.py      # Model training classes
│   │   ├── forecast_api.py        # Updated to use trained models
│   │   ├── data_preparation.py    # Data loading and preparation
│   │   └── feature_engineering.py # Feature extraction
│   └── requirements.txt           # Updated with ML libraries
├── models/
│   └── price_forecasting/
│       ├── red_onion/
│       │   ├── ensemble_model.pkl
│       │   ├── xgboost_model.pkl
│       │   ├── sarima_model.pkl
│       │   └── metadata.json
│       └── ...
└── train_price_forecast_models.py  # Training script
```

## Training Script

### Usage

**Train for a single product:**
```bash
python train_price_forecast_models.py --product "Red Onion" --lookback 365
```

**Train for all products:**
```bash
python train_price_forecast_models.py --all-products --lookback 365
```

**With custom forecast date:**
```bash
python train_price_forecast_models.py --product "Tomato" --forecast-date "2024-12-01" --lookback 180
```

### Parameters
- `--product`: Product name to train (e.g., "Red Onion")
- `--all-products`: Train models for all products with seasonality data
- `--forecast-date`: Forecast date (YYYY-MM-DD), defaults to today
- `--lookback`: Number of days to look back for training data (default: 365)

## Model Integration

### Automatic Model Loading
The `forecast_api.py` service automatically:
1. Checks for trained ensemble models
2. Loads and caches models in memory
3. Uses ensemble prediction if available
4. Falls back to seasonality-only if models not trained

### API Behavior
- **With trained models**: Uses ensemble (XGBoost + SARIMA + Seasonality)
- **Without trained models**: Uses seasonality-only (Phase 1 behavior)
- **Model availability**: Checked via `uses_trained_model` flag in response

## Dependencies

### New Requirements
Added to `requirements.txt`:
```
xgboost>=2.0.0
scikit-learn>=1.3.0
statsmodels>=0.14.0
numpy
```

### Installation
```bash
cd delivery-map-app/backend
pip install -r requirements.txt
```

## Training Process

### 1. Data Preparation
- Loads historical price and volume data from Google Sheets
- Creates feature dataset with sliding window approach
- Extracts 93 features for each date

### 2. Feature Engineering
- **Seasonality**: 15-year monthly indices
- **Payday**: Days to/since Ethiopian and Western paydays
- **Holiday**: Fixed Ethiopian holidays (New Year, Christmas, Epiphany, Meskel)
- **Price**: Lags (1, 3, 7, 14, 30 days), rolling stats (7d, 30d), trends
- **Volume**: Rolling averages, supply signals (shortage/glut/normal)
- **Market**: Price spreads vs benchmarks (local shop, farm, supermarket)
- **Calendar**: Cyclical encoding (month, day of year)

### 3. Model Training
- **XGBoost**: 
  - Time series split (80/20)
  - Early stopping on validation set
  - Feature scaling
- **SARIMA**:
  - Auto-fits on price time series
  - Handles missing data (forward/backward fill)
  - Falls back to simpler model if complex fails

### 4. Model Evaluation
- **XGBoost**: MAE, RMSE, R² on validation set
- **SARIMA**: MAE, RMSE, MAPE on test set (last 20%)
- **Ensemble**: Weighted average of component predictions

### 5. Model Persistence
- Models saved as pickle files
- Metadata saved as JSON (training date, metrics, paths)
- Models cached in memory for fast inference

## Model Performance

### Expected Metrics
- **XGBoost**: 
  - Val MAE: ~5-15 ETB (depends on product volatility)
  - Val R²: ~0.6-0.8 (good fit for volatile market)
- **SARIMA**:
  - Test MAE: ~8-20 ETB
  - Test MAPE: ~10-25% (acceptable for volatile market)
- **Ensemble**: 
  - Typically better than individual models
  - More robust to outliers

### Factors Affecting Performance
1. **Data quality**: More historical data = better models
2. **Product volatility**: High volatility = lower accuracy
3. **Feature completeness**: Missing benchmark prices reduces accuracy
4. **Market manipulation**: Hard to predict, increases uncertainty

## Usage in Production

### Training Schedule
- **Initial training**: Run once with all historical data
- **Retraining**: Monthly or quarterly as new data accumulates
- **Incremental updates**: Can retrain with new data only

### Model Updates
```python
from services.model_training import train_models_for_product
from datetime import date

# Retrain for a product
result = train_models_for_product(
    product_name='Red Onion',
    forecast_date=date.today(),
    lookback_days=365
)
```

### Model Loading in API
Models are automatically loaded when:
1. First forecast request for a product
2. Model file exists in `models/price_forecasting/{product}/ensemble_model.pkl`
3. Cached in memory for subsequent requests

## Next Steps

### Phase 3: Model Evaluation & Optimization
1. **Backtesting**: Test models on historical data
2. **Hyperparameter tuning**: Optimize XGBoost and SARIMA parameters
3. **Feature selection**: Identify most important features
4. **Model comparison**: Compare ensemble vs individual models

### Phase 4: Production Deployment
1. **Automated retraining**: Schedule monthly retraining
2. **Model versioning**: Track model versions and performance
3. **A/B testing**: Compare new models vs baseline
4. **Monitoring**: Track forecast accuracy over time

## Troubleshooting

### Common Issues

**1. "XGBoost not available"**
- Solution: `pip install xgboost`

**2. "SARIMA training failed"**
- Cause: Insufficient data or non-stationary series
- Solution: Model falls back to simpler configuration

**3. "No valid training data"**
- Cause: Product has < 30 days of history
- Solution: Need more historical data

**4. "Model file not found"**
- Cause: Models not trained yet
- Solution: Run training script first

**5. "Feature mismatch"**
- Cause: Feature engineering changed after training
- Solution: Retrain models with new features

## Notes

- Models are product-specific (one model per product)
- Training requires at least 30 days of historical data
- More data = better models (aim for 6+ months)
- Models degrade over time (retrain periodically)
- Ensemble is more robust than individual models
- Seasonality model always available as fallback

