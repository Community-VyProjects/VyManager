from fastapi import FastAPI, Request, APIRouter, HTTPException, Query
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
import json
import os
import pathlib
import traceback
from typing import Optional, List, Dict, Any
import urllib.parse
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import uvicorn
import datetime as import_datetime

# Import the VyOS API wrapper
from client import VyOSClient
from utils import VyOSAPIError
from utils import merge_cidr_parts

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
VYOS_HOST = os.getenv("VYOS_HOST", "")
VYOS_API_URL = os.getenv("VYOS_API_URL", "")
CERT_PATH = os.getenv("CERT_PATH", "")
TRUST_SELF_SIGNED = os.getenv("TRUST_SELF_SIGNED", "false").lower() == "true"
HTTPS = os.getenv("VYOS_HTTPS", "true").lower() == "true"

# Log environment settings
print(f"Environment: {ENVIRONMENT}")
print(f"Production Mode: {IS_PRODUCTION}")
print(f"TRUST_SELF_SIGNED: {TRUST_SELF_SIGNED}")

# Security warning for production with self-signed certificates
if IS_PRODUCTION and TRUST_SELF_SIGNED:
    print("WARNING: Using insecure SSL certificate validation in production mode!")
    print("This is a security risk and should only be used in development environments.")
    print("Consider obtaining a valid SSL certificate for production use.")

# Initialize VyOS client
# Try to extract host from VYOS_API_URL if VYOS_HOST is not set
if not VYOS_HOST and VYOS_API_URL:
    try:
        parsed_url = urllib.parse.urlparse(VYOS_API_URL)
        VYOS_HOST = parsed_url.netloc
        print(f"Extracted host from VYOS_API_URL: {VYOS_HOST}")
    except Exception as e:
        print(f"Failed to extract host from VYOS_API_URL: {e}")

# Print initialization parameters for debugging
print(f"VyOS Configuration:")
print(f"  Host: {VYOS_HOST}")
print(f"  API Key: {'Set' if API_KEY else 'Not Set'}")
print(f"  HTTPS: {HTTPS}")
print(f"  Trust Self-Signed: {TRUST_SELF_SIGNED}")
print(f"  Certificate Path: {CERT_PATH if CERT_PATH else 'Not Set'}")

vyos_client = None
if not VYOS_HOST or not API_KEY:
    print(f"CRITICAL ERROR: Cannot initialize VyOS client - missing required configuration!")
    missing = []
    if not VYOS_HOST:
        missing.append("VYOS_HOST")
    if not API_KEY:
        missing.append("VYOS_API_KEY")
    
    print(f"Missing required environment variables: {', '.join(missing)}")
    print("Application will start but all API requests will fail!")
    print("Please set the required environment variables and restart the application.")
    print("\nTo fix this issue:")
    print("1. Create or update your .env file with the following variables:")
    print(f"   VYOS_HOST=your-vyos-router-ip-or-hostname")
    print(f"   VYOS_API_KEY=your-api-key")
    print(f"   VYOS_HTTPS=true")
    print(f"   TRUST_SELF_SIGNED=true  # If your VyOS router uses a self-signed certificate")
    print("2. Restart the application")
