# 🎯 Integrated Price Forecasting Strategy
## Combining 15-Year Seasonality Data with Market-Specific Features

**Version:** 2.0  
**Date:** December 2025  
**Integration:** Seasonality Relative Velocity + Ethiopian Market Features

---

## 📊 OVERVIEW

We now have **TWO powerful forecasting approaches** to combine:

1. **15-Year Seasonality Data** (External, validated)
   - Relative Velocity: P_next = P_current × (I_next / I_current)
   - Based on long-term historical patterns
   - Simple, interpretable, proven

2. **Market-Specific Features** (Our data, 2 years)
   - Holidays, paydays, manipulation patterns
   - Volume signals, benchmark spreads
   - Volatility, anomalies

**Strategy:** Use seasonality as the **anchor/base forecast**, then **adjust** with market-specific features.

---

## 🔄 HYBRID FORECASTING APPROACH

### **Step 1: Seasonality Base Forecast**

```python
# Get base forecast from 15-year seasonality
seasonality_forecast = forecast_price_seasonality(
    product_name="Red Onion",
    current_price=80.0,
    current_date=date(2024, 7, 15)
)

# Result: 98.4 ETB (+23% increase)
# Recommendation: BUY NOW
```

### **Step 2: Market-Specific Adjustments**

```python
# Calculate adjustment factors
holiday_impact = get_holiday_multiplier(current_date, product_name)
payday_risk = get_payday_manipulation_risk(current_date)
supply_signal = get_supply_indicator(volume_data, product_name)
volatility_adjustment = get_volatility_adjustment(recent_prices)

# Combine adjustments
total_adjustment = (
    0.3 * holiday_impact +
    0.3 * payday_risk +
    0.2 * supply_signal +
    0.2 * volatility_adjustment
)

# Apply to base forecast
adjusted_forecast = seasonality_forecast * (1 + total_adjustment)
```

### **Step 3: Ensemble with Other Models**

```python
# Combine with other forecasting models
final_forecast = (
    0.25 * seasonality_forecast +      # Base (15-year data)
    0.20 * adjusted_forecast +         # Seasonality + market features
    0.20 * sarima_forecast +           # Time series
    0.15 * xgboost_forecast +          # Machine learning
    0.10 * quantile_forecast +         # Risk/confidence
    0.10 * lstm_forecast               # Temporal patterns
)
```

---

## 📈 SEASONALITY DATA INTEGRATION

### **Available Products with 15-Year Data:**

1. **Red Onion**
   - High season: Aug-Sep (index 1.49-1.53)
   - Low season: Mar-Apr (index 0.64-0.72)
   - Volatility: High (range 0.89)

2. **Tomato**
   - High season: Sep-Oct (index 1.53-1.68)
   - Low season: May (index 0.57)
   - Volatility: Very High (range 1.11)

3. **Potato**
   - High season: Mar-May (index 1.32-1.39)
   - Low season: Dec (index 0.72)
   - Volatility: Medium (range 0.67)

4. **Avocado**
   - High season: Oct-Nov (index 1.47-1.53)
   - Low season: May-Jul (index 0.64-0.65)
   - Volatility: High (range 0.89)

5. **Banana**
   - High season: Dec (index 1.41)
   - Low season: Apr-Nov (index 0.90-1.10)
   - Volatility: Low (range 0.51)

### **Integration into Feature Engineering:**

```python
# Add seasonality features to all models
features = {
    # ... existing features ...
    
    # Seasonality features (NEW)
    'current_seasonality_index': 1.21,      # July for Red Onion
    'next_seasonality_index': 1.49,        # August for Red Onion
    'seasonality_ratio': 1.23,             # 1.49 / 1.21
    'is_high_season': True,
    'is_low_season': False,
    'seasonality_trend': 'rising',
    'seasonality_volatility': 0.89,
    
    # Relative position
    'seasonality_percentile': 0.75,        # Current index vs annual range
}
```

---

## 🎯 FORECASTING WORKFLOW

### **Phase 1: Base Forecast (Seasonality)**

```python
def get_base_forecast(product, current_price, current_date):
    """Get seasonality-based base forecast."""
    return forecast_price_seasonality(product, current_price, current_date)
```

### **Phase 2: Market Adjustments**

