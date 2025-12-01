"""
B2B MCP Client Service

Handles communication with the Supabase MCP analytics server endpoint.
Supports both JSON-RPC 2.0 and REST API formats.
"""

import os
import httpx
import logging
from typing import Dict, Any, Optional
from datetime import date, timedelta
from functools import lru_cache
from datetime import datetime

logger = logging.getLogger(__name__)


class B2BMCPClient:
    """Client for communicating with B2B MCP analytics server."""
    
    def __init__(self, endpoint: Optional[str] = None, jwt_token: Optional[str] = None):
        """
        Initialize B2B MCP client.
        
        Args:
            endpoint: MCP endpoint URL (defaults to env var)
            jwt_token: JWT authentication token (defaults to env var)
        """
        self.endpoint = endpoint or os.getenv('B2B_MCP_ENDPOINT')
        self.jwt_token = jwt_token or os.getenv('B2B_MCP_JWT_TOKEN')
        
        if not self.endpoint:
            raise ValueError("B2B_MCP_ENDPOINT environment variable is required")
        if not self.jwt_token:
            raise ValueError("B2B_MCP_JWT_TOKEN environment variable is required")
        
        # Ensure endpoint doesn't have trailing slash
        self.endpoint = self.endpoint.rstrip('/')
        
        self.session = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "Authorization": f"Bearer {self.jwt_token}",
                "Content-Type": "application/json"
            }
        )
    
    async def call_tool(
        self, 
        tool_name: str, 
        arguments: Dict[str, Any],
        use_rest: bool = False
    ) -> Dict[str, Any]:
        """
        Call an MCP tool using JSON-RPC 2.0 format (Product Orders MCP).
        
        Args:
            tool_name: Name of the tool to call (e.g., 'getDailyProductOrders')
            arguments: Arguments to pass to the tool
            use_rest: If True, use REST API format; if False, use JSON-RPC 2.0 (default)
        
        Returns:
            Response data from the MCP server
        """
        try:
            if use_rest:
                # REST API format (ChatGPT compatible) - fallback for old endpoints
                url = f"{self.endpoint}/api/tools/{tool_name}"
                response = await self.session.post(url, json=arguments)
            else:
                # JSON-RPC 2.0 format (used by Product Orders MCP)
                url = self.endpoint
                payload = {
                    "jsonrpc": "2.0",
                    "id": "1",
                    "method": tool_name,  # Direct method name (e.g., "getDailyProductOrders")
                    "params": arguments
                }
                response = await self.session.post(url, json=payload)
            
            response.raise_for_status()
            data = response.json()
            
            # Handle JSON-RPC response format
            if "result" in data:
                result = data["result"]
                # The Product Orders MCP returns the data directly in result
                # It could be a list or a dict with data
                return result
            elif "error" in data:
                error_info = data["error"]
                error_msg = error_info.get("message", str(error_info)) if isinstance(error_info, dict) else str(error_info)
                raise Exception(f"MCP API error: {error_msg}")
            
            # If no result/error, return the whole response (might be direct data)
            return data
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error calling {tool_name}: {e.response.status_code} - {e.response.text}")
            raise Exception(f"MCP API error: {e.response.status_code} - {e.response.text}")
        except httpx.RequestError as e:
            logger.error(f"Request error calling {tool_name}: {str(e)}")
            raise Exception(f"Failed to connect to MCP endpoint: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error calling {tool_name}: {str(e)}")
            raise
    
    async def get_daily_sales_data(
        self,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch daily transaction-level B2B sales data from Product Orders MCP endpoint.
        Uses getDailyProductOrders which provides daily product order statistics grouped by date, product, and customer type.
        
        Args:
            date_from: Start date (YYYY-MM-DD) or None for default
            date_to: End date (YYYY-MM-DD) or None for today
            
        Returns:
            Daily sales data with items containing:
            - product_name
            - order_date (YYYY-MM-DD) - delivery date or order date
            - quantity_sold (total quantity for that day/product/customer_type)
            - total_revenue (total revenue for that day/product/customer_type)
            - unit_price (average price per unit for that day/product/customer_type)
            - number_of_orders
            - customer_type
        """
        date_range = format_date_range(date_from, date_to)
        
        # Use getDailyProductOrders from the Product Orders MCP
        try:
            result = await self.call_tool(
                "getDailyProductOrders",
                {
                    "startDate": date_range["from"],
                    "endDate": date_range["to"]
                },
                use_rest=False  # Use JSON-RPC 2.0 format
            )
            
            # Transform the response to match expected format
            # The Product Orders MCP returns an array of daily product orders
            # The JSON-RPC result could be a list directly, or wrapped in a dict
            items = []
            
            # Handle different response formats
            if isinstance(result, list):
                # Direct list of items
                data_list = result
            elif isinstance(result, dict):
                # Could be wrapped in a dict - check for common keys
                if "data" in result:
                    data_list = result["data"]
                elif "items" in result:
                    data_list = result["items"]
                elif "orders" in result:
                    data_list = result["orders"]
                else:
                    # Try to extract list from dict values
                    # If it's a dict with array-like structure, get the first list value
                    list_values = [v for v in result.values() if isinstance(v, list)]
                    if list_values:
                        data_list = list_values[0]
                    else:
                        logger.warning(f"Could not find list data in dict result: {list(result.keys())}")
                        data_list = []
            else:
                logger.warning(f"Unexpected response type from getDailyProductOrders: {type(result)}")
                data_list = []
            
            # Process the list of items
            for row in data_list:
                # Map the MCP response structure to our expected format
                # Each row is already aggregated by date + product + customer_type
                items.append({
                    "product_name": row.get("product_name", ""),
                    "product_id": row.get("product_id"),
                    "sale_date": row.get("order_date"),  # Use order_date as sale_date
                    "order_date": row.get("order_date"),
                    "quantity_kg": float(row.get("quantity_sold", 0.0)),  # quantity_sold from MCP
                    "quantity": float(row.get("quantity_sold", 0.0)),  # Alias
                    "quantity_sold": float(row.get("quantity_sold", 0.0)),
                    "total_revenue": float(row.get("total_revenue", 0.0)),
                    "revenue": float(row.get("total_revenue", 0.0)),  # Alias for compatibility
                    "unit_price": float(row.get("unit_price", 0.0)),
                    "selling_price": float(row.get("unit_price", 0.0)),  # unit_price is average price per unit
                    "price": float(row.get("unit_price", 0.0)),  # Alias
                    "number_of_orders": int(row.get("number_of_orders", 0)),
                    "order_count": int(row.get("number_of_orders", 0)),  # Alias
                    "customer_type": row.get("customer_type"),
                    "customer_type_id": row.get("customer_type_id")
                })
            
            logger.info(f"Retrieved {len(items)} daily product order records from Product Orders MCP")
            return {
                "items": items,
                "period": date_range,
                "summary": {
                    "total_items": len(items),
                    "date_range": date_range
                }
            }
                
        except Exception as e:
            logger.error(f"Failed to get daily product orders from Product Orders MCP: {e}")
            return {
                "items": [],
                "period": date_range,
                "error": f"Daily transaction-level data not available: {str(e)}"
            }
    
    async def get_product_level_sales(
        self,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch product-level B2B sales data by aggregating daily product orders.
        Since the new Product Orders MCP only provides daily data, we aggregate it by product.
        
        Args:
            date_from: Start date (YYYY-MM-DD) or None for default
            date_to: End date (YYYY-MM-DD) or None for today
            
        Returns:
            Product-level sales data with items containing:
            - product_name
            - total_quantity_sold (in kg)
            - total_revenue
            - order_count
        """
        date_range = format_date_range(date_from, date_to)
        
        # Get daily data and aggregate by product
        try:
            daily_data = await self.get_daily_sales_data(date_from, date_to)
            
            if not daily_data or "items" not in daily_data or len(daily_data.get("items", [])) == 0:
                return {
                    "items": [],
                    "period": date_range,
                    "error": "No daily product order data available"
                }
            
            # Aggregate daily data by product
            from collections import defaultdict
            product_aggregates = defaultdict(lambda: {
                "product_name": "",
                "product_id": None,
                "total_quantity_sold": 0.0,
                "total_revenue": 0.0,
                "order_count": 0
            })
            
            for item in daily_data["items"]:
                product_name = item.get("product_name")
                if not product_name:
                    continue
                
                prod = product_aggregates[product_name]
                prod["product_name"] = product_name
                prod["product_id"] = item.get("product_id")
                prod["total_quantity_sold"] += float(item.get("quantity_sold") or item.get("quantity_kg") or 0.0)
                prod["total_revenue"] += float(item.get("total_revenue") or item.get("revenue") or 0.0)
                prod["order_count"] += int(item.get("number_of_orders") or item.get("order_count") or 0)
            
            # Convert to list format
            items = []
            for product_name, data in product_aggregates.items():
                items.append({
                    "product_name": product_name,
                    "product_id": data["product_id"],
                    "total_quantity_sold": round(data["total_quantity_sold"], 2),
                    "total_revenue": round(data["total_revenue"], 2),
                    "order_count": data["order_count"]
                })
            
            # Sort by revenue descending
            items.sort(key=lambda x: x["total_revenue"], reverse=True)
            
            return {
                "items": items,
                "period": date_range,
                "summary": {
                    "total_products": len(items),
                    "total_revenue": sum(item["total_revenue"] for item in items),
                    "total_quantity": sum(item["total_quantity_sold"] for item in items)
                }
            }
        except Exception as e:
            logger.error(f"Failed to get product-level sales data: {e}")
            return {
                "items": [],
                "period": date_range,
                "error": f"Product-level sales data not available: {str(e)}"
            }
    
    async def close(self):
        """Close the HTTP client session."""
        await self.session.aclose()
    
    def __del__(self):
        """Cleanup on deletion."""
        try:
            # Note: This is a fallback; proper cleanup should use async context manager
            pass
        except:
            pass


# Singleton instance
_client_instance: Optional[B2BMCPClient] = None


def get_b2b_mcp_client() -> B2BMCPClient:
    """Get or create the singleton B2B MCP client instance."""
    global _client_instance
    if _client_instance is None:
        _client_instance = B2BMCPClient()
    return _client_instance


def format_date_range(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    default_days: int = 30
) -> Dict[str, str]:
    """
    Format date range for MCP API calls.
    
    Args:
        date_from: Start date (YYYY-MM-DD) or None for default
        date_to: End date (YYYY-MM-DD) or None for today
        default_days: Default number of days to look back if date_from is None
    
    Returns:
        Dictionary with 'from' and 'to' date strings
    """
    if date_to is None:
        date_to = date.today().isoformat()
    
    if date_from is None:
        date_from = (date.today() - timedelta(days=default_days)).isoformat()
    
    return {
        "from": date_from,
        "to": date_to
    }

