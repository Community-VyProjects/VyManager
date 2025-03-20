from fastapi import APIRouter, Request, HTTPException
import httpx
import json
import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Environment settings
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT.lower() == "production"

# API and security settings
API_KEY = os.getenv("VYOS_API_KEY", "")
VYOS_API_URL = os.getenv("VYOS_API_URL", "")
CERT_PATH = os.getenv("CERT_PATH", "")
TRUST_SELF_SIGNED = os.getenv("TRUST_SELF_SIGNED", "false").lower() == "true"

# Create router
router = APIRouter()

@router.get("/routes")
async def get_routes():
    """Get all routes from VyOS in a structured format."""
    try:
        # Prepare data for VyOS API to fetch routes
        data = {
            "op": "show",
            "path": ["ip", "route", "vrf", "all", "json"]
        }
        
        # Use the show endpoint
        show_url = VYOS_API_URL.replace("/retrieve", "/show")
        
        print(f"Making API call to: {show_url}")
        print(f"With data: {json.dumps(data)}")
        
        # Configure client with proper cert validation
        client_kwargs = {"timeout": 10.0}
        
        # Handle certificate verification based on settings
        if TRUST_SELF_SIGNED:
            client_kwargs["verify"] = False
            print("Using insecure connection (ignoring SSL certificate verification)")
        elif CERT_PATH:
            client_kwargs["verify"] = CERT_PATH
            print(f"Using custom certificate: {CERT_PATH}")
        
        async with httpx.AsyncClient(**client_kwargs) as client:
            response = await client.post(
                show_url,
                files={
                    'data': (None, json.dumps(data)),
                    'key': (None, API_KEY)
                }
            )
            
            if response.status_code != 200:
                print(f"Error status code: {response.status_code}")
                try:
                    print(f"Error response body: {response.text}")
                except:
                    print("Could not print response body")
                return {
                    "success": False,
                    "error": f"VyOS API returned status code {response.status_code}",
                }
            
            result = response.json()
            print(f"Raw API response: {json.dumps(result)}")
            
            # The data is a JSON string within the JSON response
            # We need to properly parse it
            if result.get("success", False) and result.get("data"):
                try:
                    # The issue is that VyOS API is returning a string with JSON that has embedded newlines
                    # Clean up the data string first by replacing problematic newlines
                    raw_data = result["data"]
                    # First attempt - try to clean up the data by replacing newlines properly
                    cleaned_data = raw_data.replace('\\n', ' ').replace('\n', ' ')
                    
                    # Try to parse the entire response as a single JSON object
                    try:
                        json_data = json.loads(cleaned_data)
                        print("Successfully parsed JSON data after cleaning newlines")
                        
                        # Process the routes by VRF
                        routes_by_vrf = {}
                        
                        if isinstance(json_data, dict):
                            # Process each prefix and its routes
                            for prefix, prefix_routes in json_data.items():
                                # Debug logging
                                print(f"Processing prefix: {prefix}")
                                print(f"Type of prefix_routes: {type(prefix_routes)}")
                                
                                # Ensure prefix_routes is a list
                                if not isinstance(prefix_routes, list):
                                    print(f"Warning: prefix_routes is not a list for prefix {prefix}")
                                    continue
                                
                                # Each prefix can have multiple route entries
                                for route in prefix_routes:
                                    # Ensure route is a dictionary
                                    if not isinstance(route, dict):
                                        print(f"Warning: route is not a dictionary: {route}")
                                        continue
                                    
                                    # Get the VRF name from the route, default to "default" if not specified
                                    vrf_name = route.get("vrfName", "default")
                                    
                                    # Initialize the VRF entry if it doesn't exist
                                    if vrf_name not in routes_by_vrf:
                                        routes_by_vrf[vrf_name] = []
                                    
                                    # Process the route
                                    processed_route = {
                                        "prefix": prefix,  # Use prefix as the route prefix
                                        "network": prefix,  # Keep network for backward compatibility
                                        "protocol": route.get("protocol", "unknown"),
                                        "selected": route.get("selected", False),
                                        "installed": route.get("installed", False),
                                        "nexthops": []
                                    }
                                    
                                    # Add other properties that might be useful
                                    if "distance" in route:
                                        processed_route["distance"] = route["distance"]
                                    if "metric" in route:
                                        processed_route["metric"] = route["metric"]
                                    if "uptime" in route:
                                        processed_route["uptime"] = route["uptime"]
                                    
                                    # Process nexthops
                                    if "nexthops" in route:
                                        for nexthop in route["nexthops"]:
                                            processed_nexthop = {
                                                "ip": nexthop.get("ip", ""),
                                                "interfaceName": nexthop.get("interfaceName", ""),
                                                "active": nexthop.get("active", False),
                                                "weight": nexthop.get("weight", 1)
                                            }
                                            processed_route["nexthops"].append(processed_nexthop)
                                    
                                    # Add the processed route to the VRF
                                    routes_by_vrf[vrf_name].append(processed_route)
                        
                        print(f"Successfully parsed routes data for {len(routes_by_vrf)} VRFs")
                        return {
                            "success": True,
                            "routes": routes_by_vrf,
                            "error": None
                        }
                    except json.JSONDecodeError as e:
                        print(f"Error parsing cleaned JSON: {str(e)}")
                        print("Falling back to manual parsing...")
                        
                        # Fallback to the original parsing method with line-by-line processing
                        try:
                            # Split the data by newlines and parse each line separately
                            routes_by_vrf = {}
                            raw_data_lines = result["data"].strip().split('\n')
                            
                            for line in raw_data_lines:
                                if not line.strip():
                                    continue
                                
                                # Try to clean the line before parsing
                                try:
                                    # First try to parse as is
                                    line_data = json.loads(line)
                                except json.JSONDecodeError:
                                    # If that fails, try to clean line by removing internal newlines
                                    cleaned_line = line.replace('\\n', ' ')
                                    try:
                                        line_data = json.loads(cleaned_line)
                                    except json.JSONDecodeError:
                                        print(f"Could not parse line: {line[:100]}...")
                                        continue
                                
                                # Merge the data into the routes_by_vrf dictionary
                                for prefix, routes in line_data.items():
                                    for route in routes:
                                        vrf_name = route.get("vrfName", "default")
                                        
                                        # Create the VRF entry if it doesn't exist
                                        if vrf_name not in routes_by_vrf:
                                            routes_by_vrf[vrf_name] = []
                                        
                                        # Process the route to make it easier to use in the frontend
                                        processed_route = {
                                            "prefix": prefix,  # Use prefix as the route prefix
                                            "network": prefix,  # Keep network for backward compatibility
                                            "protocol": route.get("protocol", "unknown"),
                                            "selected": route.get("selected", False),
                                            "installed": route.get("installed", False),
                                            "nexthops": []
                                        }
                                        
                                        # Add uptime if available
                                        if "uptime" in route:
                                            processed_route["uptime"] = route["uptime"]
                                        
                                        # Process nexthops
                                        if "nexthops" in route:
                                            for nexthop in route["nexthops"]:
                                                processed_nexthop = {
                                                    "ip": nexthop.get("ip", ""),
                                                    "interfaceName": nexthop.get("interfaceName", ""),
                                                    "active": nexthop.get("active", False),
                                                    "distance": route.get("distance", 0),
                                                    "metric": route.get("metric", 0)
                                                }
                                                processed_route["nexthops"].append(processed_nexthop)
                                        
                                        # Add the processed route to the VRF
                                        routes_by_vrf[vrf_name].append(processed_route)
                            
                            print(f"Successfully parsed routes data for {len(routes_by_vrf)} VRFs using fallback method")
                            return {
                                "success": True,
                                "routes": routes_by_vrf,
                                "error": None
                            }
                        except Exception as e:
                            print(f"Fallback parsing failed: {str(e)}")
                            # Try one more approach: manual fix
                            try:
                                # Try to fix the JSON data by finding the actual structure
                                corrected_json = fix_json_structure(raw_data)
                                json_data = json.loads(corrected_json)
                                print("Fixed JSON with manual correction")
                                
                                # Process the data as before
                                routes_by_vrf = {}
                                
                                for vrf_name, vrf_routes in json_data.items():
                                    if vrf_name not in routes_by_vrf:
                                        routes_by_vrf[vrf_name] = []
                                    
                                    # Handle case where vrf_routes is a list
                                    if isinstance(vrf_routes, list):
                                        for route in vrf_routes:
                                            # Process the route directly since it's already in list format
                                            processed_route = {
                                                "prefix": route.get("prefix", ""),  # Try to get prefix from route
                                                "network": route.get("network", ""),  # Try to get network from route
                                                "protocol": route.get("protocol", "unknown"),
                                                "selected": route.get("selected", False),
                                                "installed": route.get("installed", False),
                                                "nexthops": []
                                            }
                                            
                                            # Add other properties that might be useful
                                            if "distance" in route:
                                                processed_route["distance"] = route["distance"]
                                            if "metric" in route:
                                                processed_route["metric"] = route["metric"]
                                            if "uptime" in route:
                                                processed_route["uptime"] = route["uptime"]
                                            
                                            # Process nexthops
                                            if "nexthops" in route:
                                                for nexthop in route["nexthops"]:
                                                    processed_nexthop = {
                                                        "ip": nexthop.get("ip", ""),
                                                        "interfaceName": nexthop.get("interfaceName", ""),
                                                        "active": nexthop.get("active", False),
                                                        "weight": nexthop.get("weight", 1)
                                                    }
                                                    processed_route["nexthops"].append(processed_nexthop)
                                            
                                            # Add the processed route to the VRF
                                            routes_by_vrf[vrf_name].append(processed_route)
                                    else:
                                        # Original dictionary processing
                                        for prefix, prefix_routes in vrf_routes.items():
                                            for route in prefix_routes:
                                                # Process the route
                                                processed_route = {
                                                    "prefix": prefix,  # Use prefix as the route prefix
                                                    "network": prefix,  # Keep network for backward compatibility
                                                    "protocol": route.get("protocol", "unknown"),
                                                    "selected": route.get("selected", False),
                                                    "installed": route.get("installed", False),
                                                    "nexthops": []
                                                }
                                                
                                                # Add other properties that might be useful
                                                if "distance" in route:
                                                    processed_route["distance"] = route["distance"]
                                                if "metric" in route:
                                                    processed_route["metric"] = route["metric"]
                                                if "uptime" in route:
                                                    processed_route["uptime"] = route["uptime"]
                                                
                                                # Process nexthops
                                                if "nexthops" in route:
                                                    for nexthop in route["nexthops"]:
                                                        processed_nexthop = {
                                                            "ip": nexthop.get("ip", ""),
                                                            "interfaceName": nexthop.get("interfaceName", ""),
                                                            "active": nexthop.get("active", False),
                                                            "weight": nexthop.get("weight", 1)
                                                        }
                                                        processed_route["nexthops"].append(processed_nexthop)
                                                
                                                # Add the processed route to the VRF
                                                routes_by_vrf[vrf_name].append(processed_route)
                                
                                print(f"Successfully parsed routes data for {len(routes_by_vrf)} VRFs using manual correction")
                                return {
                                    "success": True,
                                    "routes": routes_by_vrf,
                                    "error": None
                                }
                            except Exception as e:
                                print(f"Manual JSON correction failed: {str(e)}")
                                return {
                                    "success": False,
                                    "error": f"Failed to parse routing data after multiple attempts: {str(e)}",
                                    "raw_data": raw_data[:1000]
                                }
                except json.JSONDecodeError as e:
                    print(f"Error decoding JSON: {str(e)}")
                    print(f"Problematic line: {result['data'][:100]}")
                    
                    return {
                        "success": False,
                        "error": f"Failed to parse routing data: {str(e)}",
                        "raw_data": result["data"][:1000]
                    }
            
            return {
                "success": result.get("success", False),
                "error": result.get("error", "Unknown error"),
            }
            
    except httpx.RequestError as e:
        print(f"Request error: {str(e)}")
        return {
            "success": False,
            "error": f"Error connecting to VyOS API: {str(e)}"
        }
    except Exception as e:
        print(f"Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }

def parse_routing_data(routes_string):
    """
    Parse the routing data string into a structured format.
    
    Args:
        routes_string: Raw string containing JSON routing data
    
    Returns:
        Dict containing structured routing table data organized by VRF
    """
    # First, let's log the raw data for debugging
    print("Raw routes string to parse:")
    print(routes_string)
    
    # The routes data comes as multiple JSON objects, one per line
    # We need to parse each line separately and combine them
    lines = routes_string.strip().split('\n')
    
    # Create a dictionary to hold routes by VRF
    routes_by_vrf = {}
    
    # Process each line as a separate JSON object
    for line in lines:
        if not line.strip():
            continue
            
        try:
            # Parse the JSON object in this line
            route_data = json.loads(line)
            
            # Process each route entry
            for prefix, routes in route_data.items():
                for route in routes:
                    vrf_name = route.get("vrfName", "default")
                    
                    # Create the VRF entry if it doesn't exist
                    if vrf_name not in routes_by_vrf:
                        routes_by_vrf[vrf_name] = []
                    
                    # Add the route to the appropriate VRF
                    routes_by_vrf[vrf_name].append({
                        "prefix": prefix,
                        "protocol": route.get("protocol", "unknown"),
                        "distance": route.get("distance", 0),
                        "metric": route.get("metric", 0),
                        "nexthops": route.get("nexthops", []),
                        "uptime": route.get("uptime", ""),
                        "selected": route.get("selected", False),
                        "destSelected": route.get("destSelected", False),
                        "installed": route.get("installed", False),
                        "internalStatus": route.get("internalStatus", 0),
                        "internalFlags": route.get("internalFlags", 0)
                    })
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {str(e)}")
            print(f"Problematic line: {line}")
            continue
        except Exception as e:
            print(f"Error processing route data: {str(e)}")
            continue
    
    # Sort VRFs to ensure "default" comes first and then alphabetically
    sorted_vrfs = {}
    
    # Add "default" VRF first if it exists
    if "default" in routes_by_vrf:
        sorted_vrfs["default"] = routes_by_vrf["default"]
    
    # Add other VRFs in alphabetical order
    for vrf in sorted(routes_by_vrf.keys()):
        if vrf != "default":
            sorted_vrfs[vrf] = routes_by_vrf[vrf]
    
    return sorted_vrfs 

# Helper function to fix JSON with newlines
def fix_json_structure(json_string):
    """Attempt to fix a malformed JSON string that has embedded newlines"""
    # Replace newlines inside the JSON structure
    return json_string.replace('\\n', ' ').replace('\n', '') 