else:
    try:
        print(f"Initializing VyOS client for host: {VYOS_HOST}")
        vyos_client = VyOSClient(
            host=VYOS_HOST,
            api_key=API_KEY,
            https=HTTPS,
            cert_path=CERT_PATH,
            trust_self_signed=TRUST_SELF_SIGNED
        )
        print(f"VyOS client successfully initialized!")
        
        # Test connection immediately to verify it's working
        async def test_connection():
            try:
                print("Testing connection to VyOS router...")
                success, error_msg = await vyos_client.test_connection()
                
                if success:
                    print("✅ Successfully connected to VyOS router!")
                    print("Configuration data is available and API is operational.")
                else:
                    print(f"❌ CRITICAL: Connection test failed - {error_msg}")
                    print("All API requests will likely fail with the same error.")
                    print("\nPossible solutions:")
                    print("1. Check that the VyOS router is running and accessible from this server")
                    print("2. Verify the API service is enabled on the VyOS router")
                    print("3. Check that the API key is correct")
                    print("4. If using HTTPS, verify SSL certificate settings")
                    print("   - For self-signed certificates, set TRUST_SELF_SIGNED=true")
                    print("5. Check network connectivity (firewalls, routing, etc.)")
                    print("6. Verify the VyOS API service is properly configured on the router")
                    print("   - Run 'show service https' on the VyOS router to check")
            except Exception as e:
                print(f"❌ CRITICAL: Connection test to VyOS router failed: {e}")
                print(f"Stack trace:\n{traceback.format_exc()}")
                print("All API requests will likely fail with the same error.")
                print("\nPossible solutions:")
                print("1. Check that the VyOS router is running and accessible from this server")
                print("2. Verify the API service is enabled on the VyOS router")
                print("3. Check that the API key is correct")
                print("4. If using HTTPS, verify SSL certificate settings")
                print("5. Check network connectivity and firewall rules")
        
        # Schedule the connection test to run soon after startup
        asyncio.create_task(test_connection())
        
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to initialize VyOS client: {e}")
        print(f"Stack trace:\n{traceback.format_exc()}")
        print("Application will start but all API requests will fail!")
        print("\nPossible solutions:")
        print("1. Check your .env configuration")
        print("2. Verify the VyOS host is correctly specified")
        print("3. Ensure the API key is valid")
        print("4. Restart the application after fixing the configuration")

# Create FastAPI app with appropriate settings
app = FastAPI(
    title="VyOS Configuration Manager",
    description="API for managing VyOS router configurations",
    version="1.0.0",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    # Allow requests from any origin when behind a reverse proxy
    # In production with nginx, this is safe as nginx handles the actual domain restrictions
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
    expose_headers=["Content-Length", "Content-Type"],
    max_age=86400,  # Cache preflight requests for 24 hours
)

# Create API router
api_router = APIRouter(prefix="/api")

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
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; font-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src 'self' data:;"
    
    return response

# Mount static files with absolute path
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# Global variable to cache the full config data
config_cache = None

# Utility function to handle API exceptions
async def handle_vyos_request(request_func, *args, **kwargs):
    """Generic handler for VyOS API requests with error handling"""
    if not vyos_client:
        return {
            "success": False,
            "error": "VyOS client not initialized. Check your environment variables."
        }
    
    try:
        result = await request_func(*args, **kwargs)
        return result
    except VyOSAPIError as e:
        return {
            "success": False,
            "error": f"VyOS API Error: {e.message}"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc() if not IS_PRODUCTION else None
        }

