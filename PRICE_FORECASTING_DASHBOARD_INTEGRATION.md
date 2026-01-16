# Price Forecasting Dashboard Integration

## Overview
Price forecasting has been integrated into the **Profitability** page as a new tab, allowing users to view price predictions alongside profitability analysis.

## Location
- **Page**: Profitability (Navigation → Profitability)
- **Tab**: "Price Forecasting" (second tab, next to "Profitability Analysis")

## Features

### 1. Product List View
- Shows all products with current prices
- Displays forecast recommendation (BUY NOW / WAIT / HOLD)
- Shows predicted price change percentage
- Color-coded recommendations for quick scanning

### 2. Detailed Forecast View
When a product is selected, displays:

#### Base Forecast (Seasonality)
- Predicted price based on 15-year seasonality data
- Confidence level
- Percentage change from current price

#### Adjusted Forecast (Market Factors)
- Price prediction with market-specific adjustments:
  - Holiday impact
  - Payday risk
  - Supply signals
  - Volatility adjustments

#### Recommendation
- Action: BUY NOW / WAIT / DE-STOCK / HOLD
- Urgency level: High / Medium / Low
- Reasoning explanation

#### Confidence Intervals
- 50% confidence range (most likely)
- 80% confidence range (probable)
- 95% confidence range (possible)

#### Risk Indicators
- Volatility level (High / Medium / Low)
- Manipulation risk percentage
- Supply risk percentage
- Holiday impact percentage

#### Multi-Horizon Forecast
- 1-month forecast with target month name
- 2-month forecast
- 3-month forecast
- Each includes recommendation

## Controls

### Date Selection
- **Forecast Date**: Select the date to base the forecast on (defaults to today)
- **Horizon**: Choose forecast period (7, 30, 60, or 90 days)

## API Integration

### Endpoint
```
GET /api/forecast/price
```

### Parameters
- `product_name`: Product name (required)
- `current_price`: Current market price in ETB (required)
- `current_date`: Date in YYYY-MM-DD format (optional, defaults to today)
- `forecast_horizon_days`: Days ahead to forecast, 1-90 (default: 30)
- `include_adjustments`: Include market adjustments (default: true)

### Response Structure
```json
{
  "product": "Red Onion",
  "current_price": 80.0,
  "current_date": "2024-07-15",
  "base_forecast": {
    "method": "seasonality",
    "predicted_price": 95.0,
    "percent_change": 18.75,
    "seasonality_ratio": 1.19,
    "confidence": "High"
  },
  "adjusted_forecast": {
    "predicted_price": 98.0,
    "percent_change": 22.5,
    "adjustments": {
      "holiday": 0.05,
      "payday": 0.02,
      "supply": -0.01,
      "volatility": 0.01,
      "total": 0.07
    }
  },
  "confidence_intervals": {
    "50%": [92.0, 102.0],
    "80%": [88.0, 108.0],
    "95%": [85.0, 115.0]
  },
  "recommendation": {
    "action": "BUY NOW",
    "sentiment": "Price expected to increase significantly",
    "urgency": "High",
    "color_code": "red",
    "reasoning": "Strong seasonality pattern indicates 18.75% price increase. Combined with holiday demand, total increase expected to be 22.5%.",
    "percent_change": 22.5
  },
  "multi_horizon": {
    "1_month": {
      "predicted_price": 98.0,
      "percent_change": 22.5,
      "recommendation": "BUY NOW",
      "target_month_name": "August"
    },
    "2_month": {
      "predicted_price": 105.0,
      "percent_change": 31.25,
      "recommendation": "BUY NOW",
      "target_month_name": "September"
    },
    "3_month": {
      "predicted_price": 95.0,
      "percent_change": 18.75,
      "recommendation": "HOLD",
      "target_month_name": "October"
    }
  },
  "risk_indicators": {
    "volatility_level": "medium",
    "manipulation_risk": 0.35,
    "supply_risk": 0.25,
    "holiday_impact": 0.05
  }
}
```

## Frontend Components

### Files Created
1. **`delivery-map-app/src/components/Profitability/PriceForecastTab.tsx`**
   - Main component for price forecasting UI
   - Handles product selection, forecast loading, and display

### Files Modified
1. **`delivery-map-app/src/components/Profitability/ProfitabilityPage.tsx`**
   - Added tab system (Profitability Analysis / Price Forecasting)
   - Integrated PriceForecastTab component

2. **`delivery-map-app/src/utils/apiClient.ts`**
   - Added `getPriceForecast()` method to fetch forecasts from backend

## Backend Integration

### Service Layer
- **`delivery-map-app/backend/services/forecast_api.py`**
  - Main forecasting API service
  - Combines seasonality forecasts with market adjustments

- **`delivery-map-app/backend/services/seasonality_forecast.py`**
  - 15-year seasonality-based forecasting
  - Multi-horizon predictions

- **`delivery-map-app/backend/services/feature_engineering.py`**
  - Market feature extraction (holidays, paydays, supply)

- **`delivery-map-app/backend/services/payday_calendar.py`**
  - Ethiopian and Western payday calendar generation

- **`delivery-map-app/backend/services/ethiopian_calendar.py`**
  - Ethiopian calendar conversion utilities

### API Endpoint
- **`delivery-map-app/backend/main.py`** (line ~3337)
  - FastAPI endpoint: `/api/forecast/price`

## Usage Flow

1. Navigate to **Profitability** page
2. Click **"Price Forecasting"** tab
3. View list of products with current prices and recommendations
4. Select a product to see detailed forecast
5. Adjust forecast date and horizon as needed
6. Review:
   - Base seasonality forecast
   - Market-adjusted forecast
   - Confidence intervals
   - Risk indicators
   - Multi-horizon predictions

## Next Steps (Phase 2)

1. **Model Training**
   - Train XGBoost model with 93 features
   - Train SARIMA model for time series
   - Create ensemble model

2. **Enhanced Features**
   - Historical forecast accuracy tracking
   - Forecast comparison charts
   - Export forecasts to CSV
   - Alert system for significant price changes

3. **Integration Points**
   - Link forecasts to procurement planning
   - Integrate with pricing strategy recommendations
   - Add to Strategy page

## Notes

- Forecasts are based on:
  - 15-year historical seasonality data
  - Current market prices
  - Ethiopian and Western payday calendars
  - Holiday calendars
  - Supply indicators (when available)

- Products without current prices will not show forecasts
- Forecast accuracy improves with more historical data
- Recommendations are based on predicted price changes:
  - **BUY NOW**: Price expected to increase >5%
  - **WAIT / DE-STOCK**: Price expected to decrease >5%
  - **HOLD**: Price change expected to be within ±5%

