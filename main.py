from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse
import httpx
import json
import os
import pathlib
from typing import Optional
import random
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get the base directory of the application
BASE_DIR = pathlib.Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"

# Environment settings
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT.lower() == "production"

# API and security settings
API_KEY = os.getenv("VYOS_API_KEY", "")
VYOS_API_URL = os.getenv("VYOS_API_URL", "")
CERT_PATH = os.getenv("CERT_PATH", "")
TRUST_SELF_SIGNED = os.getenv("TRUST_SELF_SIGNED", "false").lower() == "true"

# Log environment settings
print(f"Environment: {ENVIRONMENT}")
print(f"Production Mode: {IS_PRODUCTION}")
print(f"TRUST_SELF_SIGNED: {TRUST_SELF_SIGNED}")

# Security warning for production with self-signed certificates
if IS_PRODUCTION and TRUST_SELF_SIGNED:
    print("WARNING: Using insecure SSL certificate validation in production mode!")
    print("This is a security risk and should only be used in development environments.")
    print("Consider obtaining a valid SSL certificate for production use.")

# Create FastAPI app with appropriate settings
app = FastAPI(
    title="VyOS Configuration Viewer",
    description="A web application for viewing and analyzing VyOS router configurations",
    version="1.0.0",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json"
)

# Security middleware for production
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    if IS_PRODUCTION:
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; font-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src 'self' data:;"
    
    return response

# Mount static files with absolute path
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# Check if required environment variables are set
if not API_KEY:
    print("Warning: VYOS_API_KEY environment variable is not set")
if not VYOS_API_URL:
    print("Warning: VYOS_API_URL environment variable is not set")

# Global variable to cache the full config data
config_cache = None

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "active_page": "home"})

@app.get("/firewall", response_class=HTMLResponse)
async def firewall_view(request: Request):
    return templates.TemplateResponse("firewall.html", {
        "request": request,
        "active_page": "firewall"
    })

@app.get("/interfaces", response_class=HTMLResponse)
async def interfaces_view(request: Request):
    return templates.TemplateResponse("interfaces.html", {
        "request": request,
        "active_page": "interfaces"
    })

@app.get("/dhcp", response_class=HTMLResponse)
async def dhcp_view(request: Request):
    return templates.TemplateResponse("dhcp.html", {
        "request": request,
        "active_page": "dhcp"
    })

@app.get("/section/{path:path}", response_class=HTMLResponse)
async def section_view(request: Request, path: str):
    # Convert path to title
    section_parts = path.split('/')
    section_title = section_parts[-1].replace('-', ' ').title()
    active_page = section_parts[0]
    
    # Use specialized templates for certain sections
    if path == "firewall":
        return templates.TemplateResponse("firewall.html", {
            "request": request,
            "active_page": active_page
        })
    elif path == "interfaces":
        return templates.TemplateResponse("interfaces.html", {
            "request": request,
            "active_page": active_page
        })
    elif path == "service/dhcp-server":
        return templates.TemplateResponse("dhcp.html", {
            "request": request,
            "active_page": "dhcp"
        })
    else:
        # Use generic section template for other sections
        return templates.TemplateResponse("section.html", {
            "request": request,
            "active_page": active_page,
            "section_title": section_title,
            "section_path": path
        })

