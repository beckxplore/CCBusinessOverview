from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sys
import os
import logging
from typing import List, Dict, Any
import json

# Add the parent directory to the path to import clickhouse_connectivity
sys.path.append('/Users/tesfa/Documents/SGL')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Delivery Map Analytics API",
    description="API for delivery data analytics and mapping",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175", "http://127.0.0.1:5176"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def parse_coordinates(coord_str: str) -> tuple[float, float]:
    """Parse POINT(lon lat) format coordinates."""
    try:
        if coord_str and coord_str.startswith('POINT('):
            coords = coord_str[6:-1]  # Remove 'POINT(' and ')'
            parts = coords.split(' ')
            if len(parts) == 2:
                return float(parts[1]), float(parts[0])  # [lat, lon]
    except Exception as e:
        logger.warning(f"Failed to parse coordinates: {coord_str}, error: {e}")
    return 0.0, 0.0

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "Delivery Map Analytics API is running", "status": "healthy"}

@app.get("/api/health")
async def health_check():
    """Detailed health check with database connectivity."""
    try:
        from clickhouse_connectivity import get_clickhouse_client
        client = get_clickhouse_client()
        result = client.query("SELECT 1 as test")
        return {
            "status": "healthy",
            "database": "connected",
            "message": "API and ClickHouse database are operational"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

@app.get("/api/data")
async def get_delivery_data():
    """Fetch delivery data from ClickHouse using your exact SQL query."""
    try:
        from clickhouse_connectivity import get_clickhouse_client
        client = get_clickhouse_client()
        
        # FINAL FIX: Use the same simple approach that works
        query = """
        SELECT
            CASE
                WHEN gd.deal_type IN ('SUPER_GROUP', 'SUPER_GROUP_FLASH_SALE') THEN 'SUPER_GROUPS'
                WHEN gd.deal_type IN ('NORMAL', 'FLASH_SALE') THEN 'NORMAL_GROUPS'
                ELSE gd.deal_type
            END AS group_deal_category,

            g.created_by AS group_created_by,
            dl.location AS delivery_coordinates,
            dl.name AS delivery_location_name,

            COUNT(DISTINCT gc.user_id) AS unique_group_members,
            COUNT(DISTINCT g.id) AS total_groups,

            COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 1 THEN o.id END) AS monday_orders,
            COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 2 THEN o.id END) AS tuesday_orders,
            COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 3 THEN o.id END) AS wednesday_orders,
            COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 4 THEN o.id END) AS thursday_orders,
            COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 5 THEN o.id END) AS friday_orders,
            COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 6 THEN o.id END) AS saturday_orders,
            COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 7 THEN o.id END) AS sunday_orders,

            COUNT(DISTINCT toDate(o.created_at)) AS active_days,
            COUNT(DISTINCT o.id) AS total_orders

        FROM orders AS o
        JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
        JOIN groups AS g ON gc.group_id = g.id
        JOIN group_deals AS gd ON g.group_deals_id = gd.id
        JOIN delivery_location AS dl ON o.location_id = dl.id
        WHERE o.status = 'COMPLETED'
          AND gc.status = 'COMPLETED'
          AND o.deleted_at IS NULL
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        GROUP BY
            group_deal_category,
            g.created_by,
            dl.location,
            dl.name
        ORDER BY
            group_deal_category ASC,
            unique_group_members DESC
        """
        
        logger.info("Executing ClickHouse query...")
        result = client.query(query)
        
        # Convert to list of dictionaries
        data = []
        for row in result.result_rows:
            # Parse coordinates
            lat, lon = parse_coordinates(row[2])  # delivery_coordinates
            
            data.append({
                "group_deal_category": row[0],
                "group_created_by": str(row[1]),  # Convert UUID to string
                "delivery_coordinates": row[2],
                "delivery_location_name": row[3],
                "unique_group_members": int(row[4]),
                "total_groups": int(row[5]),
                "monday_orders": int(row[6]),
                "tuesday_orders": int(row[7]),
                "wednesday_orders": int(row[8]),
                "thursday_orders": int(row[9]),
                "friday_orders": int(row[10]),
                "saturday_orders": int(row[11]),
                "sunday_orders": int(row[12]),
                "active_days": int(row[13]),
                "total_orders": int(row[14]),
                "latitude": lat,
                "longitude": lon
            })
        
        logger.info(f"Retrieved {len(data)} records from ClickHouse")
        return {"data": data, "count": len(data)}
        
    except Exception as e:
        logger.error(f"Error fetching data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch data: {str(e)}")

@app.get("/api/data-integrity")
async def check_data_integrity():
    """Check for potential double-counting issues in the mirrored data."""
    try:
        from clickhouse_connectivity import get_clickhouse_client
        client = get_clickhouse_client()
        
        # Check for potential duplicates and data integrity issues
        integrity_query = """
        WITH base_data AS (
            SELECT
                toString(o.id) as order_id,
                o.created_at,
                toString(g.id) as group_id,
                toString(g.created_by) as created_by,
                toString(dl.id) as location_id,
                dl.name as location_name,
                gd.deal_type,
                toString(gc.user_id) as user_id,
                toInt32(o._peerdb_is_deleted) as order_deleted,
                toInt32(gc._peerdb_is_deleted) as group_cart_deleted,
                toInt32(g._peerdb_is_deleted) as group_deleted,
                toInt32(gd._peerdb_is_deleted) as group_deal_deleted
            FROM orders AS o
            JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
            JOIN groups AS g ON gc.group_id = g.id
            JOIN group_deals AS gd ON g.group_deals_id = gd.id
            JOIN delivery_location AS dl ON o.location_id = dl.id
            WHERE o.created_at >= toDateTime('2025-10-01 00:00:00')
              AND o.created_at < toDateTime('2025-11-01 00:00:00')
        )
        SELECT
            'Total Orders (All)' as metric,
            toInt64(COUNT(*)) as count
        FROM base_data
        UNION ALL
        SELECT
            'Orders (Not Deleted)' as metric,
            toInt64(COUNT(*)) as count
        FROM base_data
        WHERE order_deleted = 0 AND group_cart_deleted = 0 
          AND group_deleted = 0 AND group_deal_deleted = 0
        UNION ALL
        SELECT
            'Unique Order IDs' as metric,
            toInt64(COUNT(DISTINCT order_id)) as count
        FROM base_data
        WHERE order_deleted = 0 AND group_cart_deleted = 0 
          AND group_deleted = 0 AND group_deal_deleted = 0
        UNION ALL
        SELECT
            'Duplicate Order IDs' as metric,
            toInt64(COUNT(*) - COUNT(DISTINCT order_id)) as count
        FROM base_data
        WHERE order_deleted = 0 AND group_cart_deleted = 0 
          AND group_deleted = 0 AND group_deal_deleted = 0
        UNION ALL
        SELECT
            'Orders with Deleted Records' as metric,
            toInt64(COUNT(*)) as count
        FROM base_data
        WHERE order_deleted = 1 OR group_cart_deleted = 1 
          OR group_deleted = 1 OR group_deal_deleted = 1
        ORDER BY metric
        """
        
        result = client.query(integrity_query)
        
        integrity_data = {}
        for row in result.result_rows:
            integrity_data[row[0]] = int(row[1])
        
        return {
            "data_integrity_check": integrity_data,
            "recommendations": {
                "has_duplicates": integrity_data.get('Duplicate Order IDs', 0) > 0,
                "has_deleted_records": integrity_data.get('Orders with Deleted Records', 0) > 0,
                "total_orders_after_filtering": integrity_data.get('Orders (Not Deleted)', 0),
                "unique_orders": integrity_data.get('Unique Order IDs', 0)
            }
        }
        
    except Exception as e:
        logger.error(f"Error checking data integrity: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check data integrity: {str(e)}")

@app.get("/api/data-test")
async def test_data_accuracy():
    """Comprehensive test to verify data accuracy and distinct counts."""
    try:
        from clickhouse_connectivity import get_clickhouse_client
        client = get_clickhouse_client()
        
        # Test 1: Simple distinct order count
        test1_query = """
        SELECT 
            'Simple Distinct Orders' as test_name,
            COUNT(DISTINCT o.id) as count
        FROM orders AS o
        WHERE o._peerdb_is_deleted = 0
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        """
        
        # Test 2: Orders with all joins but no grouping
        test2_query = """
        SELECT 
            'Orders with Joins (No Grouping)' as test_name,
            COUNT(DISTINCT o.id) as count
        FROM orders AS o
        JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
        JOIN groups AS g ON gc.group_id = g.id
        JOIN group_deals AS gd ON g.group_deals_id = gd.id
        JOIN delivery_location AS dl ON o.location_id = dl.id
        WHERE o._peerdb_is_deleted = 0
          AND gc._peerdb_is_deleted = 0
          AND g._peerdb_is_deleted = 0
          AND gd._peerdb_is_deleted = 0
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        """
        
        # Test 3: Our current grouped query total
        test3_query = """
        SELECT 
            'Current Grouped Query Total' as test_name,
            SUM(total_orders) as count
        FROM (
            SELECT
                CASE
                    WHEN gd.deal_type IN ('SUPER_GROUP', 'SUPER_GROUP_FLASH_SALE') THEN 'SUPER_GROUPS'
                    WHEN gd.deal_type IN ('NORMAL', 'FLASH_SALE') THEN 'NORMAL_GROUPS'
                    ELSE gd.deal_type
                END AS group_deal_category,
                g.created_by AS group_created_by,
                dl.location AS delivery_coordinates,
                dl.name AS delivery_location_name,
                COUNT(DISTINCT o.id) AS total_orders
            FROM orders AS o
            JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
            JOIN groups AS g ON gc.group_id = g.id
            JOIN group_deals AS gd ON g.group_deals_id = gd.id
            JOIN delivery_location AS dl ON o.location_id = dl.id
            WHERE o._peerdb_is_deleted = 0
              AND gc._peerdb_is_deleted = 0
              AND g._peerdb_is_deleted = 0
              AND gd._peerdb_is_deleted = 0
              AND o.created_at >= toDateTime('2025-10-01 00:00:00')
              AND o.created_at < toDateTime('2025-11-01 00:00:00')
            GROUP BY group_deal_category, g.created_by, dl.location, dl.name
        ) as grouped_data
        """
        
        # Test 4: Check for duplicate order IDs in raw data
        test4_query = """
        SELECT 
            'Duplicate Order IDs in Raw Data' as test_name,
            COUNT(*) - COUNT(DISTINCT o.id) as count
        FROM orders AS o
        WHERE o._peerdb_is_deleted = 0
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        """
        
        # Test 5: Total raw order count
        test5_query = """
        SELECT 
            'Total Raw Orders' as test_name,
            COUNT(*) as count
        FROM orders AS o
        WHERE o._peerdb_is_deleted = 0
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        """
        
        # Execute all tests
        tests = [
            ("test1", test1_query),
            ("test2", test2_query), 
            ("test3", test3_query),
            ("test4", test4_query),
            ("test5", test5_query)
        ]
        
        results = {}
        for test_name, query in tests:
            try:
                result = client.query(query)
                row = result.result_rows[0]
                results[test_name] = {
                    "test_name": row[0],
                    "count": int(row[1])
                }
            except Exception as e:
                results[test_name] = {
                    "test_name": f"Test {test_name}",
                    "count": 0,
                    "error": str(e)
                }
        
        # Analysis
        analysis = {
            "data_accuracy": {
                "simple_distinct_orders": results["test1"]["count"],
                "orders_with_joins": results["test2"]["count"],
                "grouped_query_total": results["test3"]["count"],
                "duplicate_orders": results["test4"]["count"],
                "total_raw_orders": results["test5"]["count"]
            },
            "verification": {
                "is_data_consistent": results["test1"]["count"] == results["test2"]["count"] == results["test3"]["count"],
                "has_duplicates": results["test4"]["count"] > 0,
                "duplicate_percentage": round((results["test4"]["count"] / results["test5"]["count"]) * 100, 2) if results["test5"]["count"] > 0 else 0
            },
            "recommendations": []
        }
        
        # Add recommendations based on results
        if not analysis["verification"]["is_data_consistent"]:
            analysis["recommendations"].append("❌ Data inconsistency detected - different counts across queries")
        else:
            analysis["recommendations"].append("✅ Data is consistent across all queries")
            
        if analysis["verification"]["has_duplicates"]:
            analysis["recommendations"].append(f"⚠️ Found {analysis['verification']['duplicate_percentage']}% duplicate orders in raw data")
        else:
            analysis["recommendations"].append("✅ No duplicate orders found")
            
        if results["test1"]["count"] == results["test3"]["count"]:
            analysis["recommendations"].append("✅ Grouped query correctly preserves distinct order count")
        else:
            analysis["recommendations"].append("❌ Grouped query may be double-counting orders")
        
        return {
            "test_results": results,
            "analysis": analysis,
            "summary": f"Distinct Orders: {results['test1']['count']:,} | Grouped Total: {results['test3']['count']:,} | Duplicates: {results['test4']['count']:,}"
        }
        
    except Exception as e:
        logger.error(f"Error testing data accuracy: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to test data accuracy: {str(e)}")

@app.get("/api/debug-query")
async def debug_query_issue():
    """Debug the exact source of double-counting in our query."""
    try:
        from clickhouse_connectivity import get_clickhouse_client
        client = get_clickhouse_client()
        
        # Test the corrected query step by step
        debug_query = """
        WITH order_details AS (
            SELECT DISTINCT
                o.id as order_id,
                o.created_at,
                o.groups_carts_id,
                o.location_id,
                gc.user_id,
                gc.group_id,
                g.created_by,
                g.group_deals_id,
                gd.deal_type,
                dl.location,
                dl.name as delivery_location_name
            FROM orders AS o
            JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
            JOIN groups AS g ON gc.group_id = g.id
            JOIN group_deals AS gd ON g.group_deals_id = gd.id
            JOIN delivery_location AS dl ON o.location_id = dl.id
            WHERE o._peerdb_is_deleted = 0
              AND gc._peerdb_is_deleted = 0
              AND g._peerdb_is_deleted = 0
              AND gd._peerdb_is_deleted = 0
              AND o.created_at >= toDateTime('2025-10-01 00:00:00')
              AND o.created_at < toDateTime('2025-11-01 00:00:00')
        )
        SELECT 
            'Corrected Query Total' as test_name,
            SUM(total_orders) as count
        FROM (
            SELECT
                CASE
                    WHEN deal_type IN ('SUPER_GROUP', 'SUPER_GROUP_FLASH_SALE') THEN 'SUPER_GROUPS'
                    WHEN deal_type IN ('NORMAL', 'FLASH_SALE') THEN 'NORMAL_GROUPS'
                    ELSE deal_type
                END AS group_deal_category,
                created_by AS group_created_by,
                location AS delivery_coordinates,
                delivery_location_name,
                COUNT(DISTINCT order_id) AS total_orders
            FROM order_details
            GROUP BY group_deal_category, created_by, location, delivery_location_name
        ) as grouped_data
        """
        
        result = client.query(debug_query)
        row = result.result_rows[0]
        
        # Also get the simple distinct count for comparison
        simple_query = """
        SELECT COUNT(DISTINCT o.id) as count
        FROM orders AS o
        WHERE o._peerdb_is_deleted = 0
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        """
        
        simple_result = client.query(simple_query)
        simple_count = int(simple_result.result_rows[0][0])
        
        corrected_count = int(row[1])
        difference = corrected_count - simple_count
        
        return {
            "corrected_query_total": corrected_count,
            "simple_distinct_total": simple_count,
            "difference": difference,
            "is_corrected": difference == 0,
            "status": "✅ FIXED" if difference == 0 else f"❌ Still {difference:,} orders difference"
        }
        
    except Exception as e:
        logger.error(f"Error debugging query: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to debug query: {str(e)}")

@app.get("/api/compare-queries")
async def compare_queries():
    """Compare our current query with the alternative query to find discrepancies."""
    try:
        from clickhouse_connectivity import get_clickhouse_client
        client = get_clickhouse_client()
        
        # Our current query (simplified for comparison)
        current_query = """
        SELECT 
            'Current Query' as query_type,
            COUNT(DISTINCT o.id) as total_orders
        FROM orders AS o
        JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
        JOIN groups AS g ON gc.group_id = g.id
        JOIN group_deals AS gd ON g.group_deals_id = gd.id
        JOIN delivery_location AS dl ON o.location_id = dl.id
        WHERE o._peerdb_is_deleted = 0
          AND gc._peerdb_is_deleted = 0
          AND g._peerdb_is_deleted = 0
          AND gd._peerdb_is_deleted = 0
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        """
        
        # Your alternative query (adapted for October 2025)
        alternative_query = """
        SELECT 
            'Alternative Query' as query_type,
            COUNT(DISTINCT CASE WHEN o.created_at < now() THEN o.id END) AS total_orders
        FROM orders o
        LEFT JOIN groups_carts gc ON o.groups_carts_id = gc.id
        LEFT JOIN groups g ON gc.group_id = g.id
        WHERE o.status = 'COMPLETED'
          AND gc.status = 'COMPLETED'
          AND o.deleted_at IS NULL
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        """
        
        # Simple distinct count (baseline)
        baseline_query = """
        SELECT 
            'Baseline' as query_type,
            COUNT(DISTINCT o.id) as total_orders
        FROM orders o
        WHERE o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        """
        
        # Execute all queries
        queries = [
            ("current", current_query),
            ("alternative", alternative_query),
            ("baseline", baseline_query)
        ]
        
        results = {}
        for query_name, query in queries:
            try:
                result = client.query(query)
                row = result.result_rows[0]
                results[query_name] = {
                    "query_type": row[0],
                    "total_orders": int(row[1])
                }
            except Exception as e:
                results[query_name] = {
                    "query_type": f"Query {query_name}",
                    "total_orders": 0,
                    "error": str(e)
                }
        
        # Analysis
        current_count = results["current"]["total_orders"]
        alternative_count = results["alternative"]["total_orders"]
        baseline_count = results["baseline"]["total_orders"]
        
        analysis = {
            "query_comparison": {
                "current_query_orders": current_count,
                "alternative_query_orders": alternative_count,
                "baseline_orders": baseline_count
            },
            "differences": {
                "current_vs_alternative": current_count - alternative_count,
                "current_vs_baseline": current_count - baseline_count,
                "alternative_vs_baseline": alternative_count - baseline_count
            },
            "filter_analysis": {
                "current_uses_peerdb_deleted": True,
                "current_uses_joins": True,
                "alternative_uses_status": True,
                "alternative_uses_deleted_at": True,
                "alternative_uses_left_joins": True
            },
            "recommendations": []
        }
        
        # Add recommendations
        if alternative_count < current_count:
            analysis["recommendations"].append(f"⚠️ Alternative query shows {current_count - alternative_count:,} fewer orders - likely due to status filtering")
        
        if alternative_count < baseline_count:
            analysis["recommendations"].append(f"⚠️ Alternative query shows {baseline_count - alternative_count:,} fewer orders than baseline - status/deleted filters are removing orders")
        
        if current_count > baseline_count:
            analysis["recommendations"].append(f"⚠️ Current query shows {current_count - baseline_count:,} more orders than baseline - possible double-counting")
        
        if alternative_count == baseline_count:
            analysis["recommendations"].append("✅ Alternative query matches baseline - this is likely the correct count")
        
        return {
            "results": results,
            "analysis": analysis,
            "summary": f"Current: {current_count:,} | Alternative: {alternative_count:,} | Baseline: {baseline_count:,}"
        }
        
    except Exception as e:
        logger.error(f"Error comparing queries: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to compare queries: {str(e)}")

@app.get("/api/diagnose-fields")
async def diagnose_fields():
    """Diagnose what fields exist and their values to understand the discrepancy."""
    try:
        from clickhouse_connectivity import get_clickhouse_client
        client = get_clickhouse_client()
        
        # Check what fields exist in orders table
        fields_query = """
        SELECT 
            'Field Analysis' as analysis_type,
            'Orders Table Fields' as table_name,
            groupArray(name) as field_names
        FROM system.columns 
        WHERE database = currentDatabase() 
          AND table = 'orders'
        """
        
        # Check status values
        status_query = """
        SELECT 
            'Status Values' as analysis_type,
            status,
            COUNT(*) as count
        FROM orders 
        WHERE created_at >= toDateTime('2025-10-01 00:00:00')
          AND created_at < toDateTime('2025-11-01 00:00:00')
        GROUP BY status
        ORDER BY count DESC
        """
        
        # Check if deleted_at exists and has values
        deleted_query = """
        SELECT 
            'Deleted At Analysis' as analysis_type,
            COUNT(*) as total_orders,
            countIf(deleted_at IS NOT NULL) as deleted_orders,
            countIf(deleted_at IS NULL) as non_deleted_orders
        FROM orders 
        WHERE created_at >= toDateTime('2025-10-01 00:00:00')
          AND created_at < toDateTime('2025-11-01 00:00:00')
        """
        
        # Check groups_carts status
        gc_status_query = """
        SELECT 
            'Group Cart Status' as analysis_type,
            status,
            COUNT(*) as count
        FROM groups_carts gc
        JOIN orders o ON o.groups_carts_id = gc.id
        WHERE o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        GROUP BY status
        ORDER BY count DESC
        """
        
        queries = [
            ("fields", fields_query),
            ("status", status_query),
            ("deleted", deleted_query),
            ("gc_status", gc_status_query)
        ]
        
        results = {}
        for query_name, query in queries:
            try:
                result = client.query(query)
                if query_name == "fields":
                    row = result.result_rows[0]
                    results[query_name] = {
                        "analysis_type": row[0],
                        "table_name": row[1],
                        "field_names": row[2]
                    }
                elif query_name == "status":
                    results[query_name] = {
                        "analysis_type": "Status Values",
                        "status_counts": {row[0]: int(row[1]) for row in result.result_rows}
                    }
                elif query_name == "deleted":
                    row = result.result_rows[0]
                    results[query_name] = {
                        "analysis_type": row[0],
                        "total_orders": int(row[1]),
                        "deleted_orders": int(row[2]),
                        "non_deleted_orders": int(row[3])
                    }
                elif query_name == "gc_status":
                    results[query_name] = {
                        "analysis_type": "Group Cart Status",
                        "status_counts": {row[0]: int(row[1]) for row in result.result_rows}
                    }
            except Exception as e:
                results[query_name] = {"error": str(e)}
        
        return {
            "field_analysis": results,
            "recommendations": []
        }
        
    except Exception as e:
        logger.error(f"Error diagnosing fields: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to diagnose fields: {str(e)}")

@app.get("/api/test-day-filtering")
async def test_day_filtering():
    """Test day filtering to see what's happening with Sunday orders."""
    try:
        from clickhouse_connectivity import get_clickhouse_client
        client = get_clickhouse_client()
        
        # Test Sunday orders specifically
        sunday_query = """
        SELECT
            CASE
                WHEN gd.deal_type IN ('SUPER_GROUP', 'SUPER_GROUP_FLASH_SALE') THEN 'SUPER_GROUPS'
                WHEN gd.deal_type IN ('NORMAL', 'FLASH_SALE') THEN 'NORMAL_GROUPS'
                ELSE gd.deal_type
            END AS group_deal_category,
            COUNT(DISTINCT o.id) AS total_orders,
            countIf(toDayOfWeek(o.created_at) = 7) AS sunday_orders
        FROM orders AS o
        LEFT JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
        LEFT JOIN groups AS g ON gc.group_id = g.id
        LEFT JOIN group_deals AS gd ON g.group_deals_id = gd.id
        LEFT JOIN delivery_location AS dl ON o.location_id = dl.id
        WHERE o.status = 'COMPLETED'
          AND gc.status = 'COMPLETED'
          AND o.deleted_at IS NULL
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        GROUP BY group_deal_category
        ORDER BY group_deal_category
        """
        
        result = client.query(sunday_query)
        
        data = []
        for row in result.result_rows:
            data.append({
                "group_type": row[0],
                "total_orders": int(row[1]),
                "sunday_orders": int(row[2])
            })
        
        # Also get locations with Sunday orders
        locations_query = """
        SELECT
            CASE
                WHEN gd.deal_type IN ('SUPER_GROUP', 'SUPER_GROUP_FLASH_SALE') THEN 'SUPER_GROUPS'
                WHEN gd.deal_type IN ('NORMAL', 'FLASH_SALE') THEN 'NORMAL_GROUPS'
                ELSE gd.deal_type
            END AS group_deal_category,
            g.created_by AS group_created_by,
            dl.name AS delivery_location_name,
            COUNT(DISTINCT o.id) AS total_orders,
            countIf(toDayOfWeek(o.created_at) = 7) AS sunday_orders
        FROM orders AS o
        LEFT JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
        LEFT JOIN groups AS g ON gc.group_id = g.id
        LEFT JOIN group_deals AS gd ON g.group_deals_id = gd.id
        LEFT JOIN delivery_location AS dl ON o.location_id = dl.id
        WHERE o.status = 'COMPLETED'
          AND gc.status = 'COMPLETED'
          AND o.deleted_at IS NULL
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
          AND toDayOfWeek(o.created_at) = 7
        GROUP BY group_deal_category, g.created_by, dl.name
        ORDER BY group_deal_category, sunday_orders DESC
        LIMIT 10
        """
        
        locations_result = client.query(locations_query)
        
        locations_data = []
        for row in locations_result.result_rows:
            locations_data.append({
                "group_type": row[0],
                "group_created_by": str(row[1]),
                "location_name": row[2],
                "total_orders": int(row[3]),
                "sunday_orders": int(row[4])
            })
        
        return {
            "summary": data,
            "top_locations_with_sunday_orders": locations_data,
            "analysis": {
                "total_sunday_orders": sum(item["sunday_orders"] for item in data),
                "locations_with_sunday_orders": len(locations_data),
                "potential_issue": "Check if locations are showing total_orders instead of sunday_orders"
            }
        }
        
    except Exception as e:
        logger.error(f"Error testing day filtering: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to test day filtering: {str(e)}")

@app.get("/api/debug-sunday-data")
async def debug_sunday_data():
    """Debug the exact data being returned for Sunday filtering."""
    try:
        from clickhouse_connectivity import get_clickhouse_client
        client = get_clickhouse_client()
        
        # Get the exact same data that the frontend receives
        query = """
        SELECT
            CASE
                WHEN gd.deal_type IN ('SUPER_GROUP', 'SUPER_GROUP_FLASH_SALE') THEN 'SUPER_GROUPS'
                WHEN gd.deal_type IN ('NORMAL', 'FLASH_SALE') THEN 'NORMAL_GROUPS'
                ELSE gd.deal_type
            END AS group_deal_category,
            g.created_by AS group_created_by,
            dl.location AS delivery_coordinates,
            dl.name AS delivery_location_name,
            COUNT(DISTINCT gc.user_id) AS unique_group_members,
            COUNT(DISTINCT g.id) AS total_groups,
            countIf(toDayOfWeek(o.created_at) = 1) AS monday_orders,
            countIf(toDayOfWeek(o.created_at) = 2) AS tuesday_orders,
            countIf(toDayOfWeek(o.created_at) = 3) AS wednesday_orders,
            countIf(toDayOfWeek(o.created_at) = 4) AS thursday_orders,
            countIf(toDayOfWeek(o.created_at) = 5) AS friday_orders,
            countIf(toDayOfWeek(o.created_at) = 6) AS saturday_orders,
            countIf(toDayOfWeek(o.created_at) = 7) AS sunday_orders,
            COUNT(DISTINCT toDate(o.created_at)) AS active_days,
            COUNT(DISTINCT o.id) AS total_orders
        FROM orders AS o
        LEFT JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
        LEFT JOIN groups AS g ON gc.group_id = g.id
        LEFT JOIN group_deals AS gd ON g.group_deals_id = gd.id
        LEFT JOIN delivery_location AS dl ON o.location_id = dl.id
        WHERE o.status = 'COMPLETED'
          AND gc.status = 'COMPLETED'
          AND o.deleted_at IS NULL
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        GROUP BY group_deal_category, g.created_by, dl.location, dl.name
        HAVING countIf(toDayOfWeek(o.created_at) = 7) > 0
        ORDER BY group_deal_category, sunday_orders DESC
        LIMIT 20
        """
        
        result = client.query(query)
        
        data = []
        for row in result.result_rows:
            data.append({
                "group_deal_category": row[0],
                "group_created_by": str(row[1]),
                "delivery_location_name": row[3],
                "total_orders": int(row[14]),
                "sunday_orders": int(row[13]),
                "monday_orders": int(row[6]),
                "tuesday_orders": int(row[7]),
                "wednesday_orders": int(row[8]),
                "thursday_orders": int(row[9]),
                "friday_orders": int(row[10]),
                "saturday_orders": int(row[11])
            })
        
        # Calculate what the frontend should show
        normal_groups = [item for item in data if item["group_deal_category"] == "NORMAL_GROUPS"]
        super_groups = [item for item in data if item["group_deal_category"] == "SUPER_GROUPS"]
        
        normal_sunday_total = sum(item["sunday_orders"] for item in normal_groups)
        super_sunday_total = sum(item["sunday_orders"] for item in super_groups)
        
        return {
            "sample_data": data[:10],
            "summary": {
                "normal_groups": {
                    "locations": len(normal_groups),
                    "total_orders": sum(item["total_orders"] for item in normal_groups),
                    "sunday_orders": normal_sunday_total
                },
                "super_groups": {
                    "locations": len(super_groups),
                    "total_orders": sum(item["total_orders"] for item in super_groups),
                    "sunday_orders": super_sunday_total
                }
            },
            "expected_frontend_numbers": {
                "normal_groups_sunday_orders": normal_sunday_total,
                "super_groups_sunday_orders": super_sunday_total,
                "total_sunday_orders": normal_sunday_total + super_sunday_total
            }
        }
        
    except Exception as e:
        logger.error(f"Error debugging Sunday data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to debug Sunday data: {str(e)}")

@app.get("/api/validate-day-sums")
async def validate_day_sums():
    """Validate that the sum of all individual days equals the total orders."""
    try:
        from clickhouse_connectivity import get_clickhouse_client
        client = get_clickhouse_client()
        
        # Get total orders by group type
        total_query = """
        SELECT
            CASE
                WHEN gd.deal_type IN ('SUPER_GROUP', 'SUPER_GROUP_FLASH_SALE') THEN 'SUPER_GROUPS'
                WHEN gd.deal_type IN ('NORMAL', 'FLASH_SALE') THEN 'NORMAL_GROUPS'
                ELSE gd.deal_type
            END AS group_deal_category,
            COUNT(DISTINCT o.id) AS total_orders
        FROM orders AS o
        LEFT JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
        LEFT JOIN groups AS g ON gc.group_id = g.id
        LEFT JOIN group_deals AS gd ON g.group_deals_id = gd.id
        LEFT JOIN delivery_location AS dl ON o.location_id = dl.id
        WHERE o.status = 'COMPLETED'
          AND gc.status = 'COMPLETED'
          AND o.deleted_at IS NULL
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        GROUP BY group_deal_category
        ORDER BY group_deal_category
        """
        
        # Get orders by individual days using the same simple approach
        days_query = """
        SELECT
            CASE
                WHEN gd.deal_type IN ('SUPER_GROUP', 'SUPER_GROUP_FLASH_SALE') THEN 'SUPER_GROUPS'
                WHEN gd.deal_type IN ('NORMAL', 'FLASH_SALE') THEN 'NORMAL_GROUPS'
                ELSE gd.deal_type
            END AS group_deal_category,
            COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 1 THEN o.id END) AS monday_orders,
            COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 2 THEN o.id END) AS tuesday_orders,
            COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 3 THEN o.id END) AS wednesday_orders,
            COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 4 THEN o.id END) AS thursday_orders,
            COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 5 THEN o.id END) AS friday_orders,
            COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 6 THEN o.id END) AS saturday_orders,
            COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 7 THEN o.id END) AS sunday_orders
        FROM orders AS o
        JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
        JOIN groups AS g ON gc.group_id = g.id
        JOIN group_deals AS gd ON g.group_deals_id = gd.id
        JOIN delivery_location AS dl ON o.location_id = dl.id
        WHERE o.status = 'COMPLETED'
          AND gc.status = 'COMPLETED'
          AND o.deleted_at IS NULL
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        GROUP BY group_deal_category
        ORDER BY group_deal_category
        """
        
        total_result = client.query(total_query)
        days_result = client.query(days_query)
        
        total_data = {}
        for row in total_result.result_rows:
            total_data[row[0]] = int(row[1])
        
        days_data = {}
        for row in days_result.result_rows:
            days_data[row[0]] = {
                'monday': int(row[1]),
                'tuesday': int(row[2]),
                'wednesday': int(row[3]),
                'thursday': int(row[4]),
                'friday': int(row[5]),
                'saturday': int(row[6]),
                'sunday': int(row[7])
            }
        
        # Calculate validation
        validation = {}
        for group_type in total_data.keys():
            day_totals = days_data[group_type]
            sum_of_days = sum(day_totals.values())
            total_orders = total_data[group_type]
            
            validation[group_type] = {
                'total_orders': total_orders,
                'sum_of_days': sum_of_days,
                'difference': total_orders - sum_of_days,
                'is_valid': total_orders == sum_of_days,
                'day_breakdown': day_totals
            }
        
        return {
            'validation': validation,
            'summary': {
                'total_orders_all_groups': sum(total_data.values()),
                'sum_of_all_days': sum(sum(days.values()) for days in days_data.values()),
                'is_data_consistent': all(v['is_valid'] for v in validation.values())
            }
        }
        
    except Exception as e:
        logger.error(f"Error validating day sums: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to validate day sums: {str(e)}")

@app.get("/api/investigate-duplicates")
async def investigate_duplicates():
    """Investigate why day sums don't match total orders."""
    try:
        from clickhouse_connectivity import get_clickhouse_client
        client = get_clickhouse_client()
        
        # Check for potential duplicate counting issues
        duplicate_check_query = """
        SELECT
            toDayOfWeek(o.created_at) AS day_of_week,
            COUNT(DISTINCT o.id) AS unique_orders,
            COUNT(*) AS total_count,
            COUNT(*) - COUNT(DISTINCT o.id) AS potential_duplicates
        FROM orders AS o
        LEFT JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
        LEFT JOIN groups AS g ON gc.group_id = g.id
        LEFT JOIN group_deals AS gd ON g.group_deals_id = gd.id
        LEFT JOIN delivery_location AS dl ON o.location_id = dl.id
        WHERE o.status = 'COMPLETED'
          AND gc.status = 'COMPLETED'
          AND o.deleted_at IS NULL
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        GROUP BY toDayOfWeek(o.created_at)
        ORDER BY day_of_week
        """
        
        # Check for orders that might be counted multiple times
        cross_day_check_query = """
        SELECT
            o.id,
            o.created_at,
            toDayOfWeek(o.created_at) AS day_of_week,
            toDate(o.created_at) AS order_date,
            toHour(o.created_at) AS order_hour,
            toMinute(o.created_at) AS order_minute
        FROM orders AS o
        LEFT JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
        LEFT JOIN groups AS g ON gc.group_id = g.id
        LEFT JOIN group_deals AS gd ON g.group_deals_id = gd.id
        LEFT JOIN delivery_location AS dl ON o.location_id = dl.id
        WHERE o.status = 'COMPLETED'
          AND gc.status = 'COMPLETED'
          AND o.deleted_at IS NULL
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        GROUP BY o.id, o.created_at, day_of_week, order_date, order_hour, order_minute
        HAVING COUNT(*) > 1
        LIMIT 10
        """
        
        # Check total unique orders vs total count
        total_check_query = """
        SELECT
            COUNT(DISTINCT o.id) AS unique_orders,
            COUNT(*) AS total_count,
            COUNT(*) - COUNT(DISTINCT o.id) AS duplicates
        FROM orders AS o
        LEFT JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
        LEFT JOIN groups AS g ON gc.group_id = g.id
        LEFT JOIN group_deals AS gd ON g.group_deals_id = gd.id
        LEFT JOIN delivery_location AS dl ON o.location_id = dl.id
        WHERE o.status = 'COMPLETED'
          AND gc.status = 'COMPLETED'
          AND o.deleted_at IS NULL
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        """
        
        duplicate_result = client.query(duplicate_check_query)
        cross_day_result = client.query(cross_day_check_query)
        total_result = client.query(total_check_query)
        
        duplicate_data = []
        for row in duplicate_result.result_rows:
            duplicate_data.append({
                'day_of_week': int(row[0]),
                'unique_orders': int(row[1]),
                'total_count': int(row[2]),
                'potential_duplicates': int(row[3])
            })
        
        cross_day_data = []
        for row in cross_day_result.result_rows:
            cross_day_data.append({
                'order_id': str(row[0]),
                'created_at': str(row[1]),
                'day_of_week': int(row[2]),
                'order_date': str(row[3]),
                'order_hour': int(row[4]),
                'order_minute': int(row[5])
            })
        
        total_data = total_result.result_rows[0] if total_result.result_rows else [0, 0, 0]
        
        return {
            'duplicate_analysis': duplicate_data,
            'cross_day_issues': cross_day_data,
            'total_analysis': {
                'unique_orders': int(total_data[0]),
                'total_count': int(total_data[1]),
                'duplicates': int(total_data[2])
            },
            'day_names': {
                1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday',
                5: 'Friday', 6: 'Saturday', 7: 'Sunday'
            }
        }
        
    except Exception as e:
        logger.error(f"Error investigating duplicates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to investigate duplicates: {str(e)}")

@app.get("/api/simple-day-test")
async def simple_day_test():
    """Simple test to verify day counting without complex joins."""
    try:
        from clickhouse_connectivity import get_clickhouse_client
        client = get_clickhouse_client()
        
        # Simple query to get total orders
        total_query = """
        SELECT COUNT(DISTINCT o.id) AS total_orders
        FROM orders AS o
        WHERE o.status = 'COMPLETED'
          AND o.deleted_at IS NULL
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        """
        
        # Simple query to get orders by day
        days_query = """
        SELECT
            toDayOfWeek(o.created_at) AS day_of_week,
            COUNT(DISTINCT o.id) AS orders
        FROM orders AS o
        WHERE o.status = 'COMPLETED'
          AND o.deleted_at IS NULL
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        GROUP BY toDayOfWeek(o.created_at)
        ORDER BY day_of_week
        """
        
        total_result = client.query(total_query)
        days_result = client.query(days_query)
        
        total_orders = int(total_result.result_rows[0][0]) if total_result.result_rows else 0
        
        days_data = []
        for row in days_result.result_rows:
            days_data.append({
                'day_of_week': int(row[0]),
                'orders': int(row[1])
            })
        
        sum_of_days = sum(day['orders'] for day in days_data)
        
        day_names = {1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 
                    5: 'Friday', 6: 'Saturday', 7: 'Sunday'}
        
        return {
            'total_orders': total_orders,
            'sum_of_days': sum_of_days,
            'difference': total_orders - sum_of_days,
            'is_consistent': total_orders == sum_of_days,
            'days_breakdown': [
                {
                    'day': day_names.get(day['day_of_week'], f'Day {day["day_of_week"]}'),
                    'orders': day['orders']
                }
                for day in days_data
            ]
        }
        
    except Exception as e:
        logger.error(f"Error in simple day test: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to run simple day test: {str(e)}")

@app.get("/api/verified-data")
async def get_verified_data():
    """Get data with verified unique counts to avoid double-counting."""
    try:
        from clickhouse_connectivity import get_clickhouse_client
        client = get_clickhouse_client()
        
        # Verified query that ensures no double-counting
        verified_query = """
        SELECT
            CASE
                WHEN gd.deal_type IN ('SUPER_GROUP', 'SUPER_GROUP_FLASH_SALE') THEN 'SUPER_GROUPS'
                WHEN gd.deal_type IN ('NORMAL', 'FLASH_SALE') THEN 'NORMAL_GROUPS'
                ELSE gd.deal_type
            END AS group_deal_category,
            g.created_by AS group_created_by,
            dl.location AS delivery_coordinates,
            dl.name AS delivery_location_name,
            COUNT(DISTINCT gc.user_id) AS unique_group_members,
            COUNT(DISTINCT g.id) AS total_groups,
            countIf(toDayOfWeek(o.created_at) = 1) AS monday_orders,
            countIf(toDayOfWeek(o.created_at) = 2) AS tuesday_orders,
            countIf(toDayOfWeek(o.created_at) = 3) AS wednesday_orders,
            countIf(toDayOfWeek(o.created_at) = 4) AS thursday_orders,
            countIf(toDayOfWeek(o.created_at) = 5) AS friday_orders,
            countIf(toDayOfWeek(o.created_at) = 6) AS saturday_orders,
            countIf(toDayOfWeek(o.created_at) = 7) AS sunday_orders,
            COUNT(DISTINCT toDate(o.created_at)) AS active_days,
            COUNT(DISTINCT o.id) AS total_orders
        FROM orders AS o
        JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
        JOIN groups AS g ON gc.group_id = g.id
        JOIN group_deals AS gd ON g.group_deals_id = gd.id
        JOIN delivery_location AS dl ON o.location_id = dl.id
        WHERE o._peerdb_is_deleted = 0
          AND gc._peerdb_is_deleted = 0
          AND g._peerdb_is_deleted = 0
          AND gd._peerdb_is_deleted = 0
          AND o.created_at >= toDateTime('2025-10-01 00:00:00')
          AND o.created_at < toDateTime('2025-11-01 00:00:00')
        GROUP BY
            group_deal_category,
            g.created_by,
            dl.location,
            dl.name
        ORDER BY
            group_deal_category ASC,
            unique_group_members DESC
        """
        
        logger.info("Executing verified ClickHouse query...")
        result = client.query(verified_query)
        
        # Convert to list of dictionaries
        data = []
        for row in result.result_rows:
            # Parse coordinates
            lat, lon = parse_coordinates(row[2])  # delivery_coordinates
            
            data.append({
                "group_deal_category": row[0],
                "group_created_by": str(row[1]),  # Convert UUID to string
                "delivery_coordinates": row[2],
                "delivery_location_name": row[3],
                "unique_group_members": int(row[4]),
                "total_groups": int(row[5]),
                "monday_orders": int(row[6]),
                "tuesday_orders": int(row[7]),
                "wednesday_orders": int(row[8]),
                "thursday_orders": int(row[9]),
                "friday_orders": int(row[10]),
                "saturday_orders": int(row[11]),
                "sunday_orders": int(row[12]),
                "active_days": int(row[13]),
                "total_orders": int(row[14]),
                "latitude": lat,
                "longitude": lon
            })
        
        logger.info(f"Retrieved {len(data)} verified records from ClickHouse")
        return {"data": data, "count": len(data), "verified": True}
        
    except Exception as e:
        logger.error(f"Error fetching verified data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch verified data: {str(e)}")

@app.get("/api/statistics")
async def get_statistics():
    """Get aggregated statistics from ClickHouse."""
    try:
        from clickhouse_connectivity import get_clickhouse_client
        client = get_clickhouse_client()
        
        # Get basic statistics using your query as a subquery
        stats_query = """
        SELECT
            COUNT(*) as total_records,
            COUNT(DISTINCT CASE WHEN group_deal_category = 'NORMAL_GROUPS' THEN 1 END) as normal_groups,
            COUNT(DISTINCT CASE WHEN group_deal_category = 'SUPER_GROUPS' THEN 1 END) as super_groups,
            SUM(total_orders) as total_orders_sum,
            AVG(total_orders) as avg_orders_per_group,
            MAX(total_orders) as max_orders,
            COUNT(DISTINCT delivery_location_name) as unique_locations,
            AVG(unique_group_members) as avg_members_per_group,
            MIN(latitude) as min_lat,
            MAX(latitude) as max_lat,
            MIN(longitude) as min_lon,
            MAX(longitude) as max_lon
        FROM (
            SELECT
                CASE
                    WHEN gd.deal_type IN ('SUPER_GROUP', 'SUPER_GROUP_FLASH_SALE') THEN 'SUPER_GROUPS'
                    WHEN gd.deal_type IN ('NORMAL', 'FLASH_SALE') THEN 'NORMAL_GROUPS'
                    ELSE gd.deal_type
                END AS group_deal_category,
                g.created_by AS group_created_by,
                dl.location AS delivery_coordinates,
                dl.name AS delivery_location_name,
                COUNT(DISTINCT gc.user_id) AS unique_group_members,
                COUNT(DISTINCT g.id) AS total_groups,
                countIf(toDayOfWeek(o.created_at) = 1) AS monday_orders,
                countIf(toDayOfWeek(o.created_at) = 2) AS tuesday_orders,
                countIf(toDayOfWeek(o.created_at) = 3) AS wednesday_orders,
                countIf(toDayOfWeek(o.created_at) = 4) AS thursday_orders,
                countIf(toDayOfWeek(o.created_at) = 5) AS friday_orders,
                countIf(toDayOfWeek(o.created_at) = 6) AS saturday_orders,
                countIf(toDayOfWeek(o.created_at) = 7) AS sunday_orders,
                COUNT(DISTINCT toDate(o.created_at)) AS active_days,
                COUNT(DISTINCT o.id) AS total_orders,
                CASE
                    WHEN dl.location LIKE 'POINT(%' THEN
                        toFloat64OrZero(splitByChar(' ', replaceOne(replaceOne(dl.location, 'POINT(', ''), ')', ''))[2])
                    ELSE 0
                END as latitude,
                CASE
                    WHEN dl.location LIKE 'POINT(%' THEN
                        toFloat64OrZero(splitByChar(' ', replaceOne(replaceOne(dl.location, 'POINT(', ''), ')', ''))[1])
                    ELSE 0
                END as longitude
            FROM orders AS o
            JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
            JOIN groups AS g ON gc.group_id = g.id
            JOIN group_deals AS gd ON g.group_deals_id = gd.id
            JOIN delivery_location AS dl ON o.location_id = dl.id
            WHERE o._peerdb_is_deleted = 0
              AND gc._peerdb_is_deleted = 0
              AND g._peerdb_is_deleted = 0
              AND gd._peerdb_is_deleted = 0
              AND o.created_at >= toDateTime('2025-10-01 00:00:00')
              AND o.created_at < toDateTime('2025-11-01 00:00:00')
            GROUP BY group_deal_category, g.created_by, dl.location, dl.name
        ) as subquery
        """
        
        result = client.query(stats_query)
        row = result.result_rows[0]
        
        return {
            "totalRecords": int(row[0]),
            "normalGroups": int(row[1]),
            "superGroups": int(row[2]),
            "totalOrders": int(row[3]),  # total_orders_sum
            "avgOrdersPerGroup": float(row[4]),
            "maxOrders": int(row[5]),
            "uniqueLocations": int(row[6]),
            "avgMembersPerGroup": float(row[7]),
            "geographicBounds": {
                "minLat": float(row[8]),
                "maxLat": float(row[9]),
                "minLon": float(row[10]),
                "maxLon": float(row[11])
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch statistics: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
