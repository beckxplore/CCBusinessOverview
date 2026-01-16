# 🎯 Ethiopian Agricultural Price Forecasting Strategy
## A Market-Specific Approach for Volatile, Data-Poor Environments

**Version:** 1.0  
**Date:** December 2025  
**Market Context:** Ethiopian Agricultural Commodities  
**Data Available:** 2 years historical price data

---

## 📊 EXECUTIVE SUMMARY

Traditional price forecasting models (ARIMA, LSTM, Prophet) fail in the Ethiopian market due to:
- **High volatility** from simultaneous planting decisions
- **Artificial shortages** created by middlemen
- **Holiday-driven demand spikes** (especially for onion/tomato)
- **Limited data** (2 years) for deep learning models
- **Non-stationary patterns** due to external manipulation

**Our Solution:** A hybrid ensemble model combining:
1. **Market-Specific Features** (holidays, seasonality, supply indicators)
2. **Volatility-Aware Models** (GARCH, quantile regression)
3. **Ensemble Methods** (weighted combination of multiple models)
4. **Anomaly Detection** (identify manipulation patterns)
5. **Confidence Intervals** (not just point forecasts)

---

## 🎯 CORE PRINCIPLES

### 1. **Ethiopian Market Realities**
- Farmers plant simultaneously → supply glut → price crash
- Middlemen hoard → artificial shortage → price spike
- Holidays (especially religious) → demand surge → price increase
- Weather unpredictability → crop failure → price volatility
- Limited cold storage → perishable goods → rapid price changes

### 2. **Forecasting Philosophy**
- **Don't predict exact prices** → Predict price ranges and probabilities
- **Don't ignore volatility** → Model it explicitly
- **Don't assume stationarity** → Use adaptive models
- **Don't ignore context** → Include market-specific features
- **Don't trust single models** → Ensemble multiple approaches

---

## 📈 FEATURE ENGINEERING STRATEGY

### **Category 1: Historical Price Features**

#### 1.1 Lag Features
```
- Price_1d, Price_3d, Price_7d, Price_14d, Price_30d (previous prices)
- Price_change_1d, Price_change_7d (momentum indicators)
- Price_volatility_7d, Price_volatility_30d (rolling std dev)
- Price_max_7d, Price_min_7d (recent range)
```

#### 1.2 Price Patterns
```
- Price_trend_7d (slope of linear regression)
- Price_acceleration (change in trend)
- Price_relative_to_52w_high (current vs historical high)
- Price_relative_to_52w_low (current vs historical low)
- Price_zscore_30d (how many std devs from mean)
```

#### 1.3 Volatility Features
```
- GARCH volatility (time-varying volatility)
- Price_range_7d (max - min)
- Price_cv_30d (coefficient of variation)
- Volatility_regime (high/medium/low based on thresholds)
```

### **Category 2: Seasonality Features**

#### 2.1 15-Year Seasonality Indices (NEW - HIGH PRIORITY)
```
- Current_month_seasonality_index (from 15-year data)
- Next_month_seasonality_index (from 15-year data)
- Seasonality_ratio (next/current)
- Is_high_season (index > 1.0)
- Is_low_season (index < 1.0)
- Seasonality_trend (rising/falling/stable)
- Seasonality_volatility (range of indices for product)
- Relative_seasonality_position (current vs annual range)
```

#### 2.2 Calendar-Based
```
- Month (1-12)
- Week_of_year (1-52)
- Day_of_year (1-365)
- Is_rainy_season (boolean - June-September)
- Is_dry_season (boolean - October-February)
- Is_harvest_season (product-specific)
- Is_planting_season (product-specific)
```

#### 2.3 Cyclical Encoding
```
- Month_sin, Month_cos (cyclical encoding)
- Week_sin, Week_cos (cyclical encoding)
- Day_of_year_sin, Day_of_year_cos (cyclical encoding)
```

### **Category 3: Holiday & Cultural Features**

#### 3.1 Ethiopian Holidays (CRITICAL!)
```
- Is_Ethiopian_New_Year (September 11)
- Is_Meskel (September 27)
- Is_Christmas (January 7)
- Is_Epiphany (January 19)
- Is_Good_Friday (variable)
- Is_Easter (variable)
- Is_Mawlid (variable - Islamic)
- Is_Eid_al_Fitr (variable - Islamic)
- Is_Eid_al_Adha (variable - Islamic)
- Days_to_next_major_holiday
- Days_since_last_major_holiday
- Is_pre_holiday_period (7 days before)
- Is_post_holiday_period (3 days after)
```

