from typing import Optional, Dict, Any, List, Union
import os
from urllib.parse import urlparse, urljoin
import aiohttp
import logging
from utils import make_api_request, VyOSAPIError
import asyncio
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import endpoint handlers
from endpoints.retrieve import RetrieveEndpoint, ShowConfigEndpoint
from endpoints.show import ShowEndpoint
from endpoints.configure import ConfigureEndpoint
from endpoints.generate import GenerateEndpoint
from endpoints.reset import ResetEndpoint
from endpoints.image import ImageEndpoint
from endpoints.config_file import ConfigFileEndpoint
from endpoints.reboot import RebootEndpoint
from endpoints.poweroff import PoweroffEndpoint


class PathBuilder:
    """
    Builder class for creating VyOS API paths.
    Allows chaining of attributes to build the path.
    """
    
    def __init__(self, client, endpoint, op, path=None):
        """
        Initialize a new PathBuilder instance.
        
        Args:
            client: VyOSClient instance
            endpoint: API endpoint (e.g., "/configure", "/show")
            op: Operation to perform (e.g., "showConfig", "set")
            path: Initial path list
        """
        self.client = client
        self.endpoint = endpoint
        self.op = op
        self.path = path or []
    
    def __getattr__(self, attr):
        """
        Handle attribute access to build the path.
        
        Args:
            attr: Attribute name
            
        Returns:
            New PathBuilder instance with the attribute added to the path
        """
        # Replace underscores with hyphens for VyOS command compatibility
        path_segment = attr.replace('_', '-')
        new_path = self.path + [path_segment]
        return PathBuilder(self.client, self.endpoint, self.op, new_path)
    
    async def __call__(self, *args, **kwargs):
        """
        Execute the API request when the PathBuilder is called.
        
        Returns:
            API response as a dictionary
        """
        try:
            print(f"Making {self.endpoint} request with op={self.op}, path={self.path}")
            return await self.client.execute_request(self.endpoint, self.op, self.path, **kwargs)
        except Exception as e:
            print(f"Error in PathBuilder.__call__: {str(e)}")
            raise

class ConfigureBuilder:
    """
    Builder for VyOS configuration operations (set, delete, comment).
    """
    
    def __init__(self, client):
        """
        Initialize a new ConfigureBuilder instance.
        
        Args:
            client: VyOSClient instance
        """
        self.client = client
    
    def set(self, path=None):
        """
        Start building a set operation path.
        
        Args:
            path: Initial path list (optional)
            
        Returns:
            PathBuilder instance for the set operation
        """
        if isinstance(path, list) and path:
            # Directly execute if a path list is provided
            return self.client.execute_request("/configure", "set", path)
        return PathBuilder(self.client, "/configure", "set")
    
    def delete(self, path=None):
        """
        Start building a delete operation path.
        
        Args:
            path: Initial path list (optional)
            
        Returns:
            PathBuilder instance for the delete operation
        """
        if isinstance(path, list) and path:
            # Directly execute if a path list is provided
            return self.client.execute_request("/configure", "delete", path)
        return PathBuilder(self.client, "/configure", "delete")
    
    def comment(self, path=None):
        """
        Start building a comment operation path.
        
        Args:
            path: Initial path list (optional)
            
        Returns:
            PathBuilder instance for the comment operation
        """
        if isinstance(path, list) and path:
            # Directly execute if a path list is provided
            return self.client.execute_request("/configure", "comment", path)
        return PathBuilder(self.client, "/configure", "comment")
    
    def batch(self):
        """
        Create a batch configuration operation.
        
        Returns:
            BatchOperation instance
        """
        return BatchOperation(self.client)

class BatchOperation:
    """
    Class for batching multiple configuration operations.
    """
    
    def __init__(self, client):
        """
        Initialize a new BatchOperation instance.
        
        Args:
            client: VyOSClient instance
        """
        self.client = client
        self.operations = []
    
    def set(self, path):
        """
        Add a set operation to the batch.
        
        Args:
            path: Path list for the operation
            
        Returns:
            Self for chaining
        """
        self.operations.append({"op": "set", "path": path})
        return self
    
    def delete(self, path):
        """
        Add a delete operation to the batch.
        
        Args:
            path: Path list for the operation
            
        Returns:
            Self for chaining
        """
        self.operations.append({"op": "delete", "path": path})
        return self
    
    def comment(self, path):
        """
        Add a comment operation to the batch.
        
        Args:
            path: Path list for the operation
            
        Returns:
            Self for chaining
        """
        self.operations.append({"op": "comment", "path": path})
        return self
    
    async def execute(self):
        """
        Execute all operations in the batch.
        
        Returns:
            API response
        """
        return await self.client.execute_request("/configure", "batch", self.operations)