# Dynamic API endpoint handlers
# These functions enable routing API requests to the appropriate VyOS API method
async def dynamic_vyos_api_handler(endpoint_type, path_parts=None):
    """
    Dynamically route API requests to the appropriate VyOS API method
    
    Args:
        endpoint_type: The type of endpoint (show, showConfig, configure, etc.)
        path_parts: List of path parts to pass to the VyOS API
        
    Returns:
        The VyOS API response
    """
    if not vyos_client:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "VyOS client not initialized. Check your environment variables."
            }
        )
    
    try:
        # Get the appropriate client method based on endpoint_type
        if endpoint_type == "showConfig":
            method = vyos_client.showConfig
        elif endpoint_type == "show":
            method = vyos_client.show
        elif endpoint_type == "configure_set":
            method = vyos_client.configure.set
        elif endpoint_type == "configure_delete":
            method = vyos_client.configure.delete
        elif endpoint_type == "configure_comment":
            method = vyos_client.configure.comment
        elif endpoint_type == "generate":
            method = vyos_client.generate
        elif endpoint_type == "reset":
            method = vyos_client.reset
        elif endpoint_type == "image":
            method = vyos_client.image
        elif endpoint_type == "config_file":
            method = vyos_client.config_file
        elif endpoint_type == "reboot":
            method = vyos_client.reboot
        elif endpoint_type == "poweroff":
            method = vyos_client.poweroff
        else:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": f"Unknown endpoint type: {endpoint_type}"
                }
            )
        
        # Execute the method with the path parts instead of trying to chain attributes
        # This fixes the issue with trying to use function objects as attribute containers
        if path_parts:
            # For configure operations, the method is already a function that accepts a path list
            if endpoint_type.startswith("configure_"):
                result = await method(path_parts)
            else:
                # For other operations, we need to call the method directly
                # Join the path parts with a period to match the expected input format
                path_str = '.'.join(path_parts)
                # Evaluate the method chain dynamically using eval or getattr
                try:
                    # Try to create a method chain using getattr
                    curr_method = method
                    for part in path_parts:
                        if hasattr(curr_method, part):
                            curr_method = getattr(curr_method, part)
                        else:
                            # If we can't chain further, break and pass the remaining parts as arguments
                            break
                    
                    # Call the method with any remaining path parts as arguments
                    result = await curr_method()
                except Exception as chain_error:
                    # If method chaining fails, fall back to passing the path as an argument
                    print(f"Error in method chaining: {str(chain_error)}")
                    result = await method(path_parts)
        else:
            # No path parts, just call the method
            result = await method()
        
        # Ensure result is a valid JSON-serializable object
        if not isinstance(result, dict):
            # If result is not a dictionary, try to convert it to one
            try:
                # If it's a string that might be JSON, try to parse it
                if isinstance(result, str):
                    # Check if it looks like JSON
                    if result.strip().startswith('{') or result.strip().startswith('['):
                        try:
                            import json
                            parsed_result = json.loads(result)
                            return JSONResponse(content=parsed_result)
                        except json.JSONDecodeError as json_err:
                            # If parsing fails, wrap the string in a dictionary
                            return JSONResponse(
                                status_code=500,
                                content={
                                    "success": False,
                                    "error": f"Invalid JSON response from VyOS: {str(json_err)}",
                                    "raw_data": result[:1000]  # Include part of the raw data for debugging
                                }
                            )
                    else:
                        # It's a regular string, not JSON
                        return JSONResponse(content={
                            "success": True,
                            "data": result,
                            "error": None
                        })
                else:
                    # It's some other non-dictionary type
                    return JSONResponse(content={
                        "success": True,
                        "data": str(result),
                        "error": None
                    })
            except Exception as conversion_err:
                return JSONResponse(
                    status_code=500,
                    content={
                        "success": False,
                        "error": f"Failed to process VyOS response: {str(conversion_err)}",
                        "raw_data": str(result)[:1000] if result else None
                    }
                )
        
        # Verify that the result is JSON serializable
        try:
            import json
            # Test serializing the result
            json.dumps(result)
            return JSONResponse(content=result)
        except (TypeError, ValueError, OverflowError) as json_err:
            # If serialization fails, sanitize the result
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": f"Response contains non-serializable data: {str(json_err)}",
                    "raw_data": str(result)[:1000] if result else None
                }
            )
        
    except VyOSAPIError as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"VyOS API Error: {e.message}"
            }
        )
    except Exception as e:
        error_response = {
            "success": False,
            "error": str(e)
        }
        
        # Include traceback in development mode
        if not IS_PRODUCTION:
            error_response["traceback"] = traceback.format_exc()
            
        return JSONResponse(
            status_code=500,
            content=error_response
        )

# API Routes for 'show' operations
@api_router.get("/show/{path:path}")
async def api_show(path: str):
    """
    Handle 'show' operation API calls with dynamic paths
    
    Example: GET /api/show/interfaces
    """
    path_parts = path.split("/")
    path_parts = merge_cidr_parts(path_parts)

    return await dynamic_vyos_api_handler("show", path_parts)

