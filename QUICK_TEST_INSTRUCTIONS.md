# Quick Test Instructions - Price Forecasting

## 🚀 Start Servers

### Terminal 1 - Backend (Port 8001)
```powershell
cd delivery-map-app/backend
python main.py
```
Wait for: `INFO:     Uvicorn running on http://0.0.0.0:8001`

### Terminal 2 - Frontend (Port 5173)
```powershell
cd delivery-map-app
npm run dev
```
Wait for: `Local: http://localhost:5173/`

## 🌐 Test in Browser

1. **Open**: http://localhost:5173
2. **Navigate**: Click "Profitability" in sidebar
3. **Click Tab**: "Price Forecasting"
4. **Select Product**: Click on a product (e.g., "Red Onion")
5. **View Forecast**: See detailed price prediction

## ✅ What to Check

- [ ] Products list shows with current prices
- [ ] Selecting a product shows forecast details
- [ ] Base forecast (seasonality) displays
- [ ] Adjusted forecast (with market factors) displays
- [ ] Recommendation (BUY/WAIT/HOLD) shows
- [ ] Confidence intervals display
- [ ] Risk indicators show
- [ ] Multi-horizon forecasts (1, 2, 3 months) display
- [ ] Date picker works
- [ ] Horizon selector (7/30/60/90 days) works

## 🔍 Direct API Test

Open in browser:
```
http://localhost:8001/api/forecast/price?product_name=Red%20Onion&current_price=80.0&forecast_horizon_days=30
```

Should return JSON with forecast data.

## 🐛 Troubleshooting

**Backend not starting?**
- Check if port 8001 is free: `netstat -ano | findstr ":8001"`
- Install dependencies: `pip install -r requirements.txt`

**Frontend not starting?**
- Install Node modules: `npm install`
- Check if port 5173 is free

**No forecasts showing?**
- Check browser console (F12) for errors
- Verify backend is running
- Check that products have prices set

## 📊 Expected Results

### For "Red Onion" at 80 ETB:
- **Base Forecast**: ~95-100 ETB (seasonality-based)
- **Adjusted Forecast**: May vary based on holidays/paydays
- **Recommendation**: Likely "BUY NOW" if price expected to rise
- **Confidence**: High/Medium depending on volatility

### Products with Seasonality Data:
- Red Onion
- Tomato
- Potato
- Avocado
- Banana

