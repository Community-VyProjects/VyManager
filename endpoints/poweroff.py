from typing import List, Dict, Any
from utils import PathBuilder, make_api_request


class PoweroffEndpoint(PathBuilder):
    """
    Endpoint handler for the /poweroff endpoint.
    
    This endpoint is used to power off the VyOS system.
    """
    
    def __init__(self, client, path: List[str] = None):
        """
        Initialize a new PoweroffEndpoint.
        
        Args:
            client: The parent VyOSClient instance
            path: Optional initial path elements
        """
        super().__init__(client, path)
        self.endpoint = "/poweroff"
    
    async def __call__(self, now: bool = True) -> Dict[str, Any]:
        """
        Execute a poweroff operation.
        
        Args:
            now: Whether to power off immediately (always True for this API)
            
        Returns:
            The API response
        """
        # Prepare data for API request
        data = {
            "op": "poweroff",
            "path": ["now"]
        }
        
        # Make the API request
        return await make_api_request(self._client, self.endpoint, data) 