# API Routes for 'showConfig' operations (configuration retrieval)
@api_router.get("/config/{path:path}")
async def api_config(path: str = ""):
    """
    Handle configuration retrieval API calls with dynamic paths
    
    Example: GET /api/config/interfaces/ethernet/eth0
    """
    # Log the request
    print(f"Received request for config path: '{path}'")
    
    # Check if VyOS client is initialized
    if not vyos_client:
        print("Error: VyOS client not initialized")
        return JSONResponse(
            status_code=503,  # Service Unavailable
            content={
                "success": False,
                "error": "VyOS client not initialized. Please check your environment configuration and restart the server.",
                "data": None
            }
        )
    
    try:
        # If path is empty, return the full config
        if not path:
            print("Fetching full configuration from VyOS router")
            method = vyos_client.showConfig
        else:
            print(f"Fetching configuration for path: {path} from VyOS router")
            # Split the path and build the method chain
            path_parts = path.split("/")
            path_parts = merge_cidr_parts(path_parts)
            method = vyos_client.showConfig
            for part in path_parts:
                if part:  # Skip empty parts
                    try:
                        method = getattr(method, part)
                    except AttributeError as e:
                        print(f"AttributeError: {e} - Path part '{part}' is invalid")
                        return JSONResponse(
                            status_code=400,
                            content={
                                "success": False,
                                "error": f"Invalid path segment: '{part}'",
                                "valid_path": path.split(part)[0]
                            }
                        )
        
        # Execute the method
        print("Executing API call to VyOS router...")
        result = await method()
        print(f"API call result type: {type(result)}")
        
        # Safely convert result to a JSON response
        try:
            # Test serialization
            import json
            json.dumps(result)
            print("Response successfully serialized to JSON")
            return JSONResponse(content=result)
        except (TypeError, ValueError, OverflowError) as json_err:
            print(f"JSON serialization error: {json_err}")
            # If serialization fails, sanitize the result
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": f"Response contains non-serializable data: {str(json_err)}",
                    "raw_data": str(result)[:1000] if result else None
                }
            )
        
    except VyOSAPIError as e:
        print(f"VyOS API Error: {e.message}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"VyOS API Error: {e.message}",
                "data": None
            }
        )
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        trace = traceback.format_exc()
        print(trace)
        
        error_response = {
            "success": False,
            "error": f"Error communicating with VyOS router: {str(e)}",
            "data": None
        }
        
        # Include traceback in development mode
        if not IS_PRODUCTION:
            error_response["traceback"] = trace
            
        return JSONResponse(
            status_code=500,
            content=error_response
        )

# API Routes for 'configure' operations with different methods
@api_router.post("/configure/set/{path:path}")
async def api_configure_set(path: str, value: Optional[str] = None):
    """
    Handle 'set' configuration operations
    
    Example: POST /api/configure/set/interfaces/ethernet/eth0/description?value=WAN
    """
    # Check if path contains URL-encoded slashes (%2F)
    if '%2F' in path:
        # Decode URL-encoded slashes and split the path
        path = urllib.parse.unquote(path)
        
    path_parts = path.split("/")
    path_parts = merge_cidr_parts(path_parts)

    # Filter out empty strings that may result from splitting
    path_parts = [part for part in path_parts if part]
    
    if value:
        # Append the value as the last part of the path
        path_parts.append(value)
    
    print(f"configure_set with path_parts: {path_parts}")
    return await dynamic_vyos_api_handler("configure_set", path_parts)

@api_router.post("/configure/delete/{path:path}")
async def api_configure_delete(path: str, value: Optional[str] = None):
    """
    Handle 'delete' configuration operations
    
    Example: POST /api/configure/delete/interfaces/ethernet/eth0/description
    """
    # Check if path contains URL-encoded slashes (%2F)
    if '%2F' in path:
        # Decode URL-encoded slashes and split the path
        path = urllib.parse.unquote(path)
    
    path_parts = path.split("/")
    path_parts = merge_cidr_parts(path_parts)
    
    # Filter out empty strings that may result from splitting
    path_parts = [part for part in path_parts if part]
    
    if value:
        # Append the value as the last part of the path
        path_parts.append(value)
    
    print(f"configure_delete with path_parts: {path_parts}")
    return await dynamic_vyos_api_handler("configure_delete", path_parts)

@api_router.post("/configure/comment/{path:path}")
async def api_configure_comment(path: str, value: Optional[str] = None):
    """
    Handle 'comment' configuration operations
    
    Example: POST /api/configure/comment/interfaces/ethernet/eth0?value=WAN Interface
    """
    # Check if path contains URL-encoded slashes (%2F)
    if '%2F' in path:
        # Decode URL-encoded slashes and split the path
        path = urllib.parse.unquote(path)
    
    path_parts = path.split("/")
    path_parts = merge_cidr_parts(path_parts)
    
    # Filter out empty strings that may result from splitting
    path_parts = [part for part in path_parts if part]
    
    if value:
        # Append the value as the last part of the path
        path_parts.append(value)
    
    print(f"configure_comment with path_parts: {path_parts}")
    return await dynamic_vyos_api_handler("configure_comment", path_parts)