#### 3.2 Salary Payday Features (CRITICAL FOR MANIPULATION!)
```
- Is_Ethiopian_calendar_payday (1st of Ethiopian month - ~10 days after Western month start)
- Is_Western_calendar_payday (typically 1st, 15th, or end of month)
- Days_to_next_payday (both calendars)
- Days_since_last_payday (both calendars)
- Is_pre_payday_period (3-5 days before payday - manipulation window)
- Is_post_payday_period (1-3 days after - demand spike)
- Payday_cluster (multiple paydays close together)
- Payday_holiday_overlap (payday + holiday = double impact)
```

#### 3.3 Holiday Intensity
```
- Holiday_demand_multiplier (based on historical data)
- Is_onion_tomato_holiday (high demand products)
- Holiday_cluster (multiple holidays close together)
- Holiday_payday_interaction (holiday + payday = extreme demand)
```

### **Category 4: Supply & Volume Features**

#### 4.1 Volume Indicators
```
- Volume_7d_avg (average volume last 7 days)
- Volume_30d_avg (average volume last 30 days)
- Volume_change_7d (momentum)
- Volume_trend_7d (increasing/decreasing)
- Volume_relative_to_normal (current vs historical avg)
```

#### 4.2 Supply Signals
```
- Volume_spike_detected (sudden increase → potential glut)
- Volume_drop_detected (sudden decrease → potential shortage)
- Volume_volatility (unpredictable supply)
- Supply_glut_indicator (high volume + low price)
- Supply_shortage_indicator (low volume + high price)
```

### **Category 5: Market Structure Features**

#### 5.1 Price Spread Indicators
```
- ChipChip_vs_LocalShop_spread (our price vs Addis Ababa market)
- ChipChip_vs_Farm_spread (our price vs regional farm gate)
- ChipChip_vs_Supermarket_spread (our price vs Addis retail)
- Price_premium_to_farm (how much above farm price)
- Price_discount_to_market (how much below market)
- Farm_price_regional_variance (variance across regions - supply indicator)
- Farm_to_market_transport_cost_estimate (regional farm → Addis)
```

#### 5.2 Market Manipulation Signals (ENHANCED)
```
- Price_spike_without_volume_change (potential manipulation)
- Price_drop_without_volume_increase (potential manipulation)
- Benchmark_price_divergence (our price vs market)
- Price_anomaly_score (statistical outlier detection)
- Pre_holiday_price_spike (manipulation pattern)
- Pre_payday_price_spike (manipulation pattern)
- Holiday_payday_coincidence_manipulation (double manipulation window)
- Volume_price_divergence_score (unusual patterns)
```

### **Category 6: Product-Specific Features**

#### 6.1 Product Characteristics
```
- Product_category (vegetable, fruit, staple)
- Perishability_score (1-10, how quickly it spoils)
- Storage_capability (can it be stored?)
- Substitutability (are there alternatives?)
- Essential_food_item (onion, tomato = high)
```

#### 6.2 Cross-Product Features
```
- Related_product_price_avg (e.g., all onion varieties)
- Substitute_product_price (alternative products)
- Complementary_product_price (products bought together)
```

### **Category 7: External Factors (If Available)**

#### 7.1 Weather Data
```
- NOT AVAILABLE - Will use seasonality proxies instead
- Rainy_season_proxy (June-September indicator)
- Dry_season_proxy (October-February indicator)
```

#### 7.2 Economic Indicators (IF AVAILABLE)
```
- Inflation_rate (if available)
- Currency_exchange_rate (if available)
- Fuel_price (affects transport costs - if available)
- Input_cost_index (fertilizer, seeds - if available)
```

#### 7.3 Calendar & Payday Features (AVAILABLE)
```
- Ethiopian_month_start (payday indicator)
- Western_month_start (payday indicator)
- Western_month_mid (mid-month payday)
- Western_month_end (end-of-month payday)
- Payday_frequency (how many paydays in period)
- Payday_density (paydays per week)
```

---

## 🤖 MODEL ARCHITECTURE

### **Ensemble Approach: 6 Models + Weighted Combination**

#### **Model 1: Seasonality Relative Velocity (NEW - HIGH PRIORITY)**
- **Purpose:** Use 15-year historical seasonality patterns
- **Method:** P_next = P_current × (I_next / I_current)
- **Features:** Seasonality indices from 15 years of external data
- **Strengths:** Proven long-term patterns, simple and interpretable
- **Weaknesses:** Doesn't account for short-term volatility or manipulation
- **Weight:** 25% (HIGH - based on 15 years of data)
- **Data Source:** External 15-year seasonality indices

