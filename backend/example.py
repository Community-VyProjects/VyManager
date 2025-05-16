import asyncio
import json
from client import VyOSClient
from utils import VyOSAPIError


async def main():
    # Create a client instance
    # Method 1: Direct instantiation
    vyos = VyOSClient(
        host="vyos-router.example.com",
        api_key="YOUR_API_KEY",
        https=True,
        trust_self_signed=True  # Only for testing
    )
    
    # Method 2: From environment variables
    # vyos = VyOSClient.from_env()
    
    # Method 3: From URL
    # vyos = VyOSClient.from_url("https://vyos-router.example.com", "YOUR_API_KEY")
    
    try:
        # Example 1: Get system configuration
        print("\n--- Example 1: Get system configuration ---")
        result = await vyos.showConfig.system()
        print_result(result)
        
        # Example 2: Check if a configuration path exists
        print("\n--- Example 2: Check if a configuration path exists ---")
        result = await vyos.retrieve.exists(["service", "https", "api"])
        print_result(result)
        
        # Example 3: Get all interfaces
        print("\n--- Example 3: Get all interfaces ---")
        result = await vyos.showConfig.interfaces()
        print_result(result)
        
        # Example 4: Show system image
        print("\n--- Example 4: Show system image ---")
        result = await vyos.show.system.image()
        print_result(result)
        
        # Example 5: Configure an interface (set operation)
        print("\n--- Example 5: Configure an interface ---")
        result = await vyos.configure.set.interfaces.dummy.dum0.address("192.168.99.1/24")
        print_result(result)
        
        # Example 6: Delete a configuration node
        print("\n--- Example 6: Delete a configuration node ---")
        result = await vyos.configure.delete.interfaces.dummy.dum0.address("192.168.99.1/24")
        print_result(result)
        
        # Example 7: Batch configuration
        print("\n--- Example 7: Batch configuration ---")
        batch = vyos.configure.batch()
        batch.set(["interfaces", "dummy", "dum1", "address", "10.0.0.1/24"])
        batch.set(["interfaces", "dummy", "dum1", "description", "Test interface"])
        result = await batch.execute()
        print_result(result)
        
        # Example 8: Generate a wireguard key-pair
        print("\n--- Example 8: Generate a wireguard key-pair ---")
        result = await vyos.generate.pki.wireguard("key-pair")
        print_result(result)
        
        # Example 9: Save configuration
        print("\n--- Example 9: Save configuration ---")
        result = await vyos.config_file.save()
        print_result(result)
        
    except VyOSAPIError as e:
        print(f"API Error: {e.message}")
        if e.status_code:
            print(f"Status code: {e.status_code}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")


def print_result(result):
    """Print the API result in a readable format."""
    if isinstance(result, dict):
        if "data" in result:
            print("Success:", result.get("success", False))
            if isinstance(result["data"], (dict, list)):
                print("Data:", json.dumps(result["data"], indent=2))
            else:
                print("Data:", result["data"])
            if result.get("error"):
                print("Error:", result["error"])
        else:
            print(json.dumps(result, indent=2))
    else:
        print(result)


if __name__ == "__main__":
    asyncio.run(main()) 