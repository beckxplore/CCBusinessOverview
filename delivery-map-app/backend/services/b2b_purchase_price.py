"""
B2B Purchase Price Service

Fetches purchase prices from Google Sheets and provides lookup functionality
with next-day offset logic (today's purchase price applies to tomorrow's B2B sales).
"""

import logging
from datetime import date, timedelta
from typing import Dict, Optional, Tuple
from functools import lru_cache
from collections import defaultdict

from services.sheet_data import fetch_raw_sheet_data

logger = logging.getLogger(__name__)


class B2BPurchasePriceService:
    """Service for fetching and caching purchase prices from Google Sheets."""
    
    _instance: Optional['B2BPurchasePriceService'] = None
    _purchase_price_map: Dict[date, Dict[str, float]] = {}
    _product_averages: Dict[str, float] = {}
    _last_fetch_date: Optional[date] = None
    
    def __init__(self):
        """Initialize the purchase price service."""
        self._load_purchase_prices()
    
    @classmethod
    def get_instance(cls) -> 'B2BPurchasePriceService':
        """Get or create singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def _load_purchase_prices(self):
        """Load purchase prices from Google Sheets and build lookup maps."""
        try:
            df = fetch_raw_sheet_data()
            if df is None or df.empty:
                logger.warning("No purchase price data available from Google Sheets")
                return
            
            # Clear existing maps
            self._purchase_price_map.clear()
            self._product_averages.clear()
            
            # Build date-based lookup map and calculate averages
            product_prices: Dict[str, list[float]] = defaultdict(list)
            
            # Import normalize function to avoid circular import
            from main import _normalize_product_name
            
            for _, row in df.iterrows():
                raw_name = str(row.get("Product Name", "")).strip()
                if not raw_name:
                    continue
                
                normalized_name = _normalize_product_name(raw_name)
                if not normalized_name:
                    continue
                
                entry_date = row['date_dt']
                if hasattr(entry_date, 'date'):
                    entry_date = entry_date.date()
                elif isinstance(entry_date, str):
                    from datetime import datetime
                    entry_date = datetime.strptime(entry_date, "%Y-%m-%d").date()
                
                purchase_price = float(row.get("PurchasingPrice", 0.0))
                
                if purchase_price > 0:
                    # Add to date-based map
                    if entry_date not in self._purchase_price_map:
                        self._purchase_price_map[entry_date] = {}
                    self._purchase_price_map[entry_date][normalized_name] = purchase_price
                    
                    # Track for average calculation
                    product_prices[normalized_name].append(purchase_price)
            
            # Calculate averages for each product
            for product_name, prices in product_prices.items():
                if prices:
                    self._product_averages[product_name] = sum(prices) / len(prices)
            
            self._last_fetch_date = date.today()
            logger.info(f"Loaded purchase prices for {len(self._purchase_price_map)} dates, {len(self._product_averages)} products")
            
        except Exception as e:
            logger.error(f"Error loading purchase prices: {e}")
    
    def get_purchase_price_for_sale_date(
        self, 
        product_name: str, 
        sale_date: date
    ) -> Tuple[float, str]:
        """
        Get purchase price for a product on a sale date.
        Uses purchase price from previous day (sale_date - 1 day).
        
        Args:
            product_name: Name of the product
            sale_date: Date of the B2B sale
            
        Returns:
            Tuple of (purchase_price, source_description)
            source_description indicates where the price came from:
            - "exact_date" - found on previous day
            - "latest_before" - latest available price before sale date
            - "average" - average price for product
            - "missing" - no price found
        """
        # Import normalize function to avoid circular import
        from main import _normalize_product_name
        
        # Normalize product name
        normalized_name = _normalize_product_name(product_name)
        if not normalized_name:
            return 0.0, "missing"
        
        # Calculate purchase date (previous day)
        purchase_date = sale_date - timedelta(days=1)
        
        # Try 1: Exact date match (previous day)
        if purchase_date in self._purchase_price_map:
            if normalized_name in self._purchase_price_map[purchase_date]:
                price = self._purchase_price_map[purchase_date][normalized_name]
                return price, "exact_date"
        
        # Try 2: Find latest available price before sale_date
        latest_price = None
        latest_date = None
        for price_date in sorted(self._purchase_price_map.keys(), reverse=True):
            if price_date < sale_date:
                if normalized_name in self._purchase_price_map[price_date]:
                    latest_price = self._purchase_price_map[price_date][normalized_name]
                    latest_date = price_date
                    break
        
        if latest_price is not None:
            return latest_price, f"latest_before_{latest_date}"
        
        # Try 3: Use average price for product
        if normalized_name in self._product_averages:
            return self._product_averages[normalized_name], "average"
        
        # Fallback: No price found
        logger.warning(f"No purchase price found for product '{product_name}' (normalized: '{normalized_name}') on sale date {sale_date}")
        return 0.0, "missing"
    
    def get_purchase_prices_for_date_range(
        self, 
        from_date: date, 
        to_date: date
    ) -> Dict[date, Dict[str, float]]:
        """
        Get purchase prices for a date range.
        Returns prices for dates [from_date - 1, to_date - 1] to cover next-day offset.
        
        Args:
            from_date: Start date of B2B sales
            to_date: End date of B2B sales
            
        Returns:
            Dictionary mapping date -> {product_name: purchase_price}
        """
        # Fetch prices for previous day range
        purchase_from = from_date - timedelta(days=1)
        purchase_to = to_date - timedelta(days=1)
        
        result: Dict[date, Dict[str, float]] = {}
        
        current_date = purchase_from
        while current_date <= purchase_to:
            if current_date in self._purchase_price_map:
                result[current_date] = self._purchase_price_map[current_date].copy()
            current_date += timedelta(days=1)
        
        return result
    
    def refresh_cache(self):
        """Refresh the purchase price cache from Google Sheets."""
        logger.info("Refreshing purchase price cache...")
        self._load_purchase_prices()


def get_b2b_purchase_price_service() -> B2BPurchasePriceService:
    """Get the singleton B2B purchase price service instance."""
    return B2BPurchasePriceService.get_instance()

