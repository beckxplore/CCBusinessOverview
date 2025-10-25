from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import clickhouse_connect
import os
from dotenv import load_dotenv
import logging
from typing import List, Dict, Any
import json

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ClickHouse configuration
CLICKHOUSE_HOST = os.getenv('CLICKHOUSE_HOST')
CLICKHOUSE_PORT = int(os.getenv('CLICKHOUSE_PORT_STR', '8123'))
CLICKHOUSE_USER = os.getenv('CLICKHOUSE_USER')
CLICKHOUSE_PASSWORD = os.getenv('CLICKHOUSE_PASSWORD')
CLICKHOUSE_DATABASE = os.getenv('CLICKHOUSE_DATABASE')
CLICKHOUSE_SECURE = os.getenv('CLICKHOUSE_SECURE_STR', 'false').lower() == 'true'
CLICKHOUSE_VERIFY = os.getenv('CLICKHOUSE_VERIFY_STR', 'false').lower() == 'true'

# Initialize FastAPI app
app = FastAPI(
    title="Delivery Map Analytics API",
    description="API for delivery data analytics and mapping",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_clickhouse_client():
    """Create a new ClickHouse client instance."""
    try:
        logger.info(f"Connecting to ClickHouse at {CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}")
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
        # Test the connection
        client.query("SELECT 1")
        logger.info("Successfully connected to ClickHouse")
        return client
    except Exception as e:
        logger.error(f"Failed to connect to ClickHouse: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

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
        client = get_clickhouse_client()
        result = client.query("SELECT 1 as test")
        return {
            "status": "healthy",
            "database": "connected",
            "message": "API and database are operational"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

@app.get("/api/data")
async def get_delivery_data():
    """Fetch delivery data from ClickHouse."""
    try:
        client = get_clickhouse_client()
        
        # Your SQL query
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
        JOIN groups_carts AS gc
            ON o.groups_carts_id = gc.id
        JOIN groups AS g
            ON gc.group_id = g.id
        JOIN group_deals AS gd
            ON g.group_deals_id = gd.id
        JOIN delivery_location AS dl
            ON o.location_id = dl.id
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
        
        logger.info("Executing ClickHouse query...")
        result = client.query(query)
        
        # Convert to list of dictionaries
        data = []
        for row in result.result_rows:
            # Parse coordinates
            lat, lon = parse_coordinates(row[2])  # delivery_coordinates
            
            data.append({
                "group_deal_category": row[0],
                "group_created_by": row[1],
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

@app.get("/api/statistics")
async def get_statistics():
    """Get aggregated statistics."""
    try:
        client = get_clickhouse_client()
        
        # Get basic statistics
        stats_query = """
        SELECT
            COUNT(*) as total_records,
            COUNT(DISTINCT CASE WHEN group_deal_category = 'NORMAL_GROUPS' THEN 1 END) as normal_groups,
            COUNT(DISTINCT CASE WHEN group_deal_category = 'SUPER_GROUPS' THEN 1 END) as super_groups,
            SUM(total_orders) as total_orders,
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
                        toFloat64OrZero(splitByChar(' ', replaceOne(replaceOne(dl.location, 'POINT(', ''), ')', ''))[1])
                    ELSE 0
                END as latitude,
                CASE
                    WHEN dl.location LIKE 'POINT(%' THEN
                        toFloat64OrZero(splitByChar(' ', replaceOne(replaceOne(dl.location, 'POINT(', ''), ')', ''))[0])
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
            "totalOrders": int(row[3]),
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
    uvicorn.run(app, host="0.0.0.0", port=8000)
