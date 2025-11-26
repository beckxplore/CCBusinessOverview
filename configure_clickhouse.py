#!/usr/bin/env python3
"""
ClickHouse Configuration Helper
This script helps you configure your ClickHouse connection details.
"""

import os
import sys

def configure_clickhouse():
    print("🔧 ClickHouse Configuration Helper")
    print("=" * 40)
    print()
    
    # Get current .env file path
    env_path = "/Users/tesfa/Documents/SGL/.env"
    
    print("Please provide your ClickHouse connection details:")
    print()
    
    # Get connection details from user
    host = input("Host (e.g., localhost, IP address, or domain): ").strip()
    port = input("Port (usually 8123 or 9000): ").strip()
    username = input("Username: ").strip()
    password = input("Password: ").strip()
    database = input("Database name: ").strip()
    
    # Ask about SSL
    secure = input("Use SSL? (y/n): ").strip().lower() == 'y'
    verify = input("Verify SSL certificate? (y/n): ").strip().lower() == 'y'
    
    print()
    print("📝 Updating .env file...")
    
    # Create .env content
    env_content = f"""# ClickHouse Database Configuration
CLICKHOUSE_HOST={host}
CLICKHOUSE_PORT_STR={port}
CLICKHOUSE_USER={username}
CLICKHOUSE_PASSWORD={password}
CLICKHOUSE_DATABASE={database}
CLICKHOUSE_SECURE_STR={str(secure).lower()}
CLICKHOUSE_VERIFY_STR={str(verify).lower()}
"""
    
    # Write to .env file
    try:
        with open(env_path, 'w') as f:
            f.write(env_content)
        print("✅ .env file updated successfully!")
    except Exception as e:
        print(f"❌ Error updating .env file: {e}")
        return False
    
    print()
    print("🧪 Testing connection...")
    
    # Test the connection
    try:
        from clickhouse_connectivity import get_clickhouse_client
        client = get_clickhouse_client()
        result = client.query("SELECT 1 as test")
        print("✅ ClickHouse connection successful!")
        print(f"Test query result: {result.result_rows[0][0]}")
        return True
    except Exception as e:
        print(f"❌ ClickHouse connection failed: {e}")
        print()
        print("Please check your connection details and try again.")
        return False

if __name__ == "__main__":
    configure_clickhouse()