#### **Model 2: Seasonal ARIMA with Holiday Dummies (SARIMA-H)**
- **Purpose:** Capture seasonality and trends from our data
- **Features:** Historical prices + holiday indicators
- **Strengths:** Good for regular patterns
- **Weaknesses:** Struggles with volatility spikes
- **Weight:** 15%

#### **Model 3: GARCH Volatility Model**
- **Purpose:** Model time-varying volatility
- **Features:** Price returns, volatility clustering
- **Strengths:** Captures volatility regimes
- **Weaknesses:** Doesn't predict direction
- **Weight:** 10%

#### **Model 4: XGBoost with Market Features**
- **Purpose:** Capture non-linear relationships
- **Features:** All engineered features (100+) + seasonality indices
- **Strengths:** Handles complex interactions, can combine seasonality with market features
- **Weaknesses:** Can overfit with limited data
- **Weight:** 25%

#### **Model 5: Quantile Regression Forest**
- **Purpose:** Predict price distributions, not just means
- **Features:** Historical prices + key features + seasonality
- **Strengths:** Provides confidence intervals
- **Weaknesses:** Computationally expensive
- **Weight:** 15%

#### **Model 6: Anomaly-Aware LSTM**
- **Purpose:** Detect manipulation patterns
- **Features:** Price sequences + volume sequences
- **Strengths:** Learns temporal patterns
- **Weaknesses:** Needs more data (2 years might be tight)
- **Weight:** 10%

### **Ensemble Combination Strategy**

```python
# Pseudo-code
final_forecast = (
    0.25 * seasonality_forecast +      # 15-year data (HIGH WEIGHT)
    0.15 * sarima_forecast +
    0.10 * garch_forecast +
    0.25 * xgboost_forecast +          # Can incorporate seasonality as feature
    0.15 * quantile_forecast +
    0.10 * lstm_forecast
)

# Adjust weights based on recent performance
# Seasonality model gets high weight due to 15 years of external validation
# XGBoost can learn to combine seasonality with market-specific features
```

### **Hybrid Approach: Seasonality + Market Features**

The seasonality model provides a strong baseline, but we enhance it with market-specific features:

1. **Base Forecast:** Seasonality Relative Velocity
2. **Adjustments:**
   - Holiday impact multiplier
   - Payday manipulation risk
   - Volume-based supply signals
   - Benchmark price spreads
   - Recent volatility

```python
# Enhanced forecast combining seasonality with market features
base_forecast = seasonality_forecast

# Apply market-specific adjustments
holiday_adjustment = calculate_holiday_impact(current_date)
payday_adjustment = calculate_payday_risk(current_date)
supply_adjustment = calculate_supply_signal(volume_data)

enhanced_forecast = base_forecast * (1 + holiday_adjustment + payday_adjustment + supply_adjustment)
```

---

## 📊 FORECASTING OUTPUT FORMAT

### **Not Just Point Forecasts - Provide:**

1. **Point Forecast** (most likely price)
2. **Confidence Intervals:**
   - 50% interval (likely range)
   - 80% interval (probable range)
   - 95% interval (possible range)
3. **Volatility Forecast** (expected price volatility)
4. **Risk Indicators:**
   - High volatility warning
   - Manipulation risk score
   - Supply shortage risk
   - Holiday impact multiplier
5. **Scenario Forecasts:**
   - Best case (low price)
   - Base case (expected)
   - Worst case (high price)

### **Example Output:**
```json
{
  "product": "Red Onion A",
  "forecast_date": "2025-12-15",
  "forecast_horizon_days": 7,
  "point_forecast": 45.50,
  "confidence_intervals": {
    "50%": [42.00, 49.00],
    "80%": [38.00, 53.00],
    "95%": [35.00, 58.00]
  },
  "volatility_forecast": 0.15,
  "risk_indicators": {
    "volatility_level": "high",
    "manipulation_risk": 0.25,
    "supply_shortage_risk": 0.30,
    "holiday_impact": 1.15
  },
  "scenarios": {
    "best_case": 38.00,
    "base_case": 45.50,
    "worst_case": 58.00
  },
  "model_contributions": {
    "sarima": 0.20,
    "garch": 0.15,
    "xgboost": 0.30,
    "quantile": 0.20,
    "lstm": 0.15
  }
}
```

