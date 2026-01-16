# Testing Price Forecasting in Browser

## Quick Start

### 1. Start Backend Server
```powershell
cd delivery-map-app/backend
python main.py
```
Backend will run on: **http://localhost:8001**

### 2. Start Frontend Server
```powershell
cd delivery-map-app
npm run dev
```
Frontend will run on: **http://localhost:5173** (or similar Vite port)

### 3. Access the Dashboard
1. Open browser: **http://localhost:5173**
2. Navigate to: **Profitability** (in sidebar)
3. Click tab: **Price Forecasting**

## Testing Steps

### Test 1: Basic Forecast
1. Go to Profitability → Price Forecasting tab
2. Select a product (e.g., "Red Onion")
3. Verify forecast displays:
   - Current price
   - Base forecast (seasonality)
   - Adjusted forecast (with market factors)
   - Recommendation (BUY/WAIT/HOLD)
   - Confidence intervals
   - Risk indicators

### Test 2: Date Selection
1. Change forecast date using date picker
2. Verify forecast updates
3. Check that predictions change based on date

### Test 3: Horizon Selection
1. Change forecast horizon (7, 30, 60, 90 days)
2. Verify predictions update
3. Check multi-horizon forecasts (1, 2, 3 months)

### Test 4: Multiple Products
1. Select different products
2. Verify each product shows appropriate forecast
3. Check that recommendations differ per product

### Test 5: API Direct Test
Test API endpoint directly:
```
http://localhost:8001/api/forecast/price?product_name=Red%20Onion&current_price=80.0&forecast_horizon_days=30
```

Expected response:
```json
{
  "product": "Red Onion",
  "current_price": 80.0,
  "current_date": "2024-12-XX",
  "base_forecast": {
    "method": "seasonality_relative_velocity",
    "predicted_price": XX.XX,
    "percent_change": XX.X,
    "seasonality_ratio": X.XX,
    "confidence": "High/Medium/Low"
  },
  "adjusted_forecast": {
    "predicted_price": XX.XX,
    "percent_change": XX.X,
    "adjustments": {...}
  },
  "confidence_intervals": {...},
  "recommendation": {...},
  "multi_horizon": {...},
  "risk_indicators": {...}
}
```

## Troubleshooting

### Backend Not Starting
- Check if port 8001 is already in use
- Verify Python dependencies: `pip install -r requirements.txt`
- Check for import errors in console

### Frontend Not Starting
- Check if Node.js is installed: `node --version`
- Install dependencies: `npm install`
- Check for port conflicts (Vite uses 5173 by default)

### API Errors
- Check backend console for error messages
- Verify product name is correct (case-sensitive)
- Check that seasonality data exists for product

### No Forecasts Showing
- Verify products have current prices set
- Check browser console for API errors
- Verify backend is running and accessible

## Expected Behavior

### Without Trained Models
- Uses seasonality-only forecast (Phase 1)
- `uses_trained_model: false` in response
- Still provides full forecast with adjustments

### With Trained Models
- Uses ensemble model (XGBoost + SARIMA + Seasonality)
- `uses_trained_model: true` in response
- Potentially more accurate predictions

## Next Steps After Testing

1. **Train Models** (if not done):
   ```bash
   python train_price_forecast_models.py --all-products
   ```

2. **Compare Forecasts**:
   - Before training (seasonality only)
   - After training (ensemble model)

3. **Test on Historical Data**:
   - Use past dates to verify accuracy
   - Compare predictions vs actual prices