# Batch configuration operations
@api_router.post("/configure/batch")
async def api_configure_batch(operations: List[Dict[str, Any]]):
    """
    Handle batch configuration operations
    
    Example: POST /api/configure/batch
    Body: [
        {"op": "set", "path": ["interfaces", "ethernet", "eth0", "description", "WAN"]},
        {"op": "delete", "path": ["interfaces", "ethernet", "eth0", "disable"]}
    ]
    """
    if not vyos_client:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "VyOS client not initialized. Check your environment variables."
            }
        )
    
    try:
        batch = vyos_client.configure.batch()
        
        for operation in operations:
            op = operation.get("op")
            path = operation.get("path")
            
            if not op or not path:
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "Each operation must have 'op' and 'path' fields"
                    }
                )
            
            if op == "set":
                batch.set(path)
            elif op == "delete":
                batch.delete(path)
            elif op == "comment":
                batch.comment(path)
            else:
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": f"Unknown operation: {op}"
                    }
                )
        
        result = await batch.execute()
        return JSONResponse(content=result)
        
    except VyOSAPIError as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"VyOS API Error: {e.message}"
            }
        )
    except Exception as e:
        error_response = {
            "success": False,
            "error": str(e)
        }
        
        # Include traceback in development mode
        if not IS_PRODUCTION:
            error_response["traceback"] = traceback.format_exc()
            
        return JSONResponse(
            status_code=500,
            content=error_response
        )

# API Routes for 'generate' operations
@api_router.post("/generate/{path:path}")
async def api_generate(path: str):
    """
    Handle 'generate' operations
    
    Example: POST /api/generate/pki/wireguard/key-pair
    """
    path_parts = path.split("/")
    path_parts = merge_cidr_parts(path_parts)

    return await dynamic_vyos_api_handler("generate", path_parts)

# API Routes for 'reset' operations
@api_router.post("/reset/{path:path}")
async def api_reset(path: str):
    """
    Handle 'reset' operations
    
    Example: POST /api/reset/ip/bgp/192.0.2.11
    """
    path_parts = path.split("/")
    path_parts = merge_cidr_parts(path_parts)
    
    return await dynamic_vyos_api_handler("reset", path_parts)

# API Routes for 'image' operations
@api_router.post("/image/add")
async def api_image_add(url: str):
    """
    Handle 'image add' operations
    
    Example: POST /api/image/add?url=https://example.com/vyos-image.iso
    """
    if not vyos_client:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "VyOS client not initialized. Check your environment variables."
            }
        )
    
    try:
        result = await vyos_client.image.add(url)
        return JSONResponse(content=result)
    except Exception as e:
        error_response = {
            "success": False,
            "error": str(e)
        }
        
        # Include traceback in development mode
        if not IS_PRODUCTION:
            error_response["traceback"] = traceback.format_exc()
            
        return JSONResponse(
            status_code=500,
            content=error_response
        )

@api_router.post("/image/delete")
async def api_image_delete(name: str):
    """
    Handle 'image delete' operations
    
    Example: POST /api/image/delete?name=1.3-rolling-202006070117
    """
    if not vyos_client:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "VyOS client not initialized. Check your environment variables."
            }
        )
    
    try:
        result = await vyos_client.image.delete(name)
        return JSONResponse(content=result)
    except Exception as e:
        error_response = {
            "success": False,
            "error": str(e)
        }
        
        # Include traceback in development mode
        if not IS_PRODUCTION:
            error_response["traceback"] = traceback.format_exc()
            
        return JSONResponse(
            status_code=500,
            content=error_response
        )

