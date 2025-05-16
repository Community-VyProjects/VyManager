# Network Routing Table Feature

This feature provides a detailed view of the network routing table from the VyOS router. It displays routes from all configured VRFs (Virtual Routing and Forwarding instances) and allows filtering and inspection of route details.

## Files

The feature consists of the following components:

1. **Backend API**:
   - `routes.py`: Contains the API endpoint to fetch and parse routing information from VyOS
   
2. **Frontend**:
   - `templates/routing.html`: The HTML template for the routing table page
   - `static/js/routing.js`: JavaScript functionality for the routing table
   - `static/css/routing.css`: Styling for the routing table

## How to Use

1. Access the routing table by:
   - Clicking the "Routing Table" button in the Network tab
   - Directly navigating to `/routing` URL

2. The routing table displays:
   - VRF tabs for each routing domain
   - Destination networks
   - Routing protocols (static, connected, BGP, etc.)
   - Next hop information
   - Route uptime and status

3. Features:
   - Filter routes by typing in the search box
   - View detailed route information by clicking the info button
   - Switch between different VRFs using the VRF tabs
   - Refresh the data with the refresh button

## API Endpoint

The routing data is fetched from:
```
GET /api/routes
```

Optional parameters:
- `vrf`: Specific VRF to query (default: "all")
- `force_refresh`: Boolean to force a refresh from the server

## Technical Implementation

The routing table uses the following VyOS operational command:
```
show ip route vrf all json
```

The API parses the JSON response and organizes the routes by VRF, making sure the "default" VRF is shown first followed by other VRFs in alphabetical order.

## Troubleshooting

If the routing table doesn't load:

1. Check that the VyOS API is accessible
2. Verify that the API key has permissions to view routing information
3. Check the browser console for JavaScript errors
4. Check the server logs for API errors

## Future Enhancements

Potential future enhancements include:

1. Route tracing/testing functionality
2. BGP route filtering and attribute visualization
3. IPv6 routing table support
4. Route statistics and history tracking 