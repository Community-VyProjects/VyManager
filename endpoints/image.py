from typing import List, Dict, Any, Optional
from utils import PathBuilder, make_api_request


class ImageEndpoint(PathBuilder):
    """
    Endpoint handler for the /image endpoint.
    
    This endpoint is used to manage VyOS system images.
    """
    
    def __init__(self, client, path: List[str] = None):
        """
        Initialize a new ImageEndpoint.
        
        Args:
            client: The parent VyOSClient instance
            path: Optional initial path elements
        """
        super().__init__(client, path)
        self.endpoint = "/image"
    
    async def add(self, url: str) -> Dict[str, Any]:
        """
        Add a new VyOS image from a URL.
        
        Args:
            url: The URL to download the image from
            
        Returns:
            The API response
        """
        # Prepare data for API request
        data = {
            "op": "add",
            "url": url
        }
        
        # Make the API request
        return await make_api_request(self._client, self.endpoint, data)
    
    async def delete(self, name: str) -> Dict[str, Any]:
        """
        Delete a VyOS image by name.
        
        Args:
            name: The name of the image to delete
            
        Returns:
            The API response
        """
        # Prepare data for API request
        data = {
            "op": "delete",
            "name": name
        }
        
        # Make the API request
        return await make_api_request(self._client, self.endpoint, data)
    
    async def __call__(self, operation: str, **kwargs) -> Dict[str, Any]:
        """
        Execute an image operation.
        
        Args:
            operation: The operation to perform ('add' or 'delete')
            **kwargs: Additional parameters for the operation
            
        Returns:
            The API response
        """
        if operation.lower() == "add":
            return await self.add(kwargs.get("url"))
        elif operation.lower() == "delete":
            return await self.delete(kwargs.get("name"))
        else:
            raise ValueError(f"Invalid image operation: {operation}. Must be 'add' or 'delete'.") 