@app.get("/config")
async def get_config(path: Optional[str] = "", force_refresh: bool = False):
    global config_cache
    
    # If force_refresh is true or path is empty and we don't have cached data, fetch new data
    if force_refresh or (not path and not config_cache):
        # Clear the cache
        config_cache = None
        
        # Parse the path if provided
        path_list = []
        
        if path and path.strip():
            path_list = path.strip().split('/')
            path_list = [p for p in path_list if p]  # Remove empty elements
        
        # Prepare data for VyOS API
        data = {
            "op": "showConfig",
            "path": path_list
        }
        
        # VyOS API uses a bit unusual format with form data
        try:
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
                    VYOS_API_URL,
                    files={
                        'data': (None, json.dumps(data)),
                        'key': (None, API_KEY)
                    }
                )
                
                # Check if the response was successful
                if response.status_code != 200:
                    return {
                        "success": False,
                        "error": f"VyOS API returned status code {response.status_code}"
                    }
                
                # Get the API response
                result = response.json()
                
                # Cache the full config if path is empty
                if not path:
                    config_cache = {
                        "success": True,
                        "data": result.get("data", {}),
                        "error": result.get("error")
                    }
                    return config_cache
                else:
                    # For specific paths, extract the requested data from the full config
                    # We're using the path to navigate the data structure
                    data = result.get("data", {})
                    for part in path_list:
                        if isinstance(data, dict) and part in data:
                            data = data[part]
                        else:
                            # If path doesn't exist, return empty object
                            data = {}
                            break
                    
                    return {
                        "success": True,
                        "data": data,
                        "error": result.get("error")
                    }
                    
        except httpx.RequestError as e:
            return {
                "success": False,
                "error": f"Error connecting to VyOS API: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    else:
        # Use cached data if available and not forced to refresh
        if not path and config_cache:
            return config_cache
        elif path and config_cache:
            # Extract the requested data from the cached config
            # We're using the path to navigate the data structure
            path_list = path.strip().split('/')
            path_list = [p for p in path_list if p]  # Remove empty elements
            
            data = config_cache.get("data", {})
            for part in path_list:
                if isinstance(data, dict) and part in data:
                    data = data[part]
                else:
                    # If path doesn't exist, return empty object
                    data = {}
                    break
            
            return {
                "success": True,
                "data": data,
                "error": config_cache.get("error")
            }
    
    # This code should not be reached, but just in case
    return {
        "success": False,
        "error": "Unexpected error in configuration retrieval logic"
    }

@app.get("/dhcpleases")
async def get_dhcpleases():
    try:
        # Prepare data for VyOS API to fetch DHCP leases
        data = {
            "op": "show",
            "path": ["dhcp", "server", "leases"]
        }
        
        # Note: DHCP leases use the /show endpoint, not /retrieve
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
            
            # Return the raw response for debugging
            if "data" in result:
                print(f"Raw DHCP leases data: {result['data']}")
            
            # If successful, parse the leases data
            if result.get("success", False) and result.get("data"):
                # Parse the leases data which comes as a formatted string
                leases_data = parse_dhcp_leases(result["data"])
                print(f"Parsed leases data: {json.dumps(leases_data)}")
                return {
                    "success": True,
                    "leases": leases_data,  # Put under the leases key to match frontend expectations
                    "data": leases_data,    # Keep data key for backward compatibility 
                    "raw_data": result["data"],  # Include raw data for debugging
                    "error": None
                }
            
            return {
                "success": result.get("success", False),
                "leases": {},  # Add empty leases object
                "data": result.get("data", {}),
                "raw_result": result,  # Include raw result for debugging
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

def parse_dhcp_leases(leases_string):
    # Parse the leases string into a structured format
    print("Raw leases string to parse:")
    print(leases_string)
    
    lines = leases_string.strip().split('\n')
    
    # Debug the structure
    print(f"Number of lines: {len(lines)}")
    for i, line in enumerate(lines):
        print(f"Line {i}: {line}")
    
    # Skip the first line (header) and extract field positions
    if len(lines) < 2:
        return {}
    
    # Try to infer field positions from the first line (header)
    # The header line might look like: "IP Address    MAC address        State    Lease start          Lease expiration     Remaining Pool    Hostname     Origin"
    header_line = lines[0]
    print(f"Header line: {header_line}")
    
    # Create a more flexible parsing approach
    leases = []
    subnet_leases = {}
    
    # Skip the header line and separator line
    # Start parsing from line 2 (index 1) onwards
    for i in range(1, len(lines)):
        line = lines[i].strip()
        
        # Skip separator lines or empty lines
        if not line or '---' in line:
            continue
        
        # Split the line by whitespace
        parts = line.split()
        print(f"Parts for line {i}: {parts}")
        
        # Check if we have enough parts for a valid lease entry
        if len(parts) < 5:
            print(f"Skipping line {i} due to insufficient parts: {len(parts)}")
            continue
        
        try:
            # Extract data based on position
            # Adjust these indexes based on the actual format of your data
            ip_address = parts[0] if len(parts) > 0 else "Unknown"
            mac_address = parts[1] if len(parts) > 1 else "Unknown"
            state = parts[2] if len(parts) > 2 else "Unknown"
            
            # The lease start and expiration might be multiple fields depending on the date format
            # Try to identify them based on position and format
            lease_start = "Unknown"
            lease_end = "Unknown"
            remaining = "Unknown"
            pool = "Unknown"
            hostname = "Unknown"
            origin = "Unknown"
            
            # Depending on the format, adjust the field extraction
            # This is just a guess based on common formats
            if len(parts) > 3:
                lease_start = f"{parts[3]} {parts[4]}" if len(parts) > 4 else parts[3]
                
            if len(parts) > 5:
                lease_end = f"{parts[5]} {parts[6]}" if len(parts) > 6 else parts[5]
            
            # Remaining fields
            if len(parts) > 7:
                remaining = parts[7]
            
            if len(parts) > 8:
                pool = parts[8]  # Assuming pool is at index 8
            
            if len(parts) > 9:
                hostname = parts[9]  # Assuming hostname is at index 9
            
            if len(parts) > 10:
                origin = parts[10]  # Assuming origin is at index 10
            
            # Create a lease object
            lease = {
                "ip_address": ip_address,
                "mac_address": mac_address,
                "state": state,
                "lease_start": lease_start,
                "lease_end": lease_end,
                "remaining": remaining,
                "pool": pool,
                "hostname": hostname,
                "origin": origin
            }
            
            # Add to the list of leases
            leases.append(lease)
            
            # Group by subnet/pool - use the pool name (network name) as the key
            # This is important because VyOS reports the network name in the Pool column
            if pool not in subnet_leases:
                subnet_leases[pool] = []
            subnet_leases[pool].append(lease)
            
        except Exception as e:
            print(f"Error parsing line {i}: {e}")
            continue
    
    print(f"Parsed {len(leases)} leases across {len(subnet_leases)} subnets/pools")
    return subnet_leases if subnet_leases else {"LAN": []}

# Clear cache endpoint
@app.get("/clearcache")
async def clear_cache():
    global config_cache
    config_cache = None
    return RedirectResponse(url="/")

@app.get("/api/dhcp_leases")
async def get_dhcp_leases():
    try:
        # Prepare data for VyOS API
        data = {
            "op": "showDhcpServerLeases"
        }
        
        # Configure client with proper cert validation
        client_kwargs = {"timeout": 10.0}
        
        # Handle certificate verification based on settings
        if TRUST_SELF_SIGNED:
            client_kwargs["verify"] = False
        elif CERT_PATH:
            client_kwargs["verify"] = CERT_PATH
        
        async with httpx.AsyncClient(**client_kwargs) as client:
            response = await client.post(
                VYOS_API_URL,
                files={
                    'data': (None, json.dumps(data)),
                    'key': (None, API_KEY)
                }
            )
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"API error: {response.status_code}"
                }
            
            result = response.json()
            return {
                "success": True,
                "data": result.get("data", [])
            }
            
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