---

## 🔍 ANOMALY DETECTION & MANIPULATION IDENTIFICATION

### **Patterns to Detect:**

1. **Artificial Shortage (Pre-Holiday/Payday Manipulation):**
   - Price spike + Volume drop (unusual)
   - Price spike + No volume change (suspicious)
   - Price spike 3-7 days before holiday/payday (manipulation window)
   - Benchmark prices don't match (divergence)
   - **CRITICAL:** Pre-holiday + Pre-payday = double manipulation risk

2. **Supply Glut:**
   - Price drop + Volume spike (normal)
   - Price drop + Volume increase + Extended period (glut)
   - Post-harvest period (seasonal glut)

3. **Holiday Manipulation:**
   - Price spike before holiday + No volume increase
   - Price stays high after holiday (unusual)
   - Price spike before payday (artificial demand creation)

4. **Payday Manipulation (NEW):**
   - Price spike 3-5 days before payday (middlemen hoarding)
   - Price spike on payday (artificial shortage)
   - Price remains high after payday (unusual - should normalize)

5. **Coordination Patterns:**
   - Multiple products spike simultaneously (coordinated)
   - Price movements don't match fundamentals
   - Holiday + Payday overlap = extreme manipulation risk

### **Anomaly Score Calculation (UPDATED):**
```
anomaly_score = (
    0.25 * price_volatility_anomaly +
    0.25 * volume_price_divergence +
    0.15 * benchmark_divergence +
    0.15 * pre_holiday_manipulation_pattern +
    0.10 * pre_payday_manipulation_pattern +
    0.10 * holiday_payday_overlap_risk
)
```

---

## 📅 HOLIDAY & PAYDAY CALENDAR INTEGRATION

### **Critical Ethiopian Holidays (Demand Impact)**

#### **High Impact (Onion/Tomato Demand 2-3x):**
- Ethiopian New Year (September 11)
- Christmas (January 7)
- Easter (variable)
- Good Friday (variable)

#### **Medium Impact (Demand 1.5x):**
- Epiphany (January 19)
- Meskel (September 27)
- Mawlid (variable)

#### **Low Impact (Demand 1.2x):**
- Other religious holidays

### **Salary Payday Calendar (CRITICAL FOR MANIPULATION)**

#### **Ethiopian Calendar Paydays:**
- 1st of each Ethiopian month (~10 days after Western month start)
- **Manipulation Window:** 3-5 days before payday
- **Demand Spike:** Payday + 1-2 days after

#### **Western Calendar Paydays:**
- 1st of month (common)
- 15th of month (mid-month)
- End of month (last day or last weekday)
- **Manipulation Window:** 3-5 days before payday

#### **Payday Impact:**
- **Demand Increase:** 1.3-1.5x normal (people have money)
- **Manipulation Risk:** HIGH (middlemen know people have money)
- **Price Spike:** 10-20% above normal (artificial shortage)

### **Holiday & Payday Feature Engineering:**
```python
# Days to next major holiday
days_to_holiday = calculate_days_to_next_holiday(date)

# Days to next payday (both calendars)
days_to_ethiopian_payday = calculate_days_to_ethiopian_payday(date)
days_to_western_payday = calculate_days_to_western_payday(date)

# Holiday intensity (based on historical data)
holiday_intensity = {
    "Ethiopian New Year": 2.5,
    "Christmas": 2.8,
    "Easter": 2.3,
    # ... etc
}

# Pre-holiday period (7 days before)
is_pre_holiday = days_to_holiday <= 7

# Pre-payday manipulation window (3-5 days before)
is_pre_payday_manipulation = (
    (days_to_ethiopian_payday <= 5 and days_to_ethiopian_payday >= 3) or
    (days_to_western_payday <= 5 and days_to_western_payday >= 3)
)

# Post-holiday period (3 days after)
is_post_holiday = days_since_holiday <= 3

# Post-payday demand period (1-3 days after)
is_post_payday = (
    (days_since_ethiopian_payday <= 3) or
    (days_since_western_payday <= 3)
)

# CRITICAL: Holiday + Payday overlap
is_holiday_payday_overlap = (
    is_pre_holiday and is_pre_payday_manipulation
) or (
    is_post_holiday and is_post_payday
)

# Manipulation risk multiplier
manipulation_risk_multiplier = 1.0
if is_pre_holiday:
    manipulation_risk_multiplier *= 1.3
if is_pre_payday_manipulation:
    manipulation_risk_multiplier *= 1.4
if is_holiday_payday_overlap:
    manipulation_risk_multiplier *= 1.8  # Extreme risk
```

