from typing import List, Dict, Any
from utils import PathBuilder, make_api_request


class RebootEndpoint(PathBuilder):
    """
    Endpoint handler for the /reboot endpoint.
    
    This endpoint is used to reboot the VyOS system.
    """
    
    def __init__(self, client, path: List[str] = None):
        """
        Initialize a new RebootEndpoint.
        
        Args:
            client: The parent VyOSClient instance
            path: Optional initial path elements
        """
        super().__init__(client, path)
        self.endpoint = "/reboot"
    
    async def __call__(self, now: bool = True) -> Dict[str, Any]:
        """
        Execute a reboot operation.
        
        Args:
            now: Whether to reboot immediately (always True for this API)
            
        Returns:
            The API response
        """
        # Prepare data for API request
        data = {
            "op": "reboot",
            "path": ["now"]
        }
        
        # Make the API request
        return await make_api_request(self._client, self.endpoint, data) 