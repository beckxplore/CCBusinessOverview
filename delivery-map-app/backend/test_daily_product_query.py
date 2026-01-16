"""Test script to check the daily product sales query response structure"""
import os
from dotenv import load_dotenv
import clickhouse_connect
import json
from datetime import datetime

load_dotenv()

# ClickHouse configuration
CLICKHOUSE_HOST = os.getenv('CLICKHOUSE_HOST')
CLICKHOUSE_PORT = int(os.getenv('CLICKHOUSE_PORT_STR', '8123'))
CLICKHOUSE_USER = os.getenv('CLICKHOUSE_USER')
CLICKHOUSE_PASSWORD = os.getenv('CLICKHOUSE_PASSWORD')
CLICKHOUSE_DATABASE = os.getenv('CLICKHOUSE_DATABASE')
CLICKHOUSE_SECURE = os.getenv('CLICKHOUSE_SECURE_STR', 'false').lower() == 'true'
CLICKHOUSE_VERIFY = os.getenv('CLICKHOUSE_VERIFY_STR', 'false').lower() == 'true'

query = """
WITH base AS (
    SELECT
        toDate(o.created_at) AS order_date,
        pn.name AS product_name,
        gc.quantity AS qty,
        gd.deal_type
    FROM orders o
    JOIN groups_carts gc ON gc.id = o.groups_carts_id
        AND gc.status = 'COMPLETED'
        AND gc.deleted_at IS NULL
    JOIN groups g ON g.id = gc.group_id
        AND g.status = 'COMPLETED'
        AND g.deleted_at IS NULL
    JOIN group_deals gd ON gd.id = g.group_deals_id
    JOIN products p ON p.id = gd.product_id
    JOIN product_names pn ON pn.id = p.name_id
    WHERE
        o.status = 'COMPLETED'
        AND o.deleted_at IS NULL
        AND o.created_at >= '2025-04-01'
)
SELECT
    order_date AS date,
    product_name,
    sum(qty) AS total_volume,
    sumIf(qty, deal_type NOT IN ('SUPER_GROUP','SUPER_GROUP_FLASH_SALE')) AS volume_normal_group,
    sumIf(qty, deal_type IN ('SUPER_GROUP','SUPER_GROUP_FLASH_SALE')) AS volume_super_group
FROM base
GROUP BY order_date, product_name
ORDER BY date, product_name
LIMIT 10
"""

def main():
    try:
        print("Connecting to ClickHouse...")
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
        
        print("Executing query...")
        result = client.query(query)
        
        print(f"\nQuery executed successfully!")
        print(f"Number of rows: {result.row_count}")
        print(f"\nColumn names: {result.column_names}")
        print(f"\nFirst few rows:")
        print("-" * 80)
        
        # Print first 5 rows
        for i, row in enumerate(result.result_rows[:5]):
            print(f"\nRow {i+1}:")
            for col_name, value in zip(result.column_names, row):
                print(f"  {col_name}: {value} (type: {type(value).__name__})")
        
        # Save full result to JSON for inspection
        data = []
        for row in result.result_rows:
            row_dict = {}
            for col_name, value in zip(result.column_names, row):
                # Convert date objects to strings
                if isinstance(value, datetime):
                    row_dict[col_name] = value.isoformat()
                else:
                    row_dict[col_name] = value
            data.append(row_dict)
        
        with open('query_result_sample.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"\n\nFull result saved to query_result_sample.json")
        print(f"Total rows: {len(data)}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

