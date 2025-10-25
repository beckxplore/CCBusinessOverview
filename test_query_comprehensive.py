#!/usr/bin/env python3
"""
Comprehensive test to understand database structure and verify query correctness
"""
import sys
sys.path.insert(0, '/Users/tesfa/Documents/SGL')

from clickhouse_connectivity import get_clickhouse_client

def test_table_structure():
    """Test and understand the table structure"""
    print("=" * 70)
    print("TEST 1: DATABASE STRUCTURE")
    print("=" * 70)
    
    client = get_clickhouse_client()
    
    tables = ['orders', 'groups_carts', 'groups', 'group_deals', 'delivery_location']
    
    for table in tables:
        print(f"\n📊 Table: {table}")
        print("-" * 70)
        
        # Get table structure
        structure_query = f"DESCRIBE TABLE {table}"
        try:
            result = client.query(structure_query)
            print(f"Columns ({len(result.result_rows)}):")
            for row in result.result_rows[:10]:  # Show first 10 columns
                print(f"  - {row[0]}: {row[1]}")
            if len(result.result_rows) > 10:
                print(f"  ... and {len(result.result_rows) - 10} more columns")
        except Exception as e:
            print(f"  Error: {e}")
        
        # Get row count
        count_query = f"SELECT COUNT(*) FROM {table}"
        try:
            result = client.query(count_query)
            count = result.result_rows[0][0]
            print(f"Total Rows: {count:,}")
        except Exception as e:
            print(f"  Error: {e}")

def test_relationships():
    """Test and understand table relationships"""
    print("\n" + "=" * 70)
    print("TEST 2: TABLE RELATIONSHIPS")
    print("=" * 70)
    
    client = get_clickhouse_client()
    
    # Test orders -> groups_carts relationship
    print("\n📊 Test: orders -> groups_carts")
    query = """
    SELECT 
        COUNT(DISTINCT o.id) as orders,
        COUNT(DISTINCT o.groups_carts_id) as unique_groups_carts
    FROM orders o
    WHERE o.status = 'COMPLETED'
      AND o.deleted_at IS NULL
      AND o.created_at >= '2025-10-01 00:00:00'
      AND o.created_at < '2025-11-01 00:00:00'
    """
    result = client.query(query)
    print(f"  Orders: {result.result_rows[0][0]:,}")
    print(f"  Unique groups_carts: {result.result_rows[0][1]:,}")
    
    # Test groups_carts -> groups relationship
    print("\n📊 Test: groups_carts -> groups")
    query = """
    SELECT 
        COUNT(DISTINCT gc.id) as groups_carts,
        COUNT(DISTINCT gc.group_id) as unique_groups
    FROM orders o
    JOIN groups_carts gc ON o.groups_carts_id = gc.id
    WHERE o.status = 'COMPLETED'
      AND gc.status = 'COMPLETED'
      AND o.deleted_at IS NULL
      AND o.created_at >= '2025-10-01 00:00:00'
      AND o.created_at < '2025-11-01 00:00:00'
    """
    result = client.query(query)
    print(f"  Unique groups_carts: {result.result_rows[0][0]:,}")
    print(f"  Unique groups: {result.result_rows[0][1]:,}")
    
    # Test one-to-many relationships
    print("\n📊 Test: Check for one-to-many relationships")
    query = """
    SELECT 
        'orders per groups_carts' as relationship,
        COUNT(*) as total_orders,
        COUNT(DISTINCT o.groups_carts_id) as unique_groups_carts,
        CAST(COUNT(*) AS Float64) / COUNT(DISTINCT o.groups_carts_id) as avg_orders_per_cart
    FROM orders o
    WHERE o.status = 'COMPLETED'
      AND o.deleted_at IS NULL
      AND o.created_at >= '2025-10-01 00:00:00'
      AND o.created_at < '2025-11-01 00:00:00'
    """
    result = client.query(query)
    row = result.result_rows[0]
    print(f"  Total orders: {row[1]:,}")
    print(f"  Unique groups_carts: {row[2]:,}")
    print(f"  Avg orders per cart: {row[3]:.2f}")
    print(f"  ⚠️ This means: Each groups_cart can have multiple orders!")

