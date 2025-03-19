from fastapi import APIRouter, HTTPException
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
async def get_routes(vrf: Optional[str] = "all"):
    """
    Get routing table information from VyOS
    
    Args:
        vrf: VRF to query (default: "all" to show all VRFs)
    
    Returns:
        Structured routing table data
    """
    try:
        # Prepare data for VyOS API to fetch route data
        data = {
            "op": "show",
            "path": ["ip", "route", "vrf", vrf, "json"]
        }
        
        # Configure the show URL
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
                    "response_text": response.text
                }
            
            result = response.json()
            print(f"Raw API response: {json.dumps(result)}")
            
            # If successful, parse the routes data
            if result.get("success", False) and result.get("data"):
                # Parse the routing data which comes as a JSON string
                try:
                    # The data comes as a string containing JSON, parse it
                    routes_data = parse_routing_data(result["data"])
                    print(f"Parsed routes data: {json.dumps(routes_data)}")
                    return {
                        "success": True,
                        "routes": routes_data,
                        "raw_data": result["data"],
                        "error": None
                    }
                except Exception as e:
                    print(f"Error parsing routes data: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    return {
                        "success": False,
                        "error": f"Error parsing routes data: {str(e)}",
                        "raw_data": result["data"]
                    }
            
            return {
                "success": result.get("success", False),
                "routes": {},
                "data": result.get("data", {}),
                "raw_result": result,
                "error": result.get("error")
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