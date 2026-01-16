"""
Test: Compare dashboard product count vs ClickHouse direct query
Date Range: Nov 24-30, 2025 (last 7 days)
"""
import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv
import clickhouse_connect

# Load environment variables
load_dotenv()

# ClickHouse configuration
CLICKHOUSE_HOST = os.getenv('CLICKHOUSE_HOST')
CLICKHOUSE_PORT = int(os.getenv('CLICKHOUSE_PORT_STR', '8123'))
CLICKHOUSE_USER = os.getenv('CLICKHOUSE_USER')
CLICKHOUSE_PASSWORD = os.getenv('CLICKHOUSE_PASSWORD')
CLICKHOUSE_DATABASE = os.getenv('CLICKHOUSE_DATABASE')
CLICKHOUSE_SECURE = os.getenv('CLICKHOUSE_SECURE_STR', 'false').lower() == 'true'
CLICKHOUSE_VERIFY = os.getenv('CLICKHOUSE_VERIFY_STR', 'false').lower() == 'true'

def get_clickhouse_client():
    """Create ClickHouse client"""
    try:
        client = clickhouse_connect.get_client(
            host=CLICKHOUSE_HOST,
            port=CLICKHOUSE_PORT,
            username=CLICKHOUSE_USER,
            password=CLICKHOUSE_PASSWORD,
            database=CLICKHOUSE_DATABASE,
            secure=CLICKHOUSE_SECURE,
            verify=CLICKHOUSE_VERIFY,
            connect_timeout=10,
            send_receive_timeout=60
        )
        return client
    except Exception as e:
        print(f"Error connecting to ClickHouse: {e}")
        return None

def count_unique_products_clickhouse(date_from: str, date_to: str):
    """Count unique products sold in ClickHouse for the date range"""
    client = get_clickhouse_client()
    if not client:
        return None
    
    # Query to count unique products sold in the date range
    # Using the same query structure as main.py load_product_metrics_data
    query = f"""
    SELECT 
        COUNT(DISTINCT gd.product_id) as unique_products,
        SUM(gc.quantity) as total_volume_kg
    FROM orders AS o
    JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
    JOIN groups AS g ON gc.group_id = g.id
    JOIN group_deals AS gd ON g.group_deals_id = gd.id
    WHERE
        o._peerdb_is_deleted = 0
        AND gc._peerdb_is_deleted = 0
        AND g._peerdb_is_deleted = 0
        AND gd._peerdb_is_deleted = 0
        AND o.status = 'COMPLETED' AND o.deleted_at IS NULL
        AND gc.status = 'COMPLETED' AND gc.deleted_at IS NULL
        AND g.status = 'COMPLETED' AND g.deleted_at IS NULL
        AND o.created_at >= toDateTime('{date_from} 00:00:00')
        AND o.created_at < toDateTime('{date_to} 23:59:59')
        AND gc.quantity > 0
    """
    
    try:
        result = client.query(query)
        
        if result.result_rows:
            unique_products = result.result_rows[0][0]
            total_volume = result.result_rows[0][1]
            return {
                'unique_products': unique_products,
                'total_volume_kg': total_volume
            }
    except Exception as e:
        print(f"Error querying ClickHouse: {e}")
        return None

def get_product_list_clickhouse(date_from: str, date_to: str):
    """Get list of unique products sold in ClickHouse"""
    client = get_clickhouse_client()
    if not client:
        return None
    
    # Using the same query structure as main.py load_product_metrics_data
    query = f"""
    SELECT
        any(
            coalesce(
                pn.name,
                toString(gd.product_id)
            )
        ) AS product_name,
        gd.product_id AS product_id,
        sum(gc.quantity) AS total_volume_kg,
        countDistinct(o.id) AS order_count
    FROM orders AS o
    JOIN groups_carts AS gc ON o.groups_carts_id = gc.id
    JOIN groups AS g ON gc.group_id = g.id
    JOIN group_deals AS gd ON g.group_deals_id = gd.id
    LEFT JOIN products AS p ON gd.product_id = p.id
    LEFT JOIN product_names AS pn ON pn.id = p.name_id
    WHERE
        o._peerdb_is_deleted = 0
        AND gc._peerdb_is_deleted = 0
        AND g._peerdb_is_deleted = 0
        AND gd._peerdb_is_deleted = 0
        AND o.status = 'COMPLETED' AND o.deleted_at IS NULL
        AND gc.status = 'COMPLETED' AND gc.deleted_at IS NULL
        AND g.status = 'COMPLETED' AND g.deleted_at IS NULL
        AND o.created_at >= toDateTime('{date_from} 00:00:00')
        AND o.created_at < toDateTime('{date_to} 23:59:59')
    GROUP BY gd.product_id
    HAVING total_volume_kg > 0
    ORDER BY total_volume_kg DESC
    """
    
    try:
        result = client.query(query)
        
        products = []
        for row in result.result_rows:
            product_name = row[0] if row[0] else f"Product_{row[1]}"
            products.append({
                'product_name': str(product_name),
                'product_id': row[1],
                'volume_kg': float(row[2]),
                'order_count': int(row[3])
            })
        
        return products
    except Exception as e:
        print(f"Error querying ClickHouse for product list: {e}")
        return None

def main():
    print("=" * 80)
    print("PRODUCT COUNT COMPARISON TEST")
    print("=" * 80)
    print()
    
    # Date range: Nov 24-30, 2025
    date_from = "2025-11-24"
    date_to = "2025-11-30"
    
    print(f"Date Range: {date_from} to {date_to}")
    print()
    
    # Count unique products from ClickHouse
    print("Querying ClickHouse for unique products...")
    count_result = count_unique_products_clickhouse(date_from, date_to)
    
    if count_result:
        print(f"✅ ClickHouse Unique Products: {count_result['unique_products']}")
        print(f"✅ ClickHouse Total Volume: {count_result['total_volume_kg']:.2f} kg")
        print()
    else:
        print("❌ Failed to get count from ClickHouse")
        return
    
    # Get product list from ClickHouse
    print("Getting product list from ClickHouse...")
    products = get_product_list_clickhouse(date_from, date_to)
    
    if products:
        print(f"✅ ClickHouse Product List: {len(products)} products")
        print()
        print("Top 20 products by volume:")
        for i, p in enumerate(products[:20], 1):
            print(f"  {i}. {p['product_name']}: {p['volume_kg']:.2f} kg ({p['order_count']} orders)")
        print()
        
        # Check for products with zero volume (shouldn't happen due to filter)
        zero_volume = [p for p in products if p['volume_kg'] <= 0]
        if zero_volume:
            print(f"⚠️  WARNING: {len(zero_volume)} products with zero volume found!")
        else:
            print("✅ All products have volume > 0")
    else:
        print("❌ Failed to get product list from ClickHouse")
        return
    
    print()
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"ClickHouse Unique Products (Nov 24-30, 2025): {count_result['unique_products']}")
    print(f"ClickHouse Total Volume: {count_result['total_volume_kg']:.2f} kg")
    print()
    print("Please compare this with the dashboard count!")
    print("Dashboard should show the same or similar number of products.")
    print()

if __name__ == "__main__":
    main()

