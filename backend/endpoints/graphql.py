from typing import Dict, Any, Optional
import aiohttp
from pydantic import BaseModel
import json
import ssl

class GraphQLQuery(BaseModel):
    """Model for GraphQL query data"""
    query: str

class GraphQLEndpoint:
    """Endpoint for handling GraphQL queries."""
    
    def __init__(self, client):
        """
        Initialize the GraphQL endpoint.
        
        Args:
            client: VyOSClient instance
        """
        self.client = client
        self.base_url = f"{'https' if client.https else 'http'}://{client.host}/graphql"
        if client.trust_self_signed:
            self.ssl_context = ssl.create_default_context()
            self.ssl_context.check_hostname = False
            self.ssl_context.verify_mode = ssl.CERT_NONE
        else:
            self.ssl_context = True
        print(f"GraphQL endpoint initialized with base URL: {self.base_url}")
    
    async def operation(self, name: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute a GraphQL operation.
        
        Args:
            name: The name of the operation (e.g., 'ShowContainerContainer', 'ShowImageContainer')
            data: Optional dictionary of additional data parameters (e.g., {'intf_name': 'eth0'})
            
        Returns:
            Dict containing the operation response
        """
        # Start with the required API key
        operation_data = {"key": self.client.api_key}
        
        # Add any additional data parameters
        if data:
            operation_data.update(data)
        
        # Convert the data dictionary to a string of key-value pairs
        data_str = ", ".join(f'{k}: "{v}"' for k, v in operation_data.items())
        
        query = """
        {
            %s(data: {%s}) {
                success
                errors
                data {
                    result
                }
            }
        }
        """ % (name, data_str)
        return await self.query(query)
    
    async def query(self, query: str) -> Dict[str, Any]:
        """
        Execute a GraphQL query.
        
        Args:
            query: The GraphQL query string
            
        Returns:
            Dict containing the query response
        """
        print(f"Executing GraphQL query: {query}")
        
        headers = {
            'Content-Type': 'application/json',
            'X-API-Key': self.client.api_key
        }
        
        payload = {
            "query": query,
            "variables": {}
        }
        
        print(f"GraphQL request payload: {payload}")
        print(f"GraphQL request headers: {headers}")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.base_url,
                    headers=headers,
                    json=payload,
                    ssl=self.ssl_context
                ) as response:
                    print(f"GraphQL response status: {response.status}")
                    
                    if response.status != 200:
                        error_text = await response.text()
                        print(f"GraphQL error response: {error_text}")
                        return {
                            "success": False,
                            "error": f"GraphQL request failed with status {response.status}",
                            "data": None
                        }
                    
                    data = await response.json()
                    print(f"GraphQL response data: {data}")
                    
                    # Check for GraphQL errors
                    if data.get("errors"):
                        return {
                            "success": False,
                            "error": str(data["errors"]),
                            "data": None
                        }
                    
                    return {
                        "success": True,
                        "error": None,
                        "data": data.get("data")
                    }
        except Exception as e:
            print(f"GraphQL query error: {str(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "error": str(e),
                "data": None
            } 