---

## 🎯 MODEL TRAINING STRATEGY

### **Data Splitting:**
- **Training:** First 18 months (75%)
- **Validation:** Next 4 months (17%)
- **Test:** Last 2 months (8%)

### **Cross-Validation:**
- Use **Time Series Cross-Validation** (not random split)
- Walk-forward validation (train on past, test on future)
- Respect temporal order

### **Hyperparameter Tuning:**
- Use **Optuna** or **Hyperopt** for automated tuning
- Focus on models that generalize well (avoid overfitting)
- Use validation set for early stopping

### **Model Evaluation Metrics:**
1. **MAE** (Mean Absolute Error) - primary metric
2. **RMSE** (Root Mean Squared Error) - penalizes large errors
3. **MAPE** (Mean Absolute Percentage Error) - relative error
4. **Coverage** (how often true price falls in confidence interval)
5. **Pinball Loss** (for quantile forecasts)

---

## 🚀 IMPLEMENTATION PHASES

### **Phase 1: Feature Engineering (Week 1-2)**
- ✅ Implement all feature engineering functions
- ✅ Create holiday calendar
- ✅ Build feature pipeline
- ✅ Validate feature quality

### **Phase 2: Baseline Models (Week 3-4)**
- ✅ Implement SARIMA
- ✅ Implement simple XGBoost
- ✅ Baseline performance evaluation

### **Phase 3: Advanced Models (Week 5-6)**
- ✅ Implement GARCH
- ✅ Implement Quantile Regression
- ✅ Implement LSTM (if data allows)

### **Phase 4: Ensemble & Tuning (Week 7-8)**
- ✅ Build ensemble combination
- ✅ Tune model weights
- ✅ Optimize hyperparameters

### **Phase 5: Anomaly Detection (Week 9)**
- ✅ Implement anomaly detection
- ✅ Build manipulation risk scoring

### **Phase 6: Production Integration (Week 10)**
- ✅ API endpoint
- ✅ Dashboard integration
- ✅ Monitoring & alerts

---

## 📋 DATA REQUIREMENTS CHECKLIST

### **✅ Already Available:**
- [x] Historical prices (2 years)
- [x] Volume data (2 years)
- [x] Benchmark prices (local shop - Addis Ababa, farm - regional, supermarket - Addis)
- [x] Product names
- [x] Dates
- [x] **Market Context:** Addis Ababa market prices, regional farm prices

### **✅ Confirmed (From Your Answers):**
- [x] **No Weather Data** - Will use seasonality proxies
- [x] **Market Structure:** Addis Ababa market, regional farms
- [x] **Manipulation Patterns:** Around holidays AND paydays (both calendars)
- [x] **Use Cases:** Procurement planning & pricing strategy

