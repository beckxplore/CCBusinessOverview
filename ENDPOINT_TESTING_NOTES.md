# Daily Product Profitability Endpoint - Testing Notes

## Issue: Only Showing 8 Products

### Possible Causes:

1. **Server Not Restarted**: The endpoint returns 404, which means the server needs to be restarted to pick up the new route.

2. **Query Limitation**: The ClickHouse query might be returning limited results. Check:
   - No LIMIT clause in the query (verified - no LIMIT)
   - Date range might be too narrow
   - Products might be grouped in a way that reduces unique products

3. **Price Matching**: Products without prices in Google Sheets are still included (verified in code), but they will have 0.0 for prices.

4. **Product Name Normalization**: Multiple product name variations might be collapsing into fewer canonical names.

### Debugging Steps:

1. **Restart the server** to register the new endpoint:
   ```bash
   # Stop current server (Ctrl+C)
   # Then restart:
   cd delivery-map-app/backend
   python main.py
   ```

2. **Check the actual query results**:
   ```bash
   cd delivery-map-app/backend
   python check_endpoint.py
   ```

3. **Check server logs** for the logging we added:
   - Look for: "Daily product profitability: X products processed from Y sales records"
   - Look for: "Unique products: X"

4. **Test the endpoint directly**:
   ```bash
   curl "http://localhost:8001/api/products/daily-profitability?date_from=2025-04-01&date_to=2025-04-10"
   ```

### Code Analysis:

- ✅ No LIMIT clause in the query
- ✅ All products from `daily_sales` are added to `daily_products`
- ✅ Products without prices are included (with 0.0 prices)
- ✅ No filtering based on volume or profit

### Next Steps:

1. Restart the server
2. Check the ClickHouse query results directly
3. Verify the date range has sufficient data
4. Check if product name normalization is collapsing products