def test_day_counting():
    """Test day counting logic"""
    print("\n" + "=" * 70)
    print("TEST 3: DAY COUNTING VERIFICATION")
    print("=" * 70)
    
    client = get_clickhouse_client()
    
    # Simple day count
    print("\n📊 Method 1: Simple day count (no JOINs)")
    query = """
    SELECT
        toDayOfWeek(o.created_at) AS day,
        COUNT(DISTINCT o.id) AS orders
    FROM orders o
    WHERE o.status = 'COMPLETED'
      AND o.deleted_at IS NULL
      AND o.created_at >= '2025-10-01 00:00:00'
      AND o.created_at < '2025-11-01 00:00:00'
    GROUP BY day
    ORDER BY day
    """
    result = client.query(query)
    simple_totals = {}
    day_names = {1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 
                 5: 'Friday', 6: 'Saturday', 7: 'Sunday'}
    for row in result.result_rows:
        day_name = day_names[row[0]]
        simple_totals[day_name] = row[1]
        print(f"  {day_name}: {row[1]:,}")
    
    simple_sum = sum(simple_totals.values())
    print(f"  Sum: {simple_sum:,}")
    
    # With JOINs and COUNT DISTINCT CASE
    print("\n📊 Method 2: With JOINs using COUNT(DISTINCT CASE ...)")
    query = """
    SELECT
        COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 1 THEN o.id END) AS monday,
        COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 2 THEN o.id END) AS tuesday,
        COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 3 THEN o.id END) AS wednesday,
        COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 4 THEN o.id END) AS thursday,
        COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 5 THEN o.id END) AS friday,
        COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 6 THEN o.id END) AS saturday,
        COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 7 THEN o.id END) AS sunday,
        COUNT(DISTINCT o.id) AS total
    FROM orders o
    JOIN groups_carts gc ON o.groups_carts_id = gc.id
    JOIN groups g ON gc.group_id = g.id
    JOIN group_deals gd ON g.group_deals_id = gd.id
    JOIN delivery_location dl ON o.location_id = dl.id
    WHERE o.status = 'COMPLETED'
      AND gc.status = 'COMPLETED'
      AND o.deleted_at IS NULL
      AND o.created_at >= '2025-10-01 00:00:00'
      AND o.created_at < '2025-11-01 00:00:00'
    """
    result = client.query(query)
    row = result.result_rows[0]
    with_joins_totals = {
        'Monday': row[0],
        'Tuesday': row[1],
        'Wednesday': row[2],
        'Thursday': row[3],
        'Friday': row[4],
        'Saturday': row[5],
        'Sunday': row[6],
        'Total': row[7]
    }
    for day, count in with_joins_totals.items():
        print(f"  {day}: {count:,}")
    
    with_joins_sum = sum(list(with_joins_totals.values())[:-1])  # Exclude total
    print(f"  Sum of days: {with_joins_sum:,}")
    
    # Compare
    print("\n📊 Comparison:")
    print(f"  Method 1 (simple) sum: {simple_sum:,}")
    print(f"  Method 2 (with JOINs) sum: {with_joins_sum:,}")
    print(f"  Method 2 total: {with_joins_totals['Total']:,}")
    if simple_sum == with_joins_sum == with_joins_totals['Total']:
        print("  ✅ ALL METHODS MATCH!")
    else:
        print("  ❌ METHODS DON'T MATCH!")

