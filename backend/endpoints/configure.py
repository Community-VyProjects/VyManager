from typing import List, Dict, Any, Union
from utils import PathBuilder, make_api_request


class ConfigureOperation(PathBuilder):
    """
    Base class for configure operations (set, delete, comment).
    
    This class is not meant to be used directly, but extended by specific
    operation classes.
    """
    
    def __init__(self, client, operation: str, path: List[str] = None):
        """
        Initialize a new ConfigureOperation.
        
        Args:
            client: The parent VyOSClient instance
            operation: The operation type ('set', 'delete', or 'comment')
            path: Optional initial path elements
        """
        super().__init__(client, path)
        self.endpoint = "/configure"
        self.operation = operation
    
    async def __call__(self, *args) -> Dict[str, Any]:
        """
        Execute a configure operation with the current path.
        
        Args:
            *args: Additional path elements or values to append
            
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
            "op": self.operation,
            "path": path
        }
        
        # Make the API request
        return await make_api_request(self._client, self.endpoint, data)


class ConfigureBatchOperation:
    """
    Class to handle batch configuration operations.
    """
    
    def __init__(self, client):
        """
        Initialize a new ConfigureBatchOperation.
        
        Args:
            client: The parent VyOSClient instance
        """
        self._client = client
        self._operations = []
    
    def add_operation(self, operation: str, path: List[str]) -> 'ConfigureBatchOperation':
        """
        Add an operation to the batch.
        
        Args:
            operation: The operation type ('set', 'delete', or 'comment')
            path: The configuration path
            
        Returns:
            The ConfigureBatchOperation instance for chaining
        """
        self._operations.append({
            "op": operation,
            "path": path
        })
        return self
    
    def set(self, path: List[str]) -> 'ConfigureBatchOperation':
        """
        Add a 'set' operation to the batch.
        
        Args:
            path: The configuration path
            
        Returns:
            The ConfigureBatchOperation instance for chaining
        """
        return self.add_operation("set", path)
    
    def delete(self, path: List[str]) -> 'ConfigureBatchOperation':
        """
        Add a 'delete' operation to the batch.
        
        Args:
            path: The configuration path
            
        Returns:
            The ConfigureBatchOperation instance for chaining
        """
        return self.add_operation("delete", path)
    
    def comment(self, path: List[str]) -> 'ConfigureBatchOperation':
        """
        Add a 'comment' operation to the batch.
        
        Args:
            path: The configuration path
            
        Returns:
            The ConfigureBatchOperation instance for chaining
        """
        return self.add_operation("comment", path)
    
    async def execute(self) -> Dict[str, Any]:
        """
        Execute all operations in the batch.
        
        Returns:
            The API response
        """
        # Make the API request with the batched operations
        return await make_api_request(self._client, "/configure", self._operations)


class SetOperation(ConfigureOperation):
    """Endpoint handler for the 'set' operation on the /configure endpoint."""
    
    def __init__(self, client, path: List[str] = None):
        """Initialize a new SetOperation."""
        super().__init__(client, "set", path)


class DeleteOperation(ConfigureOperation):
    """Endpoint handler for the 'delete' operation on the /configure endpoint."""
    
    def __init__(self, client, path: List[str] = None):
        """Initialize a new DeleteOperation."""
        super().__init__(client, "delete", path)


class CommentOperation(ConfigureOperation):
    """Endpoint handler for the 'comment' operation on the /configure endpoint."""
    
    def __init__(self, client, path: List[str] = None):
        """Initialize a new CommentOperation."""
        super().__init__(client, "comment", path)


class ConfigureEndpoint(PathBuilder):
    """
    Endpoint handler for the /configure endpoint.
    
    This endpoint is used to make configuration changes on VyOS.
    It supports 'set', 'delete', and 'comment' operations, as well as
    batch operations.
    """
    
    def __init__(self, client, path: List[str] = None):
        """
        Initialize a new ConfigureEndpoint.
        
        Args:
            client: The parent VyOSClient instance
            path: Optional initial path elements
        """
        super().__init__(client, path)
        self.endpoint = "/configure"
        
        # Initialize operation handlers
        self.set = SetOperation(client)
        self.delete = DeleteOperation(client)
        self.comment = CommentOperation(client)
    
    def batch(self) -> ConfigureBatchOperation:
        """
        Create a new batch operation.
        
        Returns:
            A new ConfigureBatchOperation instance
        """
        return ConfigureBatchOperation(self._client)
    
    async def __call__(self, 
                        operations: List[Dict[str, Union[str, List[str]]]]) -> Dict[str, Any]:
        """
        Execute a batch of configure operations.
        
        Args:
            operations: A list of operation dictionaries, each with 'op' and 'path' keys
            
        Returns:
            The API response
        """
        # Make the API request with the provided operations
        return await make_api_request(self._client, self.endpoint, operations) 