### **❓ Need to Confirm/Provide:**
- [ ] **Ethiopian Holiday Calendar** (exact dates for variable holidays: Easter, Good Friday, Islamic holidays)
- [ ] **Ethiopian Calendar Payday Dates** (1st of each Ethiopian month - need exact dates)
- [ ] **Western Calendar Payday Pattern** (1st, 15th, end of month? - confirm pattern)
- [ ] **Product Seasonality Data** (planting/harvest seasons per product)
- [ ] **Product Categories** (perishability, storage capability, essential food items)
- [ ] **Historical Anomaly Labels** (if you've identified specific manipulation periods)

### **💡 Nice to Have (Not Critical):**
- [ ] Economic indicators (inflation, exchange rates - if available)
- [ ] Transportation cost data (farm to Addis)
- [ ] Government price interventions (if any)

---

## 🎓 MODEL SELECTION RATIONALE

### **Why Not Pure Deep Learning?**
- Only 2 years of data (~730 days)
- Deep learning needs 1000s of samples
- Risk of overfitting

### **Why Ensemble?**
- Different models capture different patterns
- Reduces risk of model failure
- Provides robustness

### **Why GARCH?**
- Ethiopian market has volatility clustering
- Prices are more volatile after big moves
- GARCH models this explicitly

### **Why Quantile Regression?**
- Business needs to know risk, not just expected value
- "What's the worst case?" is critical for planning
- Provides confidence intervals naturally

### **Why XGBoost?**
- Handles 100+ features well
- Captures non-linear relationships
- Good with limited data (better than deep learning)

---

## 🔮 FUTURE ENHANCEMENTS

### **Phase 2 Features:**
1. **Real-time Learning:** Update models daily as new data arrives
2. **External Data Integration:** Weather APIs, economic APIs
3. **Regional Models:** Different models for different regions
4. **Product Clustering:** Group similar products for better forecasts
5. **Causal Inference:** Identify true drivers vs correlations

### **Phase 3 Features:**
1. **What-If Scenarios:** "What if there's a drought?"
2. **Intervention Modeling:** "What if we increase supply?"
3. **Market Making:** Optimal pricing based on forecasts
4. **Risk Management:** Portfolio-level risk analysis

---

## 📊 SUCCESS METRICS

### **Forecast Accuracy:**
- **Target MAE:** < 10% of average price
- **Target Coverage:** 80% interval should contain true price 80% of time
- **Target Direction Accuracy:** > 60% (predicting up/down correctly)

### **Business Impact:**
- **Procurement Optimization:** Reduce costs by 5-10%
- **Inventory Management:** Reduce stockouts by 20%
- **Pricing Strategy:** Increase margins by 2-5%

---

## ✅ ANSWERS RECEIVED & INCORPORATED

### **Your Answers:**
1. ✅ **No Weather Data** - Strategy updated to work without it
2. ✅ **Market Structure:** Addis Ababa market prices, regional farm benchmark prices
3. ✅ **Manipulation Patterns:** Around Ethiopian holidays AND salary paydays (both Ethiopian & Western calendars)
4. ✅ **Use Cases:** Procurement planning & pricing strategy

### **Strategy Updates Based on Your Answers:**
- ✅ Added **Salary Payday Features** (Category 3.2) - critical for manipulation detection
- ✅ Enhanced **Manipulation Detection** to include pre-payday patterns
- ✅ Updated **Anomaly Detection** to flag holiday+payday overlaps
- ✅ Focused on **Procurement & Pricing** use cases (not inventory management)
- ✅ Removed weather dependencies, using seasonality proxies instead
- ✅ Noted regional farm prices vs Addis market structure

## ❓ REMAINING QUESTIONS

To complete Phase 1 implementation, I still need:

1. **Ethiopian Holiday Calendar:** Exact dates for variable holidays:
   - Easter 2024, 2025 (variable)
   - Good Friday 2024, 2025 (variable)
   - Islamic holidays (Mawlid, Eid al-Fitr, Eid al-Adha) 2024, 2025

2. **Payday Calendar:**
   - Ethiopian calendar: 1st of each Ethiopian month dates for 2024-2025
   - Western calendar: Which pattern? (1st only? 1st + 15th? End of month?)

3. **Product Seasonality:** When is each product typically:
   - Planted?
   - Harvested?
   - In peak season?

4. **Product Categories:** Can you categorize products by:
   - Perishability (high/medium/low)
   - Storage capability (yes/no)
   - Essential food item (yes/no - onion/tomato = yes)

5. **Priority Products:** Which products should we start with? (I assume Red Onion A, Tomato?)

6. **Historical Manipulation Periods:** Have you identified specific dates/periods where manipulation occurred? (This would help train the anomaly detector)

---

## 🎯 NEXT STEPS

### **Phase 1 Ready to Start!**

Based on your answers, I've updated the strategy to include:
- ✅ Salary payday features (critical!)
- ✅ Enhanced manipulation detection
- ✅ Holiday+payday overlap patterns
- ✅ Focus on procurement & pricing use cases

### **Before Starting Phase 1, Need:**

1. **Payday Calendar** (most critical):
   - Ethiopian calendar payday dates (1st of each month)
   - Western calendar payday pattern confirmation

2. **Holiday Calendar** (if available):
   - Variable holiday dates (Easter, Good Friday, Islamic holidays)
   - If not available, we can estimate from historical price spikes

3. **Product Priority List:**
   - Which 3-5 products to start with? (Red Onion A, Tomato, Potato?)

4. **Product Categories** (can be done in parallel):
   - Perishability, storage, essential food classification

### **Can Start Phase 1 With:**
- ✅ Historical price/volume data (already have)
- ✅ Basic holiday calendar (fixed dates we know)
- ✅ Payday pattern (once you confirm)
- ✅ Product list (we can infer categories from data)

**Ready to begin Phase 1 (Feature Engineering) once you provide payday calendar!** 🚀

---

**Ready to build something that actually works for the Ethiopian market!** 🚀