class VyOSClient:
    """
    Client for interacting with the VyOS API.
    """
    
    def __init__(self, host, api_key, https=True, cert_path=None, trust_self_signed=False):
        """
        Initialize a new VyOSClient instance.
        
        Args:
            host: VyOS router hostname or IP address
            api_key: API key for authentication
            https: Whether to use HTTPS (default: True)
            cert_path: Path to SSL certificate (default: None)
            trust_self_signed: Whether to trust self-signed certificates (default: False)
        """
        # Validate required parameters
        if not host:
            raise ValueError("VyOS host must be specified")
        
        if not api_key:
            raise ValueError("API key must be specified")
            
        # Normalize the host to ensure it doesn't already have http/https prefix
        if host.startswith("http://") or host.startswith("https://"):
            print("Warning: Host should not include protocol. Removing protocol prefix.")
            self.host = host.split("://")[1]
        else:
            self.host = host
            
        self.api_key = api_key
        self.https = https
        self.cert_path = cert_path
        self.trust_self_signed = trust_self_signed
        
        protocol = "https" if https else "http"
        self.base_url = f"{protocol}://{self.host}"
        print(f"VyOSClient initialized with base URL: {self.base_url}")
        
        # Log security configuration
        if self.https:
            if self.trust_self_signed:
                print("WARNING: Configured to trust self-signed certificates. This should only be used in development environments.")
            elif not self.cert_path:
                print("WARNING: Using HTTPS without a certificate path and not trusting self-signed certificates. This may cause connection issues with self-signed certificates.")
            else:
                print(f"Using HTTPS with certificate from: {self.cert_path}")
        else:
            print("WARNING: Using plain HTTP connection. This is not secure and should only be used in isolated networks.")
        
        # Initialize endpoint handlers
        self._init_endpoints()
    
    def _init_endpoints(self) -> None:
        """Initialize all endpoint handlers."""
        # Regular endpoint handlers
        # Note: These conflicts with the @property decorators
        # self.show = ShowEndpoint(self)
        # self.configure = ConfigureEndpoint(self)
        # self.generate = GenerateEndpoint(self)
        # self.reset = ResetEndpoint(self)
        # self.image = ImageEndpoint(self)
        # self.config_file = ConfigFileEndpoint(self)
        # self.reboot = RebootEndpoint(self)
        # self.poweroff = PoweroffEndpoint(self)
        
        # Special endpoint handlers
        self.retrieve = RetrieveEndpoint(self)
        # self.showConfig = ShowConfigEndpoint(self)
        
        print("VyOSClient endpoint handlers initialized")
    
    @property
    def showConfig(self):
        """
        Start building a showConfig operation path.
        
        Returns:
            PathBuilder instance for the showConfig operation
        """
        return PathBuilder(self, "/retrieve", "showConfig")
    
    @property
    def show(self):
        """
        Start building a show operation path.
        
        Returns:
            PathBuilder instance for the show operation
        """
        return PathBuilder(self, "/show", "show")
    
    @property
    def configure(self):
        """
        Get the configuration builder.
        
        Returns:
            ConfigureBuilder instance
        """
        return ConfigureBuilder(self)
    
    @property
    def generate(self):
        """
        Start building a generate operation path.
        
        Returns:
            PathBuilder instance for the generate operation
        """
        return PathBuilder(self, "/generate", "generate")
    
    @property
    def reset(self):
        """
        Start building a reset operation path.
        
        Returns:
            PathBuilder instance for the reset operation
        """
        return PathBuilder(self, "/reset", "reset")
    
    @property
    def reboot(self):
        """
        Execute the reboot command.
        
        Returns:
            Awaitable for the API response
        """
        return self.execute_request("/reboot", "reboot", ["now"])
    
    @property
    def poweroff(self):
        """
        Execute the poweroff command.
        
        Returns:
            Awaitable for the API response
        """
        return self.execute_request("/poweroff", "poweroff", ["now"])
    
    @property
    def image(self):
        """
        Class for image operations.
        """
        
        class ImageOperations:
            def __init__(self, client):
                self.client = client
            
            async def add(self, url):
                """
                Add an image from URL.
                
                Args:
                    url: URL to the image
                    
                Returns:
                    API response
                """
                return await self.client.execute_request("/image", "add", url=url)
            
            async def delete(self, name):
                """
                Delete an image by name.
                
                Args:
                    name: Image name
                    
                Returns:
                    API response
                """
                return await self.client.execute_request("/image", "delete", name=name)
        
        return ImageOperations(self)
    
    @property
    def config_file(self):
        """
        Class for config file operations.
        """
        
        class ConfigFileOperations:
            def __init__(self, client):
                self.client = client
            
            async def save(self, file=None):
                """
                Save configuration to file.
                
                Args:
                    file: File path (optional)
                    
                Returns:
                    API response
                """
                if file:
                    return await self.client.execute_request("/config-file", "save", file=file)
                return await self.client.execute_request("/config-file", "save")
            
            async def load(self, file):
                """
                Load configuration from file.
                
                Args:
                    file: File path
                    
                Returns:
                    API response
                """
                return await self.client.execute_request("/config-file", "load", file=file)
        
        return ConfigFileOperations(self)
    
    async def test_connection(self):
        """
        Test the connection to the VyOS router.
        
        Returns:
            True if the connection is successful, False otherwise.
            Also returns the error message if the connection failed.
        """
        try:
            print(f"Testing connection to VyOS router at {self.base_url}...")
            result = await self.showConfig()
            
            if result.get("success") is True:
                print("Connection test successful!")
                return True, None
            else:
                error_msg = result.get("error", "Unknown error")
                print(f"Connection test failed: {error_msg}")
                return False, error_msg
        except Exception as e:
            print(f"Connection test failed with exception: {str(e)}")
            return False, str(e)
    
    async def execute_request(self, endpoint, op, path=None, **kwargs):
        """
        Execute an API request.
        
        Args:
            endpoint: API endpoint
            op: Operation to perform
            path: Path list (optional)
            **kwargs: Additional parameters
            
        Returns:
            API response
        """
        url = urljoin(self.base_url, endpoint)
        
        # Prepare the data payload
        if op == "batch":
            # For batch operations, path is a list of operations
            data = path
        else:
            # For normal operations
            data = {"op": op}
            
            # Add path if specified
            if isinstance(path, list):
                data["path"] = path
            
            # Add additional parameters
            for key, value in kwargs.items():
                data[key] = value
        
        try:
            print(f"Preparing request to VyOS API: {url}")
            print(f"Request data: {data}")
            
            # Convert data to a JSON string
            try:
                import json
                data_json = json.dumps(data)
            except (TypeError, ValueError) as e:
                print(f"Error serializing request data to JSON: {e}")
                raise VyOSAPIError(f"Invalid request data: {str(e)}")
            
            # Execute the request
            result = await make_api_request(
                url=url,
                data=data_json,
                client=self,
            )
            
            print(f"Received response from VyOS API: {result.get('success', False)}")
            
            if "error" in result and result["error"] is not None:
                print(f"API returned error: {result['error']}")
            
            return result
        except VyOSAPIError as e:
            print(f"VyOS API error: {e.message}")
            if hasattr(e, 'response') and e.response:
                print(f"Response status: {e.response.status}")
                response_text = getattr(e.response, 'text', 'No response text available')
                print(f"Response content: {response_text}")
            raise
        except Exception as e:
            print(f"Unexpected error in execute_request: {str(e)}")
            import traceback
            print(traceback.format_exc())
            raise VyOSAPIError(f"Unexpected error: {str(e)}")

class ConfigureEndpoint:
    """Special endpoint for the configure API."""
    
    def __init__(self, client):
        self._client = client
        self.set = PathBuilder(client, endpoint="configure", op="set")
        self.delete = PathBuilder(client, endpoint="configure", op="delete")
    
    def batch(self):
        """Create a batch operation."""
        return BatchOperation(self._client)
    
    def __call__(self, *args):
        """Direct call to the configure endpoint."""
        return self._client._execute("configure", None, *args)

class VyOSAPIError(Exception):
    """Exception raised for VyOS API errors."""
    
    def __init__(self, message: str, status_code: int = None, response: Dict[str, Any] = None):
        self.message = message
        self.status_code = status_code
        self.response = response
        super().__init__(self.message) 