from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sys
import os
import logging
from typing import List, Dict, Any
import json
import csv
import io

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
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175"],
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

def parse_csv_line(line: str) -> List[str]:
    """Parse CSV line handling quoted fields."""
    result = []
    current = ''
    in_quotes = False
    
    for i in range(len(line)):
        char = line[i]
        
        if char == '"':
            in_quotes = not in_quotes
        elif char == ',' and not in_quotes:
            result.append(current.strip())
            current = ''
        else:
            current += char
    
    result.append(current.strip())
    return result

def load_csv_data() -> List[Dict[str, Any]]:
    """Load data from CSV file."""
    try:
        # Try multiple possible paths for the CSV file
        possible_paths = [
            '../public/data.csv',
            '../../delivery-map-app/public/data.csv',
            os.path.join(os.path.dirname(__file__), '..', 'public', 'data.csv'),
            'D:/Beck/AI/2025/SGL/delivery-map-app/public/data.csv'
        ]
        
        csv_path = None
        for path in possible_paths:
            if os.path.exists(path):
                csv_path = path
                break
        
        if not csv_path:
            csv_path = possible_paths[0]  # Default to first path for error message
        
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"CSV file not found: {csv_path}")
        
        data = []
        with open(csv_path, 'r', encoding='utf-8') as file:
            lines = file.readlines()
            
        if len(lines) < 2:
            raise ValueError("CSV file is empty or has no data rows")
            
        headers = parse_csv_line(lines[0].strip())
        
        for i in range(1, len(lines)):
            line = lines[i].strip()
            if not line:
                continue
                
            values = parse_csv_line(line)
            if len(values) == len(headers):
                item = {}
                for j, header in enumerate(headers):
                    value = values[j]
                    if header in ['unique_group_members', 'total_groups', 'monday_orders', 'tuesday_orders', 
                                 'wednesday_orders', 'thursday_orders', 'friday_orders', 'saturday_orders', 
                                 'sunday_orders', 'active_days', 'total_orders']:
                        item[header] = int(value) if value else 0
                    else:
                        item[header] = value
                
                # Parse coordinates
                lat, lon = parse_coordinates(item.get('delivery_coordinates', ''))
                item['latitude'] = lat
                item['longitude'] = lon
                
                # Add new fields with default values if not in CSV
                if 'leader_name' not in item:
                    item['leader_name'] = None
                if 'leader_phone' not in item:
                    item['leader_phone'] = None
                if 'total_kg' not in item:
                    item['total_kg'] = 0.0
                if 'last_order_date' not in item:
                    item['last_order_date'] = None
                if 'products_ordered' not in item:
                    item['products_ordered'] = 0
                if 'avg_kg_per_ordering_day' not in item:
                    item['avg_kg_per_ordering_day'] = 0.0
                
                data.append(item)
        
        logger.info(f"Loaded {len(data)} records from CSV")
        return data
        
    except Exception as e:
        logger.error(f"Error loading CSV data: {str(e)}")
        raise

# Load data once at startup
try:
    csv_data = load_csv_data()
    logger.info(f"Successfully loaded {len(csv_data)} records from CSV")
except Exception as e:
    logger.error(f"Failed to load CSV data: {str(e)}")
    csv_data = []

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "Delivery Map Analytics API is running", "status": "healthy"}

@app.get("/api/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "database": "csv_fallback",
        "message": "API is running with CSV data fallback"
    }

@app.get("/api/data")
async def get_delivery_data():
    """Fetch delivery data from CSV."""
    try:
        if not csv_data:
            raise HTTPException(status_code=500, detail="No data available")
        
        # Filter out invalid coordinates
        valid_data = [item for item in csv_data if item.get('latitude', 0) != 0 and item.get('longitude', 0) != 0]
        
        return {"data": valid_data, "count": len(valid_data)}
        
    except Exception as e:
        logger.error(f"Error fetching data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch data: {str(e)}")

@app.get("/api/statistics")
async def get_statistics():
    """Get aggregated statistics."""
    try:
        if not csv_data:
            raise HTTPException(status_code=500, detail="No data available")
        
        valid_data = [item for item in csv_data if item.get('latitude', 0) != 0 and item.get('longitude', 0) != 0]
        
        if not valid_data:
            raise HTTPException(status_code=500, detail="No valid data available")
        
        normal_groups = [item for item in valid_data if item.get('group_deal_category') == 'NORMAL_GROUPS']
        super_groups = [item for item in valid_data if item.get('group_deal_category') == 'SUPER_GROUPS']
        
        total_orders = sum(item.get('total_orders', 0) for item in valid_data)
        max_orders = max(item.get('total_orders', 0) for item in valid_data)
        unique_locations = len(set(item.get('delivery_location_name', '') for item in valid_data))
        avg_members = sum(item.get('unique_group_members', 0) for item in valid_data) / len(valid_data)
        
        latitudes = [item.get('latitude', 0) for item in valid_data if item.get('latitude', 0) != 0]
        longitudes = [item.get('longitude', 0) for item in valid_data if item.get('longitude', 0) != 0]
        
        return {
            "totalRecords": len(valid_data),
            "normalGroups": len(normal_groups),
            "superGroups": len(super_groups),
            "totalOrders": total_orders,
            "avgOrdersPerGroup": total_orders / len(valid_data) if valid_data else 0,
            "maxOrders": max_orders,
            "uniqueLocations": unique_locations,
            "avgMembersPerGroup": avg_members,
            "geographicBounds": {
                "minLat": min(latitudes) if latitudes else 0,
                "maxLat": max(latitudes) if latitudes else 0,
                "minLon": min(longitudes) if longitudes else 0,
                "maxLon": max(longitudes) if longitudes else 0
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch statistics: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