# API Routes for 'config-file' operations
@api_router.post("/config-file/save")
async def api_config_file_save(file: Optional[str] = None):
    """
    Handle 'config-file save' operations
    
    Example: POST /api/config-file/save?file=/config/test.config
    """
    if not vyos_client:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "VyOS client not initialized. Check your environment variables."
            }
        )
    
    try:
        result = await vyos_client.config_file.save(file)
        return JSONResponse(content=result)
    except Exception as e:
        error_response = {
        "success": False,
            "error": str(e)
        }
        
        # Include traceback in development mode
        if not IS_PRODUCTION:
            error_response["traceback"] = traceback.format_exc()
            
        return JSONResponse(
            status_code=500,
            content=error_response
        )

@api_router.post("/config-file/load")
async def api_config_file_load(file: str):
    """
    Handle 'config-file load' operations
    
    Example: POST /api/config-file/load?file=/config/test.config
    """
    if not vyos_client:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "VyOS client not initialized. Check your environment variables."
            }
        )
    
    try:
        result = await vyos_client.config_file.load(file)
        return JSONResponse(content=result)
    except Exception as e:
        error_response = {
            "success": False,
            "error": str(e)
        }
        
        # Include traceback in development mode
        if not IS_PRODUCTION:
            error_response["traceback"] = traceback.format_exc()
            
        return JSONResponse(
            status_code=500,
            content=error_response
        )

# API Routes for 'reboot' operations
@api_router.post("/reboot")
async def api_reboot():
    """
    Handle 'reboot' operations
    
    Example: POST /api/reboot
    """
    if not vyos_client:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "VyOS client not initialized. Check your environment variables."
            }
        )
    
    try:
        result = await vyos_client.reboot()
        return JSONResponse(content=result)
    except Exception as e:
        error_response = {
            "success": False,
            "error": str(e)
        }
        
        # Include traceback in development mode
        if not IS_PRODUCTION:
            error_response["traceback"] = traceback.format_exc()
            
        return JSONResponse(
            status_code=500,
            content=error_response
        )

# API Routes for 'poweroff' operations
@api_router.post("/poweroff")
async def api_poweroff():
    """
    Handle 'poweroff' operations
    
    Example: POST /api/poweroff
    """
    if not vyos_client:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "VyOS client not initialized. Check your environment variables."
            }
        )
    
    try:
        result = await vyos_client.poweroff()
        return JSONResponse(content=result)
    except Exception as e:
        error_response = {
                    "success": False,
            "error": str(e)
        }
        
        # Include traceback in development mode
        if not IS_PRODUCTION:
            error_response["traceback"] = traceback.format_exc()
            
        return JSONResponse(
            status_code=500,
            content=error_response
        )

# API Routes for DHCP leases (replacement for the old /dhcpleases endpoint)
@api_router.get("/dhcp/leases")
async def api_dhcp_leases():
    """
    Get DHCP server leases information
    
    Example: GET /api/dhcp/leases
    
    Returns:
        JSON with DHCP leases information organized by subnet/pool
    """
    if not vyos_client:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "VyOS client not initialized. Check your environment variables."
            }
        )
    
    try:
        # Use the VyOS client to get DHCP leases
        result = await vyos_client.show.dhcp.server.leases()
        
        # If successful, parse the leases data
        if result.get("success", False) and result.get("data"):
            # Parse the leases data which comes as a formatted string
            leases_data = parse_dhcp_leases(result["data"])
            return JSONResponse(content={
                "success": True,
                "leases": leases_data,
                "error": None
            })
        
        return JSONResponse(
            status_code=500,
            content={
                "success": result.get("success", False),
                "leases": {},
                "error": result.get("error", "Unknown error")
            }
        )
            
    except VyOSAPIError as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"VyOS API Error: {e.message}"
            }
        )
    except Exception as e:
        error_response = {
            "success": False,
            "error": str(e)
        }
        
        # Include traceback in development mode
        if not IS_PRODUCTION:
            error_response["traceback"] = traceback.format_exc()
            
        return JSONResponse(
            status_code=500,
            content=error_response
        )

