import httpx
import json
from typing import List, Dict, Any, Union, Optional
import ipaddress

def merge_cidr_parts(parts):
    if len(parts) > 5000:
        print("CIDR merging failed: Input too large, skipping merge.")
        return parts

    merged = []
    i = 0
    while i < len(parts):
        try:
            if (
                i + 1 < len(parts)
                and ipaddress.ip_address(parts[i])
                and parts[i + 1].isdigit()
            ):
                merged.append(f"{parts[i]}/{parts[i + 1]}")
                i += 2
            else:
                merged.append(parts[i])
                i += 1
        except ValueError:
            merged.append(parts[i])
            i += 1
    return merged

class PathBuilder:
    """
    Base class that enables dynamic path building through attribute access.
    This class captures attribute access and builds a path array that can be used
    for VyOS API requests.
    """
    
    def __init__(self, client=None, path: List[str] = None):
        """
        Initialize a new PathBuilder instance.
        
        Args:
            client: The parent VyOSClient instance
            path: Optional initial path elements
        """
        self._client = client
        self._path = path or []
    
    def __getattr__(self, attr: str) -> 'PathBuilder':
        """
        Capture attribute access and extend the path.
        
        Args:
            attr: The attribute name to add to the path
            
        Returns:
            A new PathBuilder instance with the extended path
        """
        # Create a new instance with the extended path
        return self.__class__(
            client=self._client,
            path=self._path + [attr.replace('_', '-')]
        )
    
    def __call__(self, *args) -> Dict[str, Any]:
        """
        Execute the API request when the PathBuilder is called.
        By default, this method is not implemented in the base class.
        
        Args:
            *args: Arguments to pass to the endpoint
            
        Returns:
            API response as a dictionary
        """
        raise NotImplementedError("Subclasses must implement __call__")
    
    def _get_path(self) -> List[str]:
        """
        Get the current path.
        
        Returns:
            The current path as a list of strings
        """
        return self._path


async def make_api_request(
    url: str,
    data: str,
    client,
) -> Dict[str, Any]:
    """
    Make a request to the VyOS API.
    
    Args:
        url: The API endpoint URL
        data: The JSON data to send in the request
        client: The VyOSClient instance
        
    Returns:
        The API response as a dictionary
    """
    import aiohttp
    import json
    import ssl
    import time
    
    start_time = time.time()
    print(f"Making API request to: {url}")
    print(f"Request data: {data}")
    
    # Setup SSL context if using HTTPS
    ssl_context = None
    if client.https:
        if client.trust_self_signed:
            print("Using SSL with self-signed certificate validation disabled")
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
        elif client.cert_path:
            print(f"Using SSL with certificate from: {client.cert_path}")
            ssl_context = ssl.create_default_context(cafile=client.cert_path)
        else:
            print("Using default SSL context")
            ssl_context = ssl.create_default_context()
    
    # Prepare the form data
    form_data = {
        'data': (None, data),
        'key': (None, client.api_key)
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            print(f"Sending request to {url}...")
            try:
                async with session.post(
                    url,
                    data=form_data,
                    ssl=ssl_context,
                    timeout=30.0
                ) as response:
                    elapsed_time = time.time() - start_time
                    print(f"Response received in {elapsed_time:.2f}s with status: {response.status}")
                    
                    # Log the response
                    response_text = await response.text()
                    print(f"Response text length: {len(response_text)} chars")
                    print(f"Response text preview: {response_text[:1000] if len(response_text) > 1000 else response_text}")
                    
                    # Handle non-JSON responses
                    try:
                        response_data = json.loads(response_text)
                    except json.JSONDecodeError as e:
                        print(f"Failed to parse JSON response: {e}")
                        return {
                            "success": False,
                            "error": f"Invalid JSON response from VyOS router: {str(e)}",
                            "raw_data": response_text[:1000] if len(response_text) > 1000 else response_text
                        }
                    
                    # Check for API error
                    if response.status >= 400:
                        error_msg = response_data.get("error", "Unknown error")
                        print(f"API error (HTTP {response.status}): {error_msg}")
                        raise VyOSAPIError(
                            message=f"HTTP Error {response.status}: {error_msg}",
                            status_code=response.status,
                            response=response
                        )
                    
                    # Check for error in response data
                    if response_data.get("success") is False and response_data.get("error"):
                        error_msg = response_data["error"]
                        print(f"API error in response data: {error_msg}")
                        # We don't raise an exception here because the API returned a valid response
                        # with a structured error. The caller can handle this appropriately.
                    
                    return response_data
            except aiohttp.ClientConnectorError as e:
                print(f"Connection error: Could not connect to VyOS router at {url}: {e}")
                return {
                    "success": False,
                    "error": f"Connection error: Could not connect to VyOS router at {client.host}. Please check that the VyOS router is accessible and API service is enabled."
                }
            except aiohttp.ClientSSLError as e:
                print(f"SSL error connecting to VyOS router: {e}")
                return {
                    "success": False,
                    "error": f"SSL error: Connection failed due to SSL certificate issues. If using self-signed certificates, make sure TRUST_SELF_SIGNED is set to true."
                }
            except aiohttp.ClientResponseError as e:
                print(f"VyOS API response error: {e}")
                return {
                    "success": False,
                    "error": f"API response error: {str(e)}"
                }
            except aiohttp.ClientError as e:
                print(f"Client error: {str(e)}")
                raise VyOSAPIError(f"Connection error: {str(e)}")
    except VyOSAPIError:
        # Just re-raise VyOSAPIError without wrapping it
        raise
    except Exception as e:
        print(f"Unexpected error in make_api_request: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise VyOSAPIError(f"Unexpected error when communicating with VyOS router: {str(e)}")


class VyOSAPIError(Exception):
    """
    Custom exception for VyOS API errors.
    """
    
    def __init__(self, message: str, status_code: Optional[int] = None, response: Optional[httpx.Response] = None):
        self.message = message
        self.status_code = status_code
        self.response = response
        super().__init__(self.message) 