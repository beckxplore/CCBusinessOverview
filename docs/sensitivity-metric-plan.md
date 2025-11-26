## Sensitivity Metric Redesign

### Objectives
- Replace the legacy `commission ÷ kg` “sensitivity” proxy with a demand signal rooted in price gaps versus external references.
- Use the historical window **2025‑04‑01 → 2025‑11‑10** to describe how each leader actually priced relative to:
  - Local shop benchmark prices
  - Distribution centre / wholesale prices
- Produce metrics that can feed both persona analysis and the Forecast tab (multiplier inputs).

### Data Sources
| Dataset / API | Purpose | Columns Needed | Access Path |
| --- | --- | --- | --- |
| ClickHouse `orders`, `groups`, `group_deals`, `groups_carts` | Our realised price (`group_price`), volume (`quantity`), leader IDs, daily timestamps. | `created_at`, `group_price`, `quantity`, `group_id`, `leader_id`, `product_id` | `get_clickhouse_client()` query |
| Benchmark API (`/functions/v1/get-benchmark-data`) | External reference prices per product, per day, segmented by `location_group`. | `date`, `product_name`, `location_group`, `price`, `source` | `BENCHMARK_API_URL`, `BENCHMARK_API_KEY` |
| Distribution purchase ledger (`Sales & Purchases - All Data (1).csv`) | Fallback wholesale price if API gaps exist. | `DeliveringDate`, `Product Name`, `PurchasingPrice`, `price` | Local CSV (keep as emergency backup) |

> The benchmark API already returns samples with `location_group` values `distribution-center`, `local-shops`, etc. If we keep the full location list in the query, we can aggregate locally instead of maintaining Google Sheets.

### Product Normalisation
- Canonical product list comes from SGL order history (35 distinct items in window).
- We maintain a mapping object:
  ```ts
  interface ProductAlias {
    canonical: string;
    benchmarkName?: string;      // null when no benchmark coverage
    distributionName?: string;   // null when no wholesale reference
    orderVariants: string[];
  }
  ```
- Initial mapping (derived on 2025‑11‑12):
  - Benchmark aligned: 29/35 products (e.g. `Potato`, `Tomato B`, `Red Onion A`, `My Kishen Mekelesha (2g)`).
  - No benchmark coverage (fallback to distribution): `AL-Hinan flour`, `Apple Mango`, `Moon Coffee Biscuit`, `Red Onion Qelafo`, `Tomato Restaurant Quality`.
  - Mixed case (`Red Onion`, `Red onion ( ሃበሻ )`) resolved by normalising punctuation and matching to `Red onion ( ሃበሻ )` in the API payload.
- Store the mapping in `backend/data/product_aliases.json` (to be added during implementation) and share via a helper so both analysis scripts and API endpoints use the same canonical keys.

### Price Series Construction
1. **Order facts (ClickHouse)**
   ```sql
   SELECT
     toDate(o.created_at)       AS order_date,
     g.created_by               AS leader_id,
     any(u.name)                AS leader_name,
     any(gd.product_name)       AS product_name,
     any(gd.product_id)         AS product_id,
     sum(gc.quantity)           AS total_kg,
     any(gd.group_price)        AS unit_price_etb
   FROM orders o
   …
   WHERE o.created_at BETWEEN '2025-04-01' AND '2025-11-10'
   GROUP BY order_date, leader_id, product_id;
   ```
   - Aggregate per leader/product/day to remove duplicate cart rows.
   - Join against the product alias map to translate `product_name` → `canonical`.

2. **Benchmark references**
   - Call the API in weekly chunks to avoid huge payloads: `[2025‑04‑01, 2025‑04‑30]`, `[2025‑05‑01, …]`, etc (the endpoint happily returns up to ~5k rows per call).
   - For each product/day:
     - `local_price_etb = avg(price)` where `location_group = 'local-shops'`.
     - `distribution_price_etb = avg(price)` where `location_group IN ('distribution-center', 'farm')`. (We can split if we need both metrics separately).
   - If data is missing for a day, interpolate by carrying the most recent value forward up to **7 days**; otherwise flag the gap so downstream views can surface “no benchmark”.