# API Routes for routing table information
@api_router.get("/routingtable")
async def api_routing_table():
    """
    Get routing table information from the VyOS router
    
    Example: GET /api/routingtable
    
    Returns:
        JSON with formatted routing table information
    """
    if not vyos_client:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "VyOS client not initialized. Check your environment variables."
            },
            media_type="application/json"
        )
    
    try:
        # Use the VyOS client to get all routes (vrf/all/json)
        result = await vyos_client.show.ip.route.vrf.all.json()
        
        # If successful, parse the data
        if result.get("success", False) and result.get("data"):
            try:
                # The data is a JSON string inside the data field, need to parse it
                import json
                routes_data = json.loads(result["data"])
                
                # Format the data for better readability
                formatted_routes = []
                
                for prefix, routes_list in routes_data.items():
                    for route in routes_list:
                        # Extract the key information for each route
                        formatted_route = {
                            "destination": prefix,
                            "prefix_length": route.get("prefixLen"),
                            "protocol": route.get("protocol"),
                            "vrf": route.get("vrfName"),
                            "selected": route.get("selected", False),
                            "installed": route.get("installed", False),
                            "distance": route.get("distance"),
                            "metric": route.get("metric"),
                            "uptime": route.get("uptime", ""),
                            "nexthops": []
                        }
                        
                        # Process next hops
                        nexthops = route.get("nexthops", [])
                        for nexthop in nexthops:
                            nh_info = {
                                "ip": nexthop.get("ip", "directly connected"),
                                "interface": nexthop.get("interfaceName", ""),
                                "active": nexthop.get("active", False),
                                "directly_connected": nexthop.get("directlyConnected", False)
                            }
                            formatted_route["nexthops"].append(nh_info)
                        
                        formatted_routes.append(formatted_route)
                
                # Create a formatted response with proper JSON structure
                response_data = {
                    "success": True,
                    "routes": formatted_routes,
                    "error": None,
                    "count": len(formatted_routes),
                    "timestamp": import_datetime.datetime.now().isoformat()
                }
                
                # Return the JSON response with indentation for better readability
                return JSONResponse(
                    content=response_data,
                    status_code=200,
                    media_type="application/json"
                )
            except json.JSONDecodeError as e:
                return JSONResponse(
                    status_code=500,
                    content={
                        "success": False,
                        "routes": [],
                        "error": f"Failed to parse routing table data: {str(e)}"
                    },
                    media_type="application/json"
                )
        
        return JSONResponse(
            status_code=500,
            content={
                "success": result.get("success", False),
                "routes": [],
                "error": result.get("error", "Unknown error")
            },
            media_type="application/json"
        )
            
    except VyOSAPIError as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"VyOS API Error: {e.message}"
            },
            media_type="application/json"
        )
    except Exception as e:
        error_response = {
            "success": False,
            "error": str(e)
        }
        
        # Include traceback in development mode
        if not IS_PRODUCTION:
            error_response["traceback"] = traceback.format_exc()
            
        return JSONResponse(
            status_code=500,
            content=error_response,
            media_type="application/json"
        )

# For backwards compatibility, redirect /dhcpleases to the new API endpoint
@app.get("/dhcpleases")
async def legacy_dhcpleases_redirect():
    """Legacy endpoint that redirects to the new API endpoint"""
    return RedirectResponse(url="/api/dhcp/leases")

# Include API router
app.include_router(api_router)

# Helper function for parsing DHCP leases (kept for backward compatibility)
def parse_dhcp_leases(leases_string):
    """Parse the DHCP leases string into a structured format"""
    lines = leases_string.strip().split('\n')
    
    # Skip the first line (header) and extract field positions
    if len(lines) < 2:
        return {}
    
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
        
        # Check if we have enough parts for a valid lease entry
        if len(parts) < 5:
            continue
        
        try:
            # Extract data based on position
            ip_address = parts[0] if len(parts) > 0 else "Unknown"
            mac_address = parts[1] if len(parts) > 1 else "Unknown"
            state = parts[2] if len(parts) > 2 else "Unknown"
            
            # The lease start and expiration might be multiple fields depending on the date format
            lease_start = "Unknown"
            lease_end = "Unknown"
            remaining = "Unknown"
            pool = "Unknown"
            hostname = "Unknown"
            origin = "Unknown"
            
            # Depending on the format, adjust the field extraction
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
            continue
    
    return subnet_leases if subnet_leases else {"LAN": []}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3001, reload=True) 