def test_group_by_logic():
    """Test the GROUP BY logic that causes duplicates"""
    print("\n" + "=" * 70)
    print("TEST 4: GROUP BY LOGIC (Root cause of duplicates)")
    print("=" * 70)
    
    client = get_clickhouse_client()
    
    print("\n📊 Test: How many rows are returned when grouped by location+creator")
    query = """
    SELECT COUNT(*) as total_rows
    FROM (
        SELECT
            g.created_by,
            dl.name as location_name,
            COUNT(DISTINCT o.id) as total_orders
        FROM orders o
        JOIN groups_carts gc ON o.groups_carts_id = gc.id
        JOIN groups g ON gc.group_id = g.id
        JOIN group_deals gd ON g.group_deals_id = gd.id
        JOIN delivery_location dl ON o.location_id = dl.id
        WHERE o.status = 'COMPLETED'
          AND gc.status = 'COMPLETED'
          AND o.deleted_at IS NULL
          AND o.created_at >= '2025-10-01 00:00:00'
          AND o.created_at < '2025-11-01 00:00:00'
        GROUP BY g.created_by, dl.name
    )
    """
    result = client.query(query)
    print(f"  Total grouped rows: {result.result_rows[0][0]:,}")
    
    print("\n📊 Test: Sum of total_orders across all grouped rows")
    query = """
    SELECT SUM(total_orders) as sum_total
    FROM (
        SELECT
            g.created_by,
            dl.name as location_name,
            COUNT(DISTINCT o.id) as total_orders
        FROM orders o
        JOIN groups_carts gc ON o.groups_carts_id = gc.id
        JOIN groups g ON gc.group_id = g.id
        JOIN group_deals gd ON g.group_deals_id = gd.id
        JOIN delivery_location dl ON o.location_id = dl.id
        WHERE o.status = 'COMPLETED'
          AND gc.status = 'COMPLETED'
          AND o.deleted_at IS NULL
          AND o.created_at >= '2025-10-01 00:00:00'
          AND o.created_at < '2025-11-01 00:00:00'
        GROUP BY g.created_by, dl.name
    )
    """
    result = client.query(query)
    sum_grouped = result.result_rows[0][0]
    print(f"  Sum of total_orders: {sum_grouped:,}")
    
    print("\n📊 Test: Actual unique orders")
    query = """
    SELECT COUNT(DISTINCT o.id) as unique_orders
    FROM orders o
    JOIN groups_carts gc ON o.groups_carts_id = gc.id
    WHERE o.status = 'COMPLETED'
      AND gc.status = 'COMPLETED'
      AND o.deleted_at IS NULL
      AND o.created_at >= '2025-10-01 00:00:00'
      AND o.created_at < '2025-11-01 00:00:00'
    """
    result = client.query(query)
    unique_orders = result.result_rows[0][0]
    print(f"  Unique orders: {unique_orders:,}")
    
    print("\n📊 Analysis:")
    print(f"  Sum across grouped rows: {sum_grouped:,}")
    print(f"  Actual unique orders: {unique_orders:,}")
    if sum_grouped == unique_orders:
        print("  ✅ NO DUPLICATION! Grouping is correct.")
    else:
        print(f"  ❌ DUPLICATION! Difference: {sum_grouped - unique_orders:,}")

def test_final_query():
    """Test the final query we're using"""
    print("\n" + "=" * 70)
    print("TEST 5: FINAL QUERY VALIDATION")
    print("=" * 70)
    
    client = get_clickhouse_client()
    
    query = """
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
        COUNT(DISTINCT CASE WHEN toDayOfWeek(o.created_at) = 7 THEN o.id END) AS sunday_orders,
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
    GROUP BY group_deal_category
    """
    
    result = client.query(query)
    
    print("\n📊 Final Query Results:")
    for row in result.result_rows:
        group_type = row[0]
        days = {
            'Monday': row[1],
            'Tuesday': row[2],
            'Wednesday': row[3],
            'Thursday': row[4],
            'Friday': row[5],
            'Saturday': row[6],
            'Sunday': row[7],
        }
        total = row[8]
        sum_days = sum(days.values())
        
        print(f"\n  {group_type}:")
        print(f"    Total Orders: {total:,}")
        for day, count in days.items():
            print(f"    {day}: {count:,}")
        print(f"    Sum of days: {sum_days:,}")
        if sum_days == total:
            print(f"    ✅ Consistent!")
        else:
            print(f"    ❌ Inconsistent! Difference: {total - sum_days:,}")

if __name__ == "__main__":
    try:
        test_table_structure()
        test_relationships()
        test_day_counting()
        test_group_by_logic()
        test_final_query()
        
        print("\n" + "=" * 70)
        print("✅ ALL TESTS COMPLETED!")
        print("=" * 70)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

