"""Geocoding utility to convert location names to coordinates."""
import os
import logging
from typing import Optional, Tuple, Dict
from functools import lru_cache
import httpx

logger = logging.getLogger(__name__)

# Known locations in Addis Ababa area with approximate coordinates
# These are common benchmark locations
LOCATION_MAPPING: Dict[str, Tuple[float, float]] = {
    # Local shops
    "benchmark location 5 Suk Lideta": (9.0175, 38.7464),  # Suk Lideta area
    "benchmark location 9 Sholla": (9.0272, 38.7361),  # Sholla area
    "benchmark location 4 Suk Arada": (9.0308, 38.7500),  # Suk Arada
    "benchmark location 6 Suk Gulele": (9.0500, 38.7400),  # Suk Gulele
    "benchmark location 8 Merkato": (9.0245, 38.7433),  # Merkato area
    # Distribution centers
    "Distribution center 2 Garment": (9.0000, 38.7300),
    "Distribution center 3 02": (9.0100, 38.7400),
    "Distribution center 4 6Killo": (9.0150, 38.7600),  # 6 Kilo area
    "Distribution center 5 Ayat Yafo": (8.9500, 38.7800),
    # Supermarkets
    "benchmark location 3 supermarket FreshCorner": (9.0200, 38.7450),
    # Ecommerce locations
    "ZemenGebeya -YegnaGebeya": (9.0150, 38.7500),
    "ZemenGebeya -Ecomart": (9.0150, 38.7500),
    "AradaMart": (9.0300, 38.7500),
    # Farm locations
    "Oromia": (9.0000, 38.7000),  # Oromia region, approximate center
    # Chipchip
    "chipchip": (9.0250, 38.7450),  # ChipChip central location
}


@lru_cache(maxsize=1000)
def geocode_location(location_name: str, location_group: Optional[str] = None) -> Optional[Tuple[float, float]]:
    """
    Geocode a location name to (latitude, longitude).
    
    First checks the local mapping, then tries Nominatim if not found.
    
    Args:
        location_name: The location name to geocode
        location_group: Optional location group for context
        
    Returns:
        Tuple of (lat, lon) or None if geocoding fails
    """
    if not location_name:
        return None
    
    location_name = location_name.strip()
    
    # Check local mapping first
    if location_name in LOCATION_MAPPING:
        coords = LOCATION_MAPPING[location_name]
        logger.debug(f"Found {location_name} in local mapping: {coords}")
        return coords
    
    # Try with location group context
    if location_group:
        key_with_group = f"{location_name} ({location_group})"
        if key_with_group in LOCATION_MAPPING:
            return LOCATION_MAPPING[key_with_group]
    
    # Try Nominatim geocoding (OpenStreetMap)
    try:
        with httpx.Client(timeout=5.0) as client:
            # Add Addis Ababa context for better results
            query = f"{location_name}, Addis Ababa, Ethiopia"
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                "q": query,
                "format": "json",
                "limit": 1,
                "addressdetails": 0,
            }
            headers = {
                "User-Agent": "SGL-Delivery-Analytics/1.0",  # Required by Nominatim
            }
            response = client.get(url, params=params, headers=headers)
            response.raise_for_status()
            results = response.json()
            
            if results:
                lat = float(results[0]["lat"])
                lon = float(results[0]["lon"])
                logger.info(f"Geocoded {location_name} via Nominatim: ({lat}, {lon})")
                # Cache this result by adding to mapping (will persist in memory)
                LOCATION_MAPPING[location_name] = (lat, lon)
                return (lat, lon)
    except Exception as e:
        logger.warning(f"Geocoding failed for {location_name}: {e}")
    
    # If all else fails, try to extract coordinates from location name
    # Some location names might have coordinates embedded
    logger.warning(f"Could not geocode location: {location_name}")
    return None


def batch_geocode_locations(locations: Dict[str, Optional[str]]) -> Dict[str, Tuple[float, float]]:
    """
    Batch geocode multiple locations.
    
    Args:
        locations: Dict mapping location names to optional location groups
        
    Returns:
        Dict mapping location names to (lat, lon) coordinates
    """
    results = {}
    for location_name, location_group in locations.items():
        coords = geocode_location(location_name, location_group)
        if coords:
            results[location_name] = coords
    return results

