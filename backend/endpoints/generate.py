from typing import List, Dict, Any
from utils import PathBuilder, make_api_request


class GenerateEndpoint(PathBuilder):
    """
    Endpoint handler for the /generate endpoint.
    
    This endpoint is used to generate various resources on VyOS,
    such as PKI keys, certificates, etc.
    """
    
    def __init__(self, client, path: List[str] = None):
        """
        Initialize a new GenerateEndpoint.
        
        Args:
            client: The parent VyOSClient instance
            path: Optional initial path elements
        """
        super().__init__(client, path)
        self.endpoint = "/generate"
    
    async def __call__(self, *args) -> Dict[str, Any]:
        """
        Execute a generate operation with the current path.
        
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
            "op": "generate",
            "path": path
        }
        
        # Make the API request
        return await make_api_request(self._client, self.endpoint, data) 