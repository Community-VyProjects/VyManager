from typing import List, Dict, Any, Optional
from utils import PathBuilder, make_api_request


class ConfigFileEndpoint(PathBuilder):
    """
    Endpoint handler for the /config-file endpoint.
    
    This endpoint is used to save or load configuration files.
    """
    
    def __init__(self, client, path: List[str] = None):
        """
        Initialize a new ConfigFileEndpoint.
        
        Args:
            client: The parent VyOSClient instance
            path: Optional initial path elements
        """
        super().__init__(client, path)
        self.endpoint = "/config-file"
    
    async def save(self, file: Optional[str] = None) -> Dict[str, Any]:
        """
        Save the running configuration to a file.
        
        Args:
            file: The path of the file to save to (optional, default is /config/config.boot)
            
        Returns:
            The API response
        """
        # Prepare data for API request
        data = {
            "op": "save"
        }
        
        # Add the file path if provided
        if file:
            data["file"] = file
        
        # Make the API request
        return await make_api_request(self._client, self.endpoint, data)
    
    async def load(self, file: str) -> Dict[str, Any]:
        """
        Load a configuration file.
        
        Args:
            file: The path of the file to load
            
        Returns:
            The API response
        """
        # Prepare data for API request
        data = {
            "op": "load",
            "file": file
        }
        
        # Make the API request
        return await make_api_request(self._client, self.endpoint, data)
    
    async def __call__(self, operation: str, file: Optional[str] = None) -> Dict[str, Any]:
        """
        Execute a config-file operation.
        
        Args:
            operation: The operation to perform ('save' or 'load')
            file: The path of the file to save to or load from
            
        Returns:
            The API response
        """
        if operation.lower() == "save":
            return await self.save(file)
        elif operation.lower() == "load":
            if not file:
                raise ValueError("File path is required for 'load' operation")
            return await self.load(file)
        else:
            raise ValueError(f"Invalid config-file operation: {operation}. Must be 'save' or 'load'.") 