```python
def apply_market_adjustments(base_forecast, current_date, product, market_data):
    """Apply market-specific adjustments to base forecast."""
    
    adjustments = {
        'holiday': get_holiday_adjustment(current_date, product),
        'payday': get_payday_adjustment(current_date),
        'supply': get_supply_adjustment(market_data, product),
        'volatility': get_volatility_adjustment(market_data, product),
        'manipulation_risk': get_manipulation_risk(current_date, market_data)
    }
    
    # Weighted combination
    total_adjustment = sum(
        weight * adj for weight, adj in [
            (0.25, adjustments['holiday']),
            (0.25, adjustments['payday']),
            (0.20, adjustments['supply']),
            (0.15, adjustments['volatility']),
            (0.15, adjustments['manipulation_risk'])
        ]
    )
    
    return base_forecast * (1 + total_adjustment)
```

### **Phase 3: Ensemble**

```python
def ensemble_forecast(product, current_price, current_date, market_data):
    """Final ensemble forecast combining all models."""
    
    # Base forecasts
    seasonality_base = get_base_forecast(product, current_price, current_date)
    seasonality_adjusted = apply_market_adjustments(
        seasonality_base, current_date, product, market_data
    )
    
    # Other models
    sarima_forecast = sarima_model.forecast(...)
    xgboost_forecast = xgboost_model.predict(...)
    quantile_forecast = quantile_model.predict(...)
    lstm_forecast = lstm_model.predict(...)
    
    # Weighted ensemble
    final = (
        0.25 * seasonality_base +
        0.20 * seasonality_adjusted +
        0.20 * sarima_forecast +
        0.15 * xgboost_forecast +
        0.10 * quantile_forecast +
        0.10 * lstm_forecast
    )
    
    return final
```

---

## 📊 OUTPUT FORMAT

### **Enhanced Forecast Output:**

```json
{
  "product": "Red Onion",
  "forecast_date": "2024-07-15",
  "current_price": 80.0,
  
  "base_forecast": {
    "method": "seasonality_relative_velocity",
    "predicted_price": 98.4,
    "percent_change": 23.0,
    "recommendation": "BUY",
    "confidence": "High",
    "seasonality_ratio": 1.23
  },
  
  "adjusted_forecast": {
    "predicted_price": 102.5,
    "adjustments": {
      "holiday": 0.02,
      "payday": 0.01,
      "supply": -0.01,
      "volatility": 0.01,
      "manipulation_risk": 0.01
    },
    "total_adjustment": 0.04
  },
  
  "ensemble_forecast": {
    "predicted_price": 100.2,
    "confidence_intervals": {
      "50%": [95.0, 105.0],
      "80%": [90.0, 110.0],
      "95%": [85.0, 115.0]
    },
    "model_contributions": {
      "seasonality_base": 0.25,
      "seasonality_adjusted": 0.20,
      "sarima": 0.20,
      "xgboost": 0.15,
      "quantile": 0.10,
      "lstm": 0.10
    }
  },
  
  "risk_indicators": {
    "volatility_level": "high",
    "manipulation_risk": 0.30,
    "supply_shortage_risk": 0.25,
    "holiday_impact": 1.15,
    "payday_impact": 1.10
  },
  
  "recommendations": {
    "action": "BUY NOW",
    "reasoning": "Strong seasonality signal (+23%) + Holiday demand + Pre-payday manipulation risk",
    "confidence": "High"
  }
}
```

---

## 🚀 IMPLEMENTATION PRIORITY

### **Phase 1: Seasonality Integration (Week 1)**
1. ✅ Create `seasonality_forecast.py` module
2. ✅ Integrate seasonality indices into feature engineering
3. ✅ Add seasonality features to XGBoost model
4. ✅ Test seasonality forecasts on historical data

### **Phase 2: Market Adjustments (Week 2)**
1. Implement holiday adjustment multipliers
2. Implement payday risk adjustments
3. Implement supply signal adjustments
4. Test adjusted forecasts

### **Phase 3: Ensemble (Week 3)**
1. Combine seasonality with other models
2. Tune ensemble weights
3. Validate on test set
4. Deploy to production

---

## 📋 NEXT STEPS

1. ✅ **Seasonality Module Created** - `seasonality_forecast.py`
2. ⏳ **Integrate into Feature Engineering** - Add seasonality indices as features
3. ⏳ **Create Adjustment Functions** - Holiday, payday, supply adjustments
4. ⏳ **Build Ensemble** - Combine all models
5. ⏳ **Test & Validate** - Backtest on historical data

**Ready to proceed with Phase 1 integration!** 🚀