3. **Merge**
   - Left-join order rows to references by `(canonical_product, order_date)`.
   - Produce per-row derived fields:
     ```
     local_gap_etb = local_price_etb - unit_price_etb
     local_gap_pct = local_gap_etb / local_price_etb        // guard division by zero
     distro_gap_etb = distribution_price_etb - unit_price_etb
     distro_gap_pct = distro_gap_etb / distribution_price_etb
     ```
   - Keep track of whether the reference price came from the benchmark API or the CSV fallback (for auditing).

### Sensitivity Metrics (Leader Level)
For each leader (optionally segmented by product or persona):
1. **Volume weighted averages**
   ```
   local_discount_etb      = Σ(local_gap_etb * total_kg) / Σ(total_kg)
   distribution_discount   = Σ(distro_gap_etb * total_kg) / Σ(total_kg)
   local_discount_pct      = Σ(local_gap_pct * total_kg) / Σ(total_kg)
   distribution_discount_pct = …
   ```
   - Positive values = we priced cheaper than the reference.
   - Negative values = we were more expensive.

2. **Elasticity-style slope (optional but recommended)**
   - Aggregate to weekly buckets per leader/product to smooth noise.
   - Run a simple linear regression of `log(total_kg_week)` against `local_gap_pct` (and similarly for distribution). The slope × −1 gives “% volume change per 1% change in price gap”.
   - Store as `local_gap_elasticity` and `distribution_gap_elasticity`.

3. **Composite Sensitivity Index**
   - Represented in ETB to align with the original UI expectation:
     ```
     combined_sensitivity_etb =
         0.6 * local_discount_etb + 0.4 * distribution_discount_etb
     ```
     (Weights configurable; default emphasises local competition while still crediting wholesale constraints.)
   - Also expose components (`local_discount_etb`, `distribution_discount_etb`) so the UI can show both; do **not** collapse the result into a single unlabeled number.

4. **Supporting stats**
   - `coverage_days`: number of days with valid benchmark + distribution data.
   - `gap_std_dev`: standard deviation of `local_gap_etb` to highlight volatility.
   - `%_above_local`: share of volume where our price ≥ local price (signals risk).

### Output Schema (per leader)
```json
{
  "leader_id": "...",
  "leader_name": "...",
  "canonical_product": "Potato",            // optional when aggregated across products
  "total_kg": 12345.0,
  "local_discount_etb": 18.4,
  "distribution_discount_etb": 7.1,
  "combined_sensitivity_etb": 13.3,
  "local_discount_pct": -0.38,
  "distribution_discount_pct": -0.22,
  "local_gap_elasticity": -2.1,
  "distribution_gap_elasticity": -1.6,
  "coverage_days": 140,
  "source_flags": {
    "benchmark_api": true,
    "distribution_api": true,
    "fallback_csv": false
  }
}
```

### Implementation Notes
- **Caching**: benchmark API calls should be cached per `(dateFrom, dateTo)` window in Redis or local JSON to avoid re-fetching thousands of rows during development.
- **Windowing**: the analysis will default to `2025‑04‑01` → `2025‑11‑10`, but expose parameters so we can later compute rolling updates.
- **Backend exposure**: add a `/api/personas/sensitivity` endpoint returning the schema above (either aggregated by leader or product) for the frontend Forecast tab to consume.
- **Frontend display**: replace the existing `Sensitivity: 4 ETB/kg` label with:
  - `Local discount: 18.4 ETB/kg`
  - `Distribution discount: 7.1 ETB/kg`
  - `Combined sensitivity index: 13.3 ETB/kg`
  - Optional tooltip summarising elasticities and warning when benchmarks are missing.

### Open Questions
- Should we weight distribution vs local differently per product category (e.g. staples vs perishables)? For now we use global weights but can derive category-based weights later.
- Do we need to filter orders to Super Group leaders only, or include all personas? The ClickHouse query can filter by `gd.deal_type` if required.
- Benchmark API latency: current tests return ~3k rows per 10-day window. For seven months we should batch monthly to keep request size manageable.

Once the design is approved we can implement:
1. Alias map helper + shared loader.
2. Benchmark fetcher with historical range support + cache.
3. Analysis job (FastAPI endpoint + optional offline script).
4. Frontend updates consuming the new fields.

