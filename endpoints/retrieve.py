from typing import List, Dict, Any, Optional
from utils import PathBuilder, make_api_request


class RetrieveEndpoint(PathBuilder):
    """
    Endpoint handler for the /retrieve endpoint.
    
    This endpoint is used to get configuration data from VyOS.
    """
    
    def __init__(self, client, path: List[str] = None):
        """
        Initialize a new RetrieveEndpoint.
        
        Args:
            client: The parent VyOSClient instance
            path: Optional initial path elements
        """
        super().__init__(client, path)
        self.endpoint = "/retrieve"
    
    async def __call__(self, *args) -> Dict[str, Any]:
        """
        Execute a retrieve operation with the current path.
        
        Args:
            *args: Additional path elements to append
            
        Returns:
            The API response
        """
        # Build the full path
        path = self._path.copy()
        
        # Append any additional arguments as path elements
        for arg in args:
            if arg is not None:
                path.append(str(arg))
        
        # Prepare data for API request
        data = {
            "op": "showConfig",
            "path": path
        }
        
        # Make the API request
        return await make_api_request(self._client, self.endpoint, data)
    
    async def exists(self, path: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Check if a configuration path exists.
        
        Args:
            path: The path to check, or None to use the current path
            
        Returns:
            The API response
        """
        # Use the provided path or the current path
        check_path = path if path is not None else self._path
        
        # Prepare data for API request
        data = {
            "op": "exists",
            "path": check_path
        }
        
        # Make the API request
        return await make_api_request(self._client, self.endpoint, data)
    
    async def return_values(self, path: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Get the values of a multi-valued node.
        
        Args:
            path: The path to check, or None to use the current path
            
        Returns:
            The API response
        """
        # Use the provided path or the current path
        values_path = path if path is not None else self._path
        
        # Prepare data for API request
        data = {
            "op": "returnValues",
            "path": values_path
        }
        
        # Make the API request
        return await make_api_request(self._client, self.endpoint, data)


class ShowConfigEndpoint(RetrieveEndpoint):
    """
    Specialized endpoint for the showConfig operation on the /retrieve endpoint.
    
    This is a convenience class that automatically sets the operation to "showConfig".
    """
    
    def __init__(self, client, path: List[str] = None):
        """
        Initialize a new ShowConfigEndpoint.
        
        Args:
            client: The parent VyOSClient instance
            path: Optional initial path elements
        """
        super().__init__(client, path)
        # This endpoint uses the /retrieve endpoint with showConfig operation
        self.endpoint = "/retrieve"
    
    async def __call__(self, *args) -> Dict[str, Any]:
        """
        Execute a showConfig operation with the current path.
        
        Args:
            *args: Additional path elements to append
            
        Returns:
            The API response
        """
        # Reuse the parent class implementation
        return await super().__call__(*args) 