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
        use_rest: bool = True
    ) -> Dict[str, Any]:
        """
        Call an MCP tool.
        
        Args:
            tool_name: Name of the tool to call (e.g., 'get_business_overview')
            arguments: Arguments to pass to the tool
            use_rest: If True, use REST API format; if False, use JSON-RPC 2.0
        
        Returns:
            Response data from the MCP server
        """
        try:
            if use_rest:
                # REST API format (ChatGPT compatible)
                url = f"{self.endpoint}/api/tools/{tool_name}"
                response = await self.session.post(url, json=arguments)
            else:
                # JSON-RPC 2.0 format
                url = self.endpoint
                payload = {
                    "jsonrpc": "2.0",
                    "id": "1",
                    "method": "tools/call",
                    "params": {
                        "name": tool_name,
                        "arguments": arguments
                    }
                }
                response = await self.session.post(url, json=payload)
            
            response.raise_for_status()
            data = response.json()
            
            # Handle JSON-RPC response format
            if not use_rest and "result" in data:
                return data["result"]
            
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
    
    async def get_product_level_sales(
        self,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch product-level B2B sales data from MCP endpoint.
        Uses get_product_profitability_ranking which returns aggregated product data.
        
        Args:
            date_from: Start date (YYYY-MM-DD) or None for default
            date_to: End date (YYYY-MM-DD) or None for today
            
        Returns:
            Product-level sales data with items containing:
            - product_name or product_id
            - total_quantity_sold (in units, may need conversion to kg)
            - total_revenue
            - total_cogs
            - order_count
        """
        date_range = format_date_range(date_from, date_to)
        
        # Use get_product_profitability_ranking which returns product-level aggregated data
        try:
            result = await self.call_tool(
                "get_product_profitability_ranking",
                {"date_range": date_range, "limit": 1000}  # Get all products
            )
            
            # Transform the response to match expected format
            items = []
            if "top_performers" in result:
                items.extend(result["top_performers"])
            if "bottom_performers" in result:
                items.extend(result["bottom_performers"])
            
            return {
                "items": items,
                "period": result.get("period", date_range),
                "summary": result.get("summary", {})
            }
        except Exception as e:
            logger.warning(f"get_product_profitability_ranking tool not available: {e}")
            # Return empty structure - we'll handle this in the calling code
            return {
                "items": [],
                "error": f"Product-level sales data not available from MCP endpoint: {str(e)}"
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

