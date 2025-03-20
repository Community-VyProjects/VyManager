/**
 * RoutingTable class for managing and displaying routing table data
 */
class RoutingTable {
    /**
     * Constructor - initialize the routing table
     */
    constructor() {
        // Initialize properties
        this.routes = {};
        this.currentVrf = 'default';
        this.loaded = false;
        this.interfaceTypes = {};
        this.allInterfaces = new Set();
        this.advancedFilters = {
            protocol: '',
            interface: '',
            status: '',
            prefix: '',
            nextHop: ''
        };
        // Get the theme from document element
        this.darkMode = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    }

    /**
     * Initialize the routing table view
     */
    async init() {
        this.setupEventListeners();
        await this.loadInterfaceTypes();
        await this.loadRoutingData();
        this.initDarkModeListener();
        this.populateInterfaceFilter();
    }

    /**
     * Set up event listeners for interactive elements
     */
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-routes');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadRoutingData(true);
            });
        }
        
        // Route search
        const searchInput = document.getElementById('route-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.renderRoutes();
            });
        }
        
        // Bootstrap tabs - use bootstrap's tab functionality
        const routesTabs = document.querySelectorAll('button[data-bs-toggle="tab"]');
        routesTabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (event) => {
                const targetId = event.target.getAttribute('data-bs-target');
                // Update views when tab is shown
                if (targetId === '#vrf-tab-pane') {
                    this.renderVrfList();
                } else if (targetId === '#stats-tab-pane') {
                    this.renderRoutingStats();
                }
            });
        });
        
        // Show All button
        const showAllButton = document.getElementById('show-all-routes');
        if (showAllButton) {
            showAllButton.addEventListener('click', () => {
                // Prepare consolidated routes from all VRFs
                this.prepareAllRoutesView();
                // Update active state for VRF tabs
                document.querySelectorAll('.vrf-tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                // Add a special class to indicate "all routes" is active
                showAllButton.classList.add('active-all');
                // Render the table
                this.renderRoutes();
            });
        }
        
        // Toggle advanced filter
        const toggleAdvancedFilter = document.getElementById('toggle-advanced-filter');
        const advancedFilterPanel = document.getElementById('advanced-filter-panel');
        if (toggleAdvancedFilter && advancedFilterPanel) {
            toggleAdvancedFilter.addEventListener('click', () => {
                advancedFilterPanel.classList.toggle('d-none');
                const isVisible = !advancedFilterPanel.classList.contains('d-none');
                toggleAdvancedFilter.innerHTML = isVisible ? 
                    '<i class="bi bi-funnel-fill me-1"></i> Hide Filters' : 
                    '<i class="bi bi-filter me-1"></i> Advanced Filters';
                    
                // Update filter dropdowns when opening
                if (isVisible) {
                    this.populateInterfaceFilter();
                    this.populateProtocolFilter();
                }
            });
        }
        
        // Apply filters button
        const applyFilterButton = document.getElementById('apply-filters');
        if (applyFilterButton) {
            applyFilterButton.addEventListener('click', () => {
                this.renderRoutes();
            });
        }
        
        // Reset filters button
        const resetFilterButton = document.getElementById('reset-filters');
        if (resetFilterButton) {
            resetFilterButton.addEventListener('click', () => {
                this.resetAdvancedFilters();
            });
        }
        
        // Individual filter inputs - apply on enter key
        ['filter-network', 'filter-nexthop'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('keyup', (event) => {
                    if (event.key === 'Enter') {
                        this.renderRoutes();
                    }
                });
            }
        });
        
        // Dropdown filters - apply on change
        ['filter-protocol', 'filter-interface'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.renderRoutes();
                });
            }
        });
    }

    /**
     * Prepare consolidated view of all routes from all VRFs
     */
    prepareAllRoutesView() {
        if (!this.loaded || !this.routes) return;
        
        // Set currentVrf to special 'all' indicator
        this.currentVrf = 'all';
        
        // Create consolidated list of all routes with VRF indicator
        const allRoutes = [];
        
        Object.entries(this.routes).forEach(([vrf, routes]) => {
            routes.forEach(route => {
                // Make a copy of the route with VRF added
                const routeWithVrf = {...route, vrf};
                allRoutes.push(routeWithVrf);
            });
        });
        
        // Store the consolidated routes
        this.routes.all = allRoutes;
    }

    /**
     * Show all routes across all VRFs
     */
    showAllRoutes() {
        // Create a special "All Routes" container
        const container = document.getElementById('routing-table-container');
        if (!container) return;

        // Count total routes
        let totalRoutes = 0;
        Object.values(this.routes).forEach(routes => {
            totalRoutes += routes.length;
        });

        // Update route count
        const routeCountEl = document.getElementById('route-count');
        if (routeCountEl) {
            routeCountEl.textContent = `${totalRoutes} routes found (all VRFs)`;
        }

        // Create table HTML
        let tableHtml = `
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>VRF</th>
                        <th>Destination</th>
                        <th>Protocol</th>
                        <th>Next Hop(s)</th>
                        <th>Uptime</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Get sorted VRFs with default first
        const sortedVrfs = this.getSortedVrfs();

        // Add routes from all VRFs in the sorted order
        sortedVrfs.forEach(vrf => {
            const routes = this.routes[vrf];
            
            // Skip if undefined or null
            if (!routes) return;
            
            // Sort routes: default route first, then alphabetically by prefix
            routes.sort((a, b) => {
                // Check for undefined or missing prefix
                if (!a.prefix) return 1;
                if (!b.prefix) return -1;
                
                if (a.prefix === '0.0.0.0/0') return -1;
                if (b.prefix === '0.0.0.0/0') return 1;
                return a.prefix.localeCompare(b.prefix);
            });

            routes.forEach(route => {
                // Skip routes without prefix
                if (!route.prefix) {
                    console.warn('Route missing prefix:', route);
                    return;
                }
                
                const protocol = this.formatProtocol(route.protocol || 'unknown');
                const nextHops = this.formatNextHops(route.nexthops);
                
                // Determine CSS class based on route status
                let rowClass = '';
                if (route.selected && route.installed) {
                    rowClass = 'table-success';
                } else if (!route.selected) {
                    rowClass = 'table-secondary';
                }
                
                tableHtml += `
                    <tr class="${rowClass}">
                        <td><span class="badge ${vrf === 'default' ? 'bg-primary' : 'bg-info'}">${vrf === 'default' ? 'Default' : vrf}</span></td>
                        <td>${route.prefix}</td>
                        <td>${protocol}</td>
                        <td>${nextHops}</td>
                        <td>${route.uptime || 'N/A'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary route-details-btn" 
                                    data-prefix="${route.prefix}"
                                    data-vrf="${vrf}"
                                    data-bs-toggle="modal" 
                                    data-bs-target="#routeDetailsModal">
                                <i class="bi bi-info-circle"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
        });

        tableHtml += `
                </tbody>
            </table>
        `;

        container.innerHTML = tableHtml;

        // Add event listeners to the details buttons
        document.querySelectorAll('.route-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prefix = e.currentTarget.getAttribute('data-prefix');
                const vrf = e.currentTarget.getAttribute('data-vrf');
                this.showRouteDetails(prefix, vrf);
            });
        });

        // Update VRF heading
        const vrfHeading = document.getElementById('vrf-heading');
        if (vrfHeading) {
            vrfHeading.textContent = 'All Routes (All VRFs)';
        }
    }

    /**
     * Populate the interface filter dropdown
     */
    populateInterfaceFilter() {
        const interfaceSelect = document.getElementById('filter-interface');
        if (!interfaceSelect) return;

        // Clear existing options except the first one
        while (interfaceSelect.options.length > 1) {
            interfaceSelect.remove(1);
        }

        // Add interfaces to the dropdown
        this.allInterfaces.forEach(intf => {
            const option = document.createElement('option');
            option.value = intf;
            option.textContent = intf;
            interfaceSelect.appendChild(option);
        });
    }

    /**
     * Populate the protocol filter dropdown with protocols from routes
     */
    populateProtocolFilter() {
        const protocolFilter = document.getElementById('filter-protocol');
        if (!protocolFilter) return;
        
        // Clear existing options
        protocolFilter.innerHTML = '';
        
        // Add blank option first
        const blankOption = document.createElement('option');
        blankOption.value = '';
        blankOption.textContent = 'All Protocols';
        protocolFilter.appendChild(blankOption);
        
        // Collect all unique protocols
        const protocols = new Set();
        
        Object.values(this.routes).forEach(vrfRoutes => {
            vrfRoutes.forEach(route => {
                if (route.protocol) {
                    protocols.add(route.protocol);
                }
            });
        });
        
        // Add options for each protocol
        [...protocols].sort().forEach(protocol => {
            const option = document.createElement('option');
            option.value = protocol;
            option.textContent = this.getProtocolName(protocol);
            protocolFilter.appendChild(option);
        });
    }

    /**
     * Apply advanced filters
     */
    applyAdvancedFilters() {
        // Get filter values
        this.advancedFilters.protocol = document.getElementById('filter-protocol')?.value || '';
        this.advancedFilters.interface = document.getElementById('filter-interface')?.value || '';
        this.advancedFilters.status = document.getElementById('filter-status')?.value || '';
        this.advancedFilters.prefix = document.getElementById('filter-prefix')?.value || '';
        this.advancedFilters.nextHop = document.getElementById('filter-next-hop')?.value || '';

        // Check if any filter is active
        const hasActiveFilters = Object.values(this.advancedFilters).some(v => v !== '');
        
        if (hasActiveFilters) {
            // Apply the filters
            this.renderFilteredTable();
        } else {
            // If no filters are active, just render the current VRF
            this.renderRoutingTable(this.currentVrf);
        }

        // Close the filter panel
        const filterPanel = document.getElementById('advancedFilterPanel');
        if (filterPanel) {
            bootstrap.Collapse.getInstance(filterPanel)?.hide();
        }
    }

    /**
     * Reset all advanced filters
     */
    resetAdvancedFilters() {
        // Reset form values
        document.getElementById('filter-protocol').value = '';
        document.getElementById('filter-interface').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-prefix').value = '';
        document.getElementById('filter-next-hop').value = '';
        
        // Reset the filter object
        this.advancedFilters = {
            protocol: '',
            interface: '',
            status: '',
            prefix: '',
            nextHop: ''
        };
        
        // Render the current VRF without filters
        this.renderRoutingTable(this.currentVrf);
    }

    /**
     * Render a filtered table based on advanced filters
     */
    renderFilteredTable() {
        const container = document.getElementById('routing-table-container');
        if (!container) return;

        // Filter routes
        let filteredRoutes = [];
        let vrfToSearch = this.currentVrf;
        let searchAllVrfs = false;
        
        // If we're showing all VRFs, we need to search all VRFs
        if (document.getElementById('vrf-heading')?.textContent === 'All Routes (All VRFs)') {
            searchAllVrfs = true;
        }

        // Get routes to filter
        if (searchAllVrfs) {
            // Get sorted VRFs with default first
            const sortedVrfs = this.getSortedVrfs();
            
            // Combine routes from all VRFs with VRF information in sorted order
            sortedVrfs.forEach(vrf => {
                if (!this.routes[vrf]) return;
                
                this.routes[vrf].forEach(route => {
                    if (route) {
                        filteredRoutes.push({...route, vrf});
                    }
                });
            });
        } else {
            // Just add routes from the current VRF
            if (this.routes[vrfToSearch]) {
                this.routes[vrfToSearch].forEach(route => {
                    if (route) {
                        filteredRoutes.push({...route, vrf: vrfToSearch});
                    }
                });
            }
        }

        // Apply filters
        filteredRoutes = filteredRoutes.filter(route => {
            // Skip routes without required properties
            if (!route.prefix) return false;
            
            // Protocol filter
            if (this.advancedFilters.protocol && route.protocol && 
                route.protocol.toLowerCase() !== this.advancedFilters.protocol.toLowerCase()) {
                return false;
            }
            
            // Status filter
            if (this.advancedFilters.status) {
                const isActive = route.selected && route.installed;
                if (this.advancedFilters.status === 'active' && !isActive) {
                    return false;
                }
                if (this.advancedFilters.status === 'inactive' && isActive) {
                    return false;
                }
            }
            
            // Prefix filter
            if (this.advancedFilters.prefix && 
                !route.prefix.includes(this.advancedFilters.prefix)) {
                return false;
            }
            
            // Interface filter
            if (this.advancedFilters.interface) {
                const hasMatchingInterface = route.nexthops?.some(
                    hop => hop.interfaceName === this.advancedFilters.interface
                );
                if (!hasMatchingInterface) {
                    return false;
                }
            }
            
            // Next hop filter
            if (this.advancedFilters.nextHop) {
                const hasMatchingNextHop = route.nexthops?.some(
                    hop => hop.ip && hop.ip.includes(this.advancedFilters.nextHop)
                );
                if (!hasMatchingNextHop) {
                    return false;
                }
            }
            
            return true;
        });

        // Sort filtered routes - put default VRF first, then sort by other VRFs
        filteredRoutes.sort((a, b) => {
            // Default VRF should come first
            if (a.vrf === 'default' && b.vrf !== 'default') return -1;
            if (a.vrf !== 'default' && b.vrf === 'default') return 1;
            
            // If same VRF or neither is default, sort by VRF name
            if (a.vrf !== b.vrf) return a.vrf.localeCompare(b.vrf);
            
            // Then put default routes first
            if (a.prefix === '0.0.0.0/0') return -1;
            if (b.prefix === '0.0.0.0/0') return 1;
            
            // Then sort by prefix
            return a.prefix.localeCompare(b.prefix);
        });

        // Update route count
        const routeCountEl = document.getElementById('route-count');
        if (routeCountEl) {
            routeCountEl.textContent = `${filteredRoutes.length} routes found (filtered)`;
        }

        // If no routes match, show a message
        if (filteredRoutes.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    No routes match the selected filters.
                </div>
            `;
            return;
        }

        // Create table HTML
        let tableHtml = `
            <table class="table table-hover">
                <thead>
                    <tr>
                        ${searchAllVrfs ? '<th>VRF</th>' : ''}
                        <th>Destination</th>
                        <th>Protocol</th>
                        <th>Next Hop(s)</th>
                        <th>Uptime</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Add filtered routes to the table
        filteredRoutes.forEach(route => {
            const protocol = this.formatProtocol(route.protocol || 'unknown');
            const nextHops = this.formatNextHops(route.nexthops);
            
            // Determine CSS class based on route status
            let rowClass = '';
            if (route.selected && route.installed) {
                rowClass = 'table-success';
            } else if (!route.selected) {
                rowClass = 'table-secondary';
            }
            
            tableHtml += `
                <tr class="${rowClass}">
                    ${searchAllVrfs ? `<td><span class="badge ${route.vrf === 'default' ? 'bg-primary' : 'bg-info'}">${route.vrf === 'default' ? 'Default' : route.vrf}</span></td>` : ''}
                    <td>${route.prefix}</td>
                    <td>${protocol}</td>
                    <td>${nextHops}</td>
                    <td>${route.uptime || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary route-details-btn" 
                                data-prefix="${route.prefix}"
                                data-vrf="${route.vrf}"
                                data-bs-toggle="modal" 
                                data-bs-target="#routeDetailsModal">
                            <i class="bi bi-info-circle"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tableHtml += `
                </tbody>
            </table>
        `;

        container.innerHTML = tableHtml;

        // Add event listeners to the details buttons
        document.querySelectorAll('.route-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prefix = e.currentTarget.getAttribute('data-prefix');
                const vrf = e.currentTarget.getAttribute('data-vrf');
                this.showRouteDetails(prefix, vrf);
            });
        });

        // Update VRF heading if needed
        const vrfHeading = document.getElementById('vrf-heading');
        if (vrfHeading && !searchAllVrfs) {
            const activeFilters = Object.entries(this.advancedFilters)
                .filter(([_, value]) => value !== '')
                .map(([key, _]) => key);
            
            vrfHeading.textContent = `Routes in VRF: ${vrfToSearch} (Filtered by: ${activeFilters.join(', ')})`;
        }
    }

    /**
     * Initialize dark mode listener
     */
    initDarkModeListener() {
        // Watch for theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-bs-theme') {
                    const newTheme = document.documentElement.getAttribute('data-bs-theme');
                    const isDarkMode = newTheme === 'dark';
                    
                    // Only re-render if dark mode status changed
                    if (this.darkMode !== isDarkMode) {
                        this.darkMode = isDarkMode;
                        console.log(`Theme changed to ${newTheme}, re-rendering views`);
                        
                        // Wait for theme to fully apply
                        setTimeout(() => {
                            this.renderVrfTabs();
                            this.renderRoutes();
                            this.renderVrfList();
                            this.renderRoutingStats();
                        }, 100);
                    }
                }
            });
        });
        
        // Start observing theme changes
        observer.observe(document.documentElement, { attributes: true });
    }

    /**
     * Load interface types from the main config to properly format interfaces
     */
    async loadInterfaceTypes() {
        try {
            // Make API call to get interface types
            const response = await fetch('/config?path=interfaces');
            const data = await response.json();

            if (data.success && data.data) {
                // Process each interface type
                const interfaces = data.data;
                for (const type in interfaces) {
                    if (Object.hasOwnProperty.call(interfaces, type)) {
                        const interfaceGroup = interfaces[type];
                        for (const name in interfaceGroup) {
                            if (Object.hasOwnProperty.call(interfaceGroup, name)) {
                                // Store interface type
                                this.interfaceTypes[name] = this.determineInterfaceType(type, name, interfaceGroup[name]);
                                // Add to the list of all interfaces
                                this.allInterfaces.add(name);
                            }
                        }
                    }
                }
                console.log('Loaded interface types:', this.interfaceTypes);
            }
        } catch (error) {
            console.error('Error loading interface types:', error);
        }
    }

    /**
     * Determine the interface type based on name and configuration
     * @param {string} baseType - The base interface type (ethernet, loopback, etc.)
     * @param {string} name - Interface name
     * @param {object} config - Interface configuration
     * @returns {string} - The determined interface type
     */
    determineInterfaceType(baseType, name, config) {
        // Check for VLAN interfaces (virtual interfaces)
        if (name.includes('.')) {
            return 'vif';
        }

        // Check if it's a loopback interface
        if (baseType === 'loopback') {
            return 'loopback';
        }

        // Check for WAN interfaces based on description or address
        if (config.description) {
            const desc = config.description.toLowerCase();
            if (desc.includes('wan') || desc.includes('external') || desc.includes('internet') || desc.includes('mgmt')) {
                return 'wan';
            }
            if (desc.includes('lan') || desc.includes('local') || desc.includes('internal')) {
                return 'lan';
            }
        }

        // Default to ethernet for physical interfaces
        if (baseType === 'ethernet') {
            return 'ethernet';
        }

        // Return the base type as fallback
        return baseType;
    }

    /**
     * Load routing data from the API
     * @param {boolean} forceRefresh - Whether to force a refresh of the data
     */
    async loadRoutingData(forceRefresh = false) {
        try {
            // Show loading state
            document.getElementById('routing-table-container').innerHTML = `
                <div class="text-center p-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading routing table data...</p>
                </div>
            `;

            // Fetch routing data from our new API endpoint
            const response = await fetch('/api/routes');
            const result = await response.json();
            
            if (!result.success) {
                console.error('Failed to load routing data:', result.error);
                document.getElementById('routing-table-container').innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to load routing table: ${result.error || 'Unknown error'}
                    </div>
                `;
                return false;
            }
            
            // Process the routes data
            this.routes = result.routes;
            
            // Map 'network' field to 'prefix' field for all routes
            Object.keys(this.routes).forEach(vrf => {
                this.routes[vrf] = this.routes[vrf].map(route => {
                    // If route has network but not prefix, copy network to prefix
                    if (route.network && !route.prefix) {
                        route.prefix = route.network;
                    }
                    return route;
                });
            });
            
            this.loaded = true;
            
            // Extract and track all interfaces from route data
            this.allInterfaces = new Set();
            Object.values(this.routes).forEach(routes => {
                routes.forEach(route => {
                    if (route.nexthops) {
                        route.nexthops.forEach(nexthop => {
                            if (nexthop.interfaceName) {
                                this.allInterfaces.add(nexthop.interfaceName);
                            }
                        });
                    }
                });
            });
            
            console.log('Loaded routing data with interfaces:', this.allInterfaces);
            
            // Set the default VRF
            if (Object.keys(this.routes).length > 0) {
                // Choose the 'default' VRF if it exists, otherwise the first one
                this.currentVrf = this.routes.default ? 'default' : Object.keys(this.routes)[0];
            }
            
            // Update the interface filter dropdown
            try {
                console.log('Calling populateInterfaceFilter...');
                this.populateInterfaceFilter();
                
                console.log('Calling populateProtocolFilter...');
                if (typeof this.populateProtocolFilter === 'function') {
                    this.populateProtocolFilter();
                } else {
                    console.error('populateProtocolFilter is not a function:', this.populateProtocolFilter);
                    
                    // Define it if it's missing
                    if (!this.populateProtocolFilter) {
                        this.populateProtocolFilter = function() {
                            const protocolFilter = document.getElementById('filter-protocol');
                            if (!protocolFilter) return;
                            
                            // Clear existing options
                            protocolFilter.innerHTML = '';
                            
                            // Add blank option first
                            const blankOption = document.createElement('option');
                            blankOption.value = '';
                            blankOption.textContent = 'All Protocols';
                            protocolFilter.appendChild(blankOption);
                            
                            // Collect all unique protocols
                            const protocols = new Set();
                            
                            Object.values(this.routes).forEach(vrfRoutes => {
                                vrfRoutes.forEach(route => {
                                    if (route.protocol) {
                                        protocols.add(route.protocol);
                                    }
                                });
                            });
                            
                            // Add options for each protocol
                            [...protocols].sort().forEach(protocol => {
                                const option = document.createElement('option');
                                option.value = protocol;
                                option.textContent = this.getProtocolName(protocol);
                                protocolFilter.appendChild(option);
                            });
                            
                            console.log('Protocol filter populated');
                        };
                        
                        // Call the newly defined function
                        this.populateProtocolFilter();
                    }
                }
            } catch (e) {
                console.error('Error populating filters:', e);
            }
            
            // Render all views
            try {
                if (typeof this.renderVrfTabs !== 'function') {
                    console.log('Defining missing renderVrfTabs function');
                    // Define renderVrfTabs if missing
                    this.renderVrfTabs = function() {
                        const vrfTabContainer = document.getElementById('vrf-tabs');
                        if (!vrfTabContainer || !this.loaded) return;
                        
                        // Clear existing tabs
                        vrfTabContainer.innerHTML = '';
                        
                        // Get sorted VRFs
                        const sortedVrfs = this.getSortedVrfNames();
                        
                        // Create tabs for each VRF
                        sortedVrfs.forEach(vrf => {
                            const routeCount = this.routes[vrf]?.length || 0;
                            const isActive = vrf === this.currentVrf;
                            
                            const button = document.createElement('button');
                            button.className = `vrf-tab btn ${isActive ? 'btn-primary' : 'btn-outline-primary'} me-2 mb-2`;
                            button.setAttribute('data-vrf', vrf);
                            button.innerHTML = `
                                ${vrf === 'default' ? 'Default' : vrf}
                                <span class="badge bg-light text-dark ms-1">${routeCount}</span>
                            `;
                            
                            // Add click handler
                            button.addEventListener('click', () => {
                                this.switchVrf(vrf);
                            });
                            
                            vrfTabContainer.appendChild(button);
                        });
                        
                        console.log('VRF tabs rendered');
                    };
                }
                
                this.renderVrfTabs();
                
                // Define renderRoutes if missing
                if (typeof this.renderRoutes !== 'function') {
                    console.log('Defining missing renderRoutes function');
                    this.renderRoutes = function() {
                        // Get search input value
                        const searchInput = document.getElementById('route-search');
                        const searchText = searchInput ? searchInput.value.trim() : '';
                        
                        if (searchText) {
                            // If search is active, filter routes
                            this.filterRoutes(searchText);
                        } else if (this.currentVrf === 'all') {
                            // If we're showing all routes
                            this.showAllRoutes();
                        } else {
                            // Check if advanced filters are active
                            const hasActiveFilters = Object.values(this.advancedFilters).some(v => v !== '');
                            
                            if (hasActiveFilters) {
                                // Apply advanced filters
                                this.renderFilteredTable();
                            } else {
                                // Just render current VRF
                                this.renderRoutingTable(this.currentVrf);
                            }
                        }
                    };
                }
                
                this.renderRoutes();
                
                // Define renderVrfList if missing
                if (typeof this.renderVrfList !== 'function') {
                    console.log('Defining missing renderVrfList function');
                    this.renderVrfList = this.renderVrfList || function() {
                        console.log('Stub implementation of renderVrfList');
                        // This can be a stub implementation until fixed properly
                    };
                }
                
                this.renderVrfList();
                
                // Define renderRoutingStats if missing
                if (typeof this.renderRoutingStats !== 'function') {
                    console.log('Defining missing renderRoutingStats function');
                    this.renderRoutingStats = this.renderRoutingStats || function() {
                        console.log('Stub implementation of renderRoutingStats');
                        // This can be a stub implementation until fixed properly
                    };
                }
                
                this.renderRoutingStats();
            } catch (e) {
                console.error('Error rendering views:', e);
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            return true;
        } catch (error) {
            console.error('Error loading routing data:', error);
            document.getElementById('routing-table-container').innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Error loading routing table: ${error.message || 'Unknown error'}
                </div>
            `;
            return false;
        }
    }

    /**
     * Switch to a different VRF
     * @param {string} vrf - The VRF to switch to
     */
    switchVrf(vrf) {
        if (vrf === this.currentVrf) return;
        
        this.currentVrf = vrf;
        
        // Update UI to reflect the VRF change
        document.querySelectorAll('.vrf-tab').forEach(tab => {
            const tabVrf = tab.getAttribute('data-vrf');
            if (tabVrf === vrf) {
                tab.classList.remove('btn-outline-primary');
                tab.classList.add('btn-primary');
            } else {
                tab.classList.remove('btn-primary');
                tab.classList.add('btn-outline-primary');
            }
        });
        
        // Update VRF heading
        const vrfHeading = document.getElementById('vrf-heading');
        if (vrfHeading) {
            vrfHeading.textContent = `Routes in VRF: ${vrf}`;
        }
        
        // Render the routing table for the selected VRF
        this.renderRoutingTable(vrf);
    }

    /**
     * Render the routing table for a specific VRF
     * @param {string} vrf - The VRF to render routes for
     */
    renderRoutingTable(vrf) {
        const container = document.getElementById('routing-table-container');
        if (!container || !this.loaded) return;
        
        const routes = this.routes[vrf] || [];
        
        // Update route count
        const routeCountEl = document.getElementById('route-count');
        if (routeCountEl) {
            routeCountEl.textContent = `${routes.length} routes found`;
        }
        
        // If no routes, show a message
        if (routes.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    No routes found in VRF: ${vrf}
                </div>
            `;
            return;
        }
        
        // Sort routes: default route first, then alphabetically by prefix
        routes.sort((a, b) => {
            // Check for undefined or missing prefix
            if (!a.prefix) return 1;
            if (!b.prefix) return -1;
            
            if (a.prefix === '0.0.0.0/0') return -1;
            if (b.prefix === '0.0.0.0/0') return 1;
            return a.prefix.localeCompare(b.prefix);
        });
        
        // Create table HTML
        let tableHtml = `
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Destination</th>
                        <th>Protocol</th>
                        <th>Next Hop(s)</th>
                        <th>Uptime</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        routes.forEach(route => {
            // Skip routes without prefix
            if (!route.prefix) {
                console.warn('Route missing prefix:', route);
                return;
            }
            
            const protocol = this.formatProtocol(route.protocol || 'unknown');
            const nextHops = this.formatNextHops(route.nexthops);
            
            // Determine CSS class based on route status
            let rowClass = '';
            if (route.selected && route.installed) {
                rowClass = 'table-success';
            } else if (!route.selected) {
                rowClass = 'table-secondary';
            }
            
            tableHtml += `
                <tr class="${rowClass}">
                    <td>${route.prefix}</td>
                    <td>${protocol}</td>
                    <td>${nextHops}</td>
                    <td>${route.uptime || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary route-details-btn" 
                                data-prefix="${route.prefix}"
                                data-vrf="${vrf}"
                                data-bs-toggle="modal" 
                                data-bs-target="#routeDetailsModal">
                            <i class="bi bi-info-circle"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tableHtml += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHtml;
        
        // Add event listeners to the details buttons
        document.querySelectorAll('.route-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prefix = e.currentTarget.getAttribute('data-prefix');
                const vrf = e.currentTarget.getAttribute('data-vrf');
                this.showRouteDetails(prefix, vrf);
            });
        });
    }

    /**
     * Format next hop information with badges for interface types
     * @param {Array} nexthops - Array of next hop objects
     * @returns {string} - HTML string of formatted next hops
     */
    formatNextHops(nexthops) {
        if (!nexthops || nexthops.length === 0) {
            return '<span class="text-muted">No next hop</span>';
        }
        
        return nexthops.map(hop => {
            let interfaceHtml = '';
            let nextHopHtml = '';
            
            // Format interface with color-coded badge based on interface type
            if (hop.interfaceName) {
                const interfaceType = this.getInterfaceType(hop.interfaceName);
                const badgeClass = this.getInterfaceBadgeClass(interfaceType);
                interfaceHtml = `<span class="badge ${badgeClass} interface-badge">${hop.interfaceName}</span>`;
            }
            
            // Format next hop IP if available, adding "(recursive)" label for recursive next hops
            if (hop.ip) {
                // If there's no interface but there is an IP, it's likely a recursive next hop
                const isRecursive = !hop.interfaceName;
                nextHopHtml = `<code>${hop.ip}${isRecursive ? ' <small>(recursive)</small>' : ''}</code>`;
            }
            
            // Return either next hop IP, interface badge, or both (interface first, then IP)
            if (interfaceHtml && nextHopHtml) {
                return `${interfaceHtml} ${nextHopHtml}`;
            } else if (nextHopHtml) {
                return nextHopHtml;
            } else if (interfaceHtml) {
                return interfaceHtml;
            } else {
                return '<span class="text-muted">Unknown</span>';
            }
        }).join('<br>');
    }
    
    /**
     * Get the interface type based on the interface name
     * @param {string} interfaceName - The name of the interface
     * @returns {string} - The type of the interface (ethernet, loopback, vlan, etc.)
     */
    getInterfaceType(interfaceName) {
        if (!interfaceName) return 'other';
        
        const name = interfaceName.toLowerCase();
        
        if (name.startsWith('eth')) {
            if (name.includes('.')) {
                return 'vlan';  // VLAN interface (subinterface)
            } else {
                return 'ethernet';  // Physical Ethernet
            }
        } else if (name.startsWith('lo')) {
            return 'loopback';  // Loopback
        } else if (name.startsWith('tun')) {
            return 'tunnel';  // Tunnel
        } else if (name.startsWith('vtun')) {
            return 'vpn';  // VPN
        } else if (name.startsWith('ppp')) {
            return 'ppp';  // PPP
        } else if (name.startsWith('wlan') || name.startsWith('wl')) {
            return 'wireless';  // Wireless
        } else if (name.startsWith('br')) {
            return 'bridge';  // Bridge
        } else if (name.startsWith('bond')) {
            return 'bond';  // Bond
        } else {
            return 'other';  // Other or unknown
        }
    }
    
    /**
     * Get the CSS class for an interface badge based on its type
     * @param {string} type - The interface type
     * @returns {string} - The CSS class for the badge
     */
    getInterfaceBadgeClass(type) {
        switch (type) {
            case 'ethernet':
                return 'bg-primary';
            case 'vlan':
                return 'bg-info';
            case 'loopback':
                return 'bg-secondary';
            case 'tunnel':
                return 'bg-dark';
            case 'vpn':
                return 'bg-success';
            case 'ppp':
                return 'bg-warning text-dark';
            case 'wireless':
                return 'bg-danger';
            case 'bridge':
                return 'bg-teal';
            case 'bond':
                return 'bg-indigo';
            default:
                return 'bg-secondary';
        }
    }
    
    /**
     * Format a protocol with a colored badge
     * @param {string} protocol - The protocol name
     * @returns {string} - HTML string with a colored badge
     */
    formatProtocol(protocol) {
        const protocolName = this.getProtocolName(protocol);
        const badgeClass = this.getProtocolBadgeClass(protocol);
        return `<span class="badge ${badgeClass} protocol-badge">${protocolName}</span>`;
    }
    
    /**
     * Get a user-friendly name for a routing protocol
     * @param {string} protocol - The protocol identifier
     * @returns {string} - User-friendly protocol name
     */
    getProtocolName(protocol) {
        if (!protocol) return 'Unknown';
        
        switch (protocol.toLowerCase()) {
            case 'kernel':
                return 'Kernel';
            case 'connected':
                return 'Connected';
            case 'static':
                return 'Static';
            case 'rip':
                return 'RIP';
            case 'ospf':
                return 'OSPF';
            case 'bgp':
                return 'BGP';
            case 'isis':
                return 'IS-IS';
            case 'eigrp':
                return 'EIGRP';
            case 'local':
                return 'Local';
            case 'undefined':
                return 'Unknown';
            default:
                return protocol;
        }
    }
    
    /**
     * Get the CSS class for a protocol badge
     * @param {string} protocol - The protocol identifier
     * @returns {string} - The CSS class for the badge
     */
    getProtocolBadgeClass(protocol) {
        if (!protocol) return 'bg-secondary';
        
        switch (protocol.toLowerCase()) {
            case 'kernel':
                return 'bg-secondary';
            case 'connected':
                return 'bg-success';
            case 'static':
                return 'bg-primary';
            case 'rip':
                return 'bg-info';
            case 'ospf':
                return 'bg-warning text-dark';
            case 'bgp':
                return 'bg-danger';
            case 'isis':
                return 'bg-dark';
            case 'eigrp':
                return 'bg-purple';
            case 'local':
                return 'bg-info';
            case 'undefined':
                return 'bg-secondary';
            default:
                return 'bg-secondary';
        }
    }

    /**
     * Show detailed information about a specific route
     * @param {string} prefix - The route prefix
     * @param {string} vrf - The VRF of the route
     */
    showRouteDetails(prefix, vrf) {
        if (!this.routes[vrf]) return;
        
        // Find the route - check both prefix and network fields
        let route = this.routes[vrf].find(r => r.prefix === prefix);
        
        // If not found by prefix, try by network
        if (!route) {
            route = this.routes[vrf].find(r => r.network === prefix);
        }
        
        if (!route) return;
        
        // For display, use either prefix or network
        const displayPrefix = route.prefix || route.network || 'Unknown';
        
        // Generate HTML for the route details
        let detailsHtml = `
            <div class="route-detail-header">
                <div class="badge ${route.selected && route.installed ? 'bg-success' : 'bg-secondary'} mb-2">
                    ${route.selected && route.installed ? 'Active' : 'Inactive'}
                </div>
                <h4>Route: ${displayPrefix}</h4>
                <div class="d-flex align-items-center mb-3">
                    <span class="badge ${vrf === 'default' ? 'bg-primary' : 'bg-info'} me-2">VRF: ${vrf === 'default' ? 'Default' : vrf}</span>
                    ${this.formatProtocol(route.protocol || 'unknown')}
                </div>
            </div>
            
            <div class="row mb-3">
                <div class="col-md-6">
                    <strong>Protocol:</strong> ${route.protocol || 'N/A'}
                </div>
                <div class="col-md-6">
                    <strong>Uptime:</strong> ${route.uptime || 'N/A'}
                </div>
            </div>
            
            <div class="row mb-3">
                <div class="col-md-6">
                    <strong>Selected:</strong> ${route.selected ? 'Yes' : 'No'}
                </div>
                <div class="col-md-6">
                    <strong>Installed:</strong> ${route.installed ? 'Yes' : 'No'}
                </div>
            </div>
        `;
        
        // Add next hops details if available
        if (route.nexthops && route.nexthops.length > 0) {
            detailsHtml += `
                <h5 class="mt-4 mb-3">Next Hops</h5>
                <div class="table-responsive">
                    <table class="table table-sm table-hover">
                        <thead>
                            <tr>
                                <th>Interface</th>
                                <th>IP Address</th>
                                <th>Active</th>
                                <th>Weight</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            route.nexthops.forEach(hop => {
                const interfaceType = this.getInterfaceType(hop.interfaceName);
                const badgeClass = this.getInterfaceBadgeClass(interfaceType);
                const isRecursive = !hop.interfaceName && hop.ip;
                
                detailsHtml += `
                    <tr>
                        <td>${hop.interfaceName ? `<span class="badge ${badgeClass}">${hop.interfaceName}</span>` : '<span class="text-muted">-</span>'}</td>
                        <td>${hop.ip ? `${hop.ip}${isRecursive ? ' <small>(recursive)</small>' : ''}` : '<span class="text-muted">-</span>'}</td>
                        <td>${hop.active ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-secondary">No</span>'}</td>
                        <td>${hop.weight || '1'}</td>
                    </tr>
                `;
            });
            
            detailsHtml += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        // Add additional route information if available
        if (route.distance !== undefined || route.metric !== undefined) {
            detailsHtml += `
                <h5 class="mt-4 mb-3">Route Metrics</h5>
                <div class="row">
                    ${route.distance !== undefined ? `
                    <div class="col-md-6 mb-2">
                        <strong>Administrative Distance:</strong> ${route.distance}
                    </div>
                    ` : ''}
                    ${route.metric !== undefined ? `
                    <div class="col-md-6 mb-2">
                        <strong>Metric:</strong> ${route.metric}
                    </div>
                    ` : ''}
                </div>
            `;
        }
        
        // Update the modal content
        const modalContent = document.getElementById('routeDetailsContent');
        if (modalContent) {
            modalContent.innerHTML = detailsHtml;
        }
        
        // Update the modal title
        const modalTitle = document.getElementById('routeDetailsModalLabel');
        if (modalTitle) {
            modalTitle.textContent = `Route Details: ${displayPrefix}`;
        }
    }

    /**
     * Filter routes based on search input
     * @param {string} searchText - The text to search for
     */
    filterRoutes(searchText) {
        if (!searchText) {
            // If search text is empty, render the normal table
            this.renderRoutingTable(this.currentVrf);
            return;
        }
        
        searchText = searchText.toLowerCase();
        
        const routes = this.routes[this.currentVrf] || [];
        const filteredRoutes = routes.filter(route => {
            // Skip routes without prefix or other properties
            if (!route.prefix) return false;
            
            // Check prefix
            if (route.prefix.toLowerCase().includes(searchText)) {
                return true;
            }
            
            // Check protocol
            if (route.protocol && route.protocol.toLowerCase().includes(searchText)) {
                return true;
            }
            
            // Check next hops
            if (route.nexthops && route.nexthops.some(hop => {
                return (hop.ip && hop.ip.includes(searchText)) || 
                      (hop.interfaceName && hop.interfaceName.toLowerCase().includes(searchText));
            })) {
                return true;
            }
            
            return false;
        });
        
        // Update UI
        const container = document.getElementById('routing-table-container');
        if (!container) return;
        
        // Update route count
        const routeCountEl = document.getElementById('route-count');
        if (routeCountEl) {
            routeCountEl.textContent = `${filteredRoutes.length} routes found (filtered)`;
        }
        
        // If no routes match, show a message
        if (filteredRoutes.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    No routes match the search term: "${searchText}"
                </div>
            `;
            return;
        }
        
        // Create table HTML
        let tableHtml = `
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Destination</th>
                        <th>Protocol</th>
                        <th>Next Hop(s)</th>
                        <th>Uptime</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        filteredRoutes.forEach(route => {
            const protocol = this.formatProtocol(route.protocol || 'unknown');
            const nextHops = this.formatNextHops(route.nexthops);
            
            // Determine CSS class based on route status
            let rowClass = '';
            if (route.selected && route.installed) {
                rowClass = 'table-success';
            } else if (!route.selected) {
                rowClass = 'table-secondary';
            }
            
            tableHtml += `
                <tr class="${rowClass}">
                    <td>${route.prefix}</td>
                    <td>${protocol}</td>
                    <td>${nextHops}</td>
                    <td>${route.uptime || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary route-details-btn" 
                                data-prefix="${route.prefix}"
                                data-vrf="${this.currentVrf}"
                                data-bs-toggle="modal" 
                                data-bs-target="#routeDetailsModal">
                            <i class="bi bi-info-circle"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tableHtml += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHtml;
        
        // Add event listeners to the details buttons
        document.querySelectorAll('.route-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prefix = e.currentTarget.getAttribute('data-prefix');
                const vrf = e.currentTarget.getAttribute('data-vrf');
                this.showRouteDetails(prefix, vrf);
            });
        });
    }

    /**
     * Render the VRF list view
     */
    renderVrfList() {
        if (!this.loaded) return;
        
        const vrfListContainer = document.getElementById('vrf-list');
        if (!vrfListContainer) return;
        
        const vrfs = this.getSortedVrfNames();
        
        let html = '';
        vrfs.forEach(vrf => {
            if (vrf === 'all') return; // Skip the "all" entry
            
            const routes = this.routes[vrf] || [];
            const routeCount = routes.length;
            
            // Count protocols
            const protocols = {};
            routes.forEach(route => {
                const protocol = route.protocol || 'unknown';
                protocols[protocol] = (protocols[protocol] || 0) + 1;
            });
            
            // Generate protocol badges
            let protocolBadges = '';
            Object.entries(protocols).forEach(([protocol, count]) => {
                const badge = this.getProtocolBadge(protocol);
                protocolBadges += `<div class="vrf-protocol-stat">${badge} <span class="protocol-count">${count}</span></div>`;
            });
            
            // VRF list item
            html += `
                <a href="#" class="list-group-item list-group-item-action" data-vrf="${vrf}">
                    <div class="d-flex w-100 justify-content-between align-items-center">
                        <h5 class="mb-1">${vrf === 'default' ? 'Default VRF' : vrf}</h5>
                        <span class="badge bg-primary rounded-pill">${routeCount} routes</span>
                    </div>
                    <div class="vrf-protocols">
                        ${protocolBadges}
                    </div>
                </a>
            `;
        });
        
        vrfListContainer.innerHTML = html;
        
        // Add click handlers to VRF items
        vrfListContainer.querySelectorAll('.list-group-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const vrf = item.dataset.vrf;
                this.currentVrf = vrf;
                
                // Switch to routes tab
                const routesTab = document.getElementById('routes-tab');
                if (routesTab) {
                    const tab = new bootstrap.Tab(routesTab);
                    tab.show();
                }
                
                // Update VRF tabs
                document.querySelectorAll('.vrf-tab').forEach(tab => {
                    tab.classList.remove('active');
                    if (tab.dataset.vrf === vrf) {
                        tab.classList.add('active');
                    }
                });
                
                // Render routes
                this.renderRoutes();
            });
        });
    }

    /**
     * Render routing statistics
     */
    renderRoutingStats() {
        if (!this.loaded) return;
        
        const statsContainer = document.getElementById('routing-stats');
        if (!statsContainer) return;
        
        // Calculate total counts
        const totalRoutes = Object.values(this.routes).reduce((sum, routes) => sum + routes.length, 0);
        
        // Count routes by protocol
        const protocolCounts = {};
        Object.values(this.routes).forEach(routes => {
            routes.forEach(route => {
                const protocol = route.protocol || 'unknown';
                protocolCounts[protocol] = (protocolCounts[protocol] || 0) + 1;
            });
        });
        
        // Count routes by prefix length
        const prefixCounts = {};
        Object.values(this.routes).forEach(routes => {
            routes.forEach(route => {
                if (!route.prefix) return;
                
                // Use prefix instead of network
                const prefixParts = route.prefix.split('/');
                const prefixLength = prefixParts.length > 1 ? parseInt(prefixParts[1], 10) : 32;
                prefixCounts[prefixLength] = (prefixCounts[prefixLength] || 0) + 1;
            });
        });
        
        // Collect interfaces
        this.allInterfaces = new Set();
        Object.values(this.routes).forEach(routes => {
            routes.forEach(route => {
                route.nexthops?.forEach(nexthop => {
                    if (nexthop.interfaceName) {
                        this.allInterfaces.add(nexthop.interfaceName);
                    }
                });
            });
        });
        
        // Build stats cards
        let html = `
            <div class="col-md-4 mb-3">
                <div class="card h-100">
                    <div class="card-header">
                        <i class="bi bi-table me-2"></i>
                        Route Summary
                    </div>
                    <div class="card-body">
                        <div class="routing-stat">
                            <span class="routing-stat-label">Total Routes</span>
                            <span class="routing-stat-value">${totalRoutes}</span>
                        </div>
                        <div class="routing-stat">
                            <span class="routing-stat-label">VRFs</span>
                            <span class="routing-stat-value">${Object.keys(this.routes).length}</span>
                        </div>
                        <div class="routing-stat">
                            <span class="routing-stat-label">Interfaces</span>
                            <span class="routing-stat-value">${this.allInterfaces.size}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-4 mb-3">
                <div class="card h-100">
                    <div class="card-header">
                        <i class="bi bi-diagram-3 me-2"></i>
                        Routes by Protocol
                    </div>
                    <div class="card-body">
        `;
        
        // Add protocol stats
        Object.entries(protocolCounts).sort((a, b) => b[1] - a[1]).forEach(([protocol, count]) => {
            const protocolName = this.getProtocolName(protocol);
            const badgeClass = this.getProtocolBadgeClass(protocol);
            const percentage = Math.round((count / totalRoutes) * 100);
            
            html += `
                <div class="routing-stat">
                    <span class="routing-stat-label">
                        <span class="badge ${badgeClass}">${protocolName}</span>
                    </span>
                    <span class="routing-stat-value">${count} <small class="text-muted">(${percentage}%)</small></span>
                </div>
            `;
        });
        
        html += `
                    </div>
                </div>
            </div>
            
            <div class="col-md-4 mb-3">
                <div class="card h-100">
                    <div class="card-header">
                        <i class="bi bi-pie-chart me-2"></i>
                        Prefix Distribution
                    </div>
                    <div class="card-body">
        `;
        
        // Group prefix lengths
        const prefixGroups = {
            'Less than 8': 0,
            '8 to 16': 0,
            '17 to 24': 0,
            '25 to 32': 0
        };
        
        Object.entries(prefixCounts).forEach(([length, count]) => {
            const len = parseInt(length, 10);
            if (len < 8) {
                prefixGroups['Less than 8'] += count;
            } else if (len <= 16) {
                prefixGroups['8 to 16'] += count;
            } else if (len <= 24) {
                prefixGroups['17 to 24'] += count;
            } else {
                prefixGroups['25 to 32'] += count;
            }
        });
        
        // Add prefix group stats
        Object.entries(prefixGroups).forEach(([group, count]) => {
            const percentage = Math.round((count / totalRoutes) * 100);
            
            html += `
                <div class="routing-stat">
                    <span class="routing-stat-label">${group}</span>
                    <span class="routing-stat-value">${count} <small class="text-muted">(${percentage}%)</small></span>
                </div>
            `;
        });
        
        html += `
                    </div>
                </div>
            </div>
        `;
        
        statsContainer.innerHTML = html;
    }

    /**
     * Get sorted VRF names with default first
     * @returns {Array} - Sorted VRF names
     */
    getSortedVrfNames() {
        if (!this.routes) return [];
        
        // Extract VRF names
        const vrfNames = Object.keys(this.routes).filter(vrf => vrf !== 'all');
        
        // Check if default VRF exists
        const defaultVrfIndex = vrfNames.indexOf('default');
        
        if (defaultVrfIndex === -1) {
            // No default VRF, just sort alphabetically
            return vrfNames.sort();
        }
        
        // Remove default VRF from the array
        const defaultVrf = vrfNames.splice(defaultVrfIndex, 1)[0];
        
        // Sort other VRFs alphabetically
        const otherVrfs = vrfNames.sort();
        
        // Return default VRF first, then others
        return [defaultVrf, ...otherVrfs];
    }

    /**
     * Get protocol badge HTML
     * @param {string} protocol - Protocol name
     * @returns {string} - HTML for protocol badge
     */
    getProtocolBadge(protocol) {
        const badgeClass = this.getProtocolBadgeClass(protocol);
        const protocolName = this.getProtocolName(protocol);
        return `<span class="badge ${badgeClass}">${protocolName}</span>`;
    }

    /**
     * Get protocol badge CSS class
     * @param {string} protocol - Protocol name
     * @returns {string} - CSS class for badge
     */
    getProtocolBadgeClass(protocol) {
        if (!protocol) return 'bg-secondary';
        
        switch (protocol.toLowerCase()) {
            case 'connected':
                return 'bg-success';
            case 'static':
                return 'bg-primary';
            case 'bgp':
                return 'bg-warning text-dark';
            case 'ospf':
                return 'bg-info text-dark';
            case 'rip':
                return 'bg-secondary';
            default:
                return 'bg-secondary';
        }
    }

    /**
     * Get protocol display name
     * @param {string} protocol - Protocol name
     * @returns {string} - Display name
     */
    getProtocolName(protocol) {
        if (!protocol) return 'Unknown';
        
        switch (protocol.toLowerCase()) {
            case 'connected':
                return 'Connected';
            case 'static':
                return 'Static';
            case 'bgp':
                return 'BGP';
            case 'ospf':
                return 'OSPF';
            case 'rip':
                return 'RIP';
            default:
                return protocol ? protocol.toUpperCase() : 'Unknown';
        }
    }

    /**
     * Get sorted VRF names with default first
     * @returns {Array} - Sorted VRF names
     */
    getSortedVrfs() {
        // This should return the sorted VRF names, not objects
        return this.getSortedVrfNames();
    }
}

// Initialize the routing table when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    const routingTable = new RoutingTable();
    // Store it globally for debugging
    window.routingTable = routingTable;
    routingTable.init();
}); 