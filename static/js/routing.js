/**
 * Network Routing Table functionality
 */
class NetworkRoutingTable {
    constructor() {
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
     * Set up event listeners for the routing table
     */
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-routes');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadRoutingData(true));
        }

        // Route search input
        const searchInput = document.getElementById('route-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterRoutes(searchInput.value));
        }

        // Tab switching to update VRF list view
        const vrfTab = document.getElementById('vrf-tab');
        if (vrfTab) {
            vrfTab.addEventListener('shown.bs.tab', () => {
                this.renderVrfList();
            });
        }

        // Tab switching to update stats view
        const statsTab = document.getElementById('stats-tab');
        if (statsTab) {
            statsTab.addEventListener('shown.bs.tab', () => {
                this.renderRoutingStats();
            });
        }

        // Show all routes button
        const showAllBtn = document.getElementById('show-all-routes');
        if (showAllBtn) {
            showAllBtn.addEventListener('click', () => this.showAllRoutes());
        }

        // Apply advanced filters button
        const applyFiltersBtn = document.getElementById('apply-filters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyAdvancedFilters());
        }

        // Reset advanced filters button
        const resetFiltersBtn = document.getElementById('reset-filters');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => this.resetAdvancedFilters());
        }

        // Handle advanced filter inputs to apply on enter key
        const filterInputs = document.querySelectorAll('#advancedFilterPanel input, #advancedFilterPanel select');
        filterInputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.applyAdvancedFilters();
                }
            });
        });
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
            
            // Sort routes: default route first, then alphabetically by prefix
            routes.sort((a, b) => {
                if (a.prefix === '0.0.0.0/0') return -1;
                if (b.prefix === '0.0.0.0/0') return 1;
                return a.prefix.localeCompare(b.prefix);
            });

            routes.forEach(route => {
                const protocol = this.formatProtocol(route.protocol);
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
                        <td>${route.uptime}</td>
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
                this.routes[vrf].forEach(route => {
                    filteredRoutes.push({...route, vrf});
                });
            });
        } else {
            // Just add routes from the current VRF
            this.routes[vrfToSearch]?.forEach(route => {
                filteredRoutes.push({...route, vrf: vrfToSearch});
            });
        }

        // Apply filters
        filteredRoutes = filteredRoutes.filter(route => {
            // Protocol filter
            if (this.advancedFilters.protocol && 
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
            const protocol = this.formatProtocol(route.protocol);
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
                    <td>${route.uptime}</td>
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
        // Use the same dark mode detection mechanism as the main site
        this.darkMode = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        
        // Listen for theme toggle button clicks
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                // The theme will be toggled by the main site's theme manager
                // Just wait a short moment for the change to be applied
                setTimeout(() => {
                    this.darkMode = document.documentElement.getAttribute('data-bs-theme') === 'dark';
                    
                    // Re-render views to reflect dark mode changes
                    this.renderRoutingTable(this.currentVrf);
                    this.renderVrfList();
                    this.renderRoutingStats();
                }, 50);
            });
        }

        // Use MutationObserver to detect theme changes from outside sources
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-bs-theme') {
                    const newDarkMode = document.documentElement.getAttribute('data-bs-theme') === 'dark';
                    if (this.darkMode !== newDarkMode) {
                        this.darkMode = newDarkMode;
                        
                        // Re-render views
                        this.renderRoutingTable(this.currentVrf);
                        this.renderVrfList();
                        this.renderRoutingStats();
                    }
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });
        
        // Set up toggle advanced filter button
        const toggleFilterBtn = document.getElementById('toggle-advanced-filter');
        if (toggleFilterBtn) {
            toggleFilterBtn.addEventListener('click', () => {
                const filterPanel = document.getElementById('advancedFilterPanel');
                if (filterPanel) {
                    // Check if we have bootstrap collapse instance
                    const bsCollapse = bootstrap.Collapse.getInstance(filterPanel);
                    if (bsCollapse) {
                        bsCollapse.toggle();
                    } else {
                        // Create a new collapse instance and toggle it
                        new bootstrap.Collapse(filterPanel).toggle();
                    }
                    
                    // Toggle the button icon
                    const icon = toggleFilterBtn.querySelector('i');
                    if (icon) {
                        if (icon.classList.contains('bi-filter')) {
                            icon.classList.remove('bi-filter');
                            icon.classList.add('bi-filter-circle-fill');
                        } else {
                            icon.classList.remove('bi-filter-circle-fill');
                            icon.classList.add('bi-filter');
                        }
                    }
                }
            });
        }
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
     * @param {boolean} forceRefresh - Whether to force a refresh from the server
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

            // Make API call to get routing data
            const response = await fetch(`/api/routes?${forceRefresh ? 'force_refresh=true' : ''}`);
            const data = await response.json();

            if (data.success && data.routes) {
                this.routes = data.routes;
                this.loaded = true;
                
                // Extract and track all interfaces from route data
                Object.values(this.routes).forEach(routes => {
                    routes.forEach(route => {
                        route.nexthops?.forEach(nexthop => {
                            if (nexthop.interfaceName) {
                                this.allInterfaces.add(nexthop.interfaceName);
                            }
                        });
                    });
                });
                
                // Update interface filter dropdown
                this.populateInterfaceFilter();
                
                // Render the data
                this.renderVrfTabs();
                this.renderRoutingTable(this.currentVrf);
                this.renderVrfList();
                this.renderRoutingStats();
            } else {
                document.getElementById('routing-table-container').innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to load routing table: ${data.error || 'Unknown error'}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading routing data:', error);
            document.getElementById('routing-table-container').innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Failed to load routing table: ${error.message || 'Network error'}
                </div>
            `;
        }
    }

    /**
     * Render tabs for VRF selection
     */
    renderVrfTabs() {
        const container = document.getElementById('vrf-pills');
        if (!container || !this.loaded) return;

        // Get VRFs from the loaded data sorted with default first
        const sortedVrfs = this.getSortedVrfs();
        
        // Create HTML for VRF tabs
        let html = '<div class="d-flex flex-wrap">';
        
        sortedVrfs.forEach(vrf => {
            const isActive = vrf === this.currentVrf;
            const btnClass = isActive ? 'btn-primary' : 'btn-outline-primary';
            
            html += `
                <button class="btn btn-sm ${btnClass} vrf-selector me-2 mb-2" data-vrf="${vrf}">
                    ${vrf === 'default' ? 'Default VRF' : vrf}
                    <span class="badge bg-light text-dark ms-1">${this.routes[vrf].length}</span>
                </button>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
        // Add event listeners to VRF buttons
        document.querySelectorAll('.vrf-selector').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const vrf = e.currentTarget.getAttribute('data-vrf');
                this.switchVrf(vrf);
            });
        });
    }

    /**
     * Switch to a different VRF
     * @param {string} vrf - The VRF to switch to
     */
    switchVrf(vrf) {
        if (vrf === this.currentVrf) return;
        
        this.currentVrf = vrf;
        
        // Update UI to reflect the VRF change
        document.querySelectorAll('.vrf-selector').forEach(btn => {
            const btnVrf = btn.getAttribute('data-vrf');
            if (btnVrf === vrf) {
                btn.classList.remove('btn-outline-primary');
                btn.classList.add('btn-primary');
            } else {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-outline-primary');
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
            const protocol = this.formatProtocol(route.protocol);
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
                    <td>${route.uptime}</td>
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
     * Format protocol name with badge
     * @param {string} protocol - The routing protocol
     * @returns {string} - Formatted HTML for the protocol badge
     */
    formatProtocol(protocol) {
        // Use consistent protocol classes that match our CSS
        const lowerProtocol = protocol.toLowerCase();
        
        // Check if we have a specific class for this protocol
        const validProtocols = ['static', 'connected', 'bgp', 'ospf', 'rip'];
        const badgeClass = validProtocols.includes(lowerProtocol) ? lowerProtocol : 'secondary';
        
        return `<span class="badge ${badgeClass}">${protocol}</span>`;
    }

    /**
     * Format next hops for display
     * @param {Array} nexthops - Array of next hop information
     * @returns {string} - Formatted HTML
     */
    formatNextHops(nexthops) {
        if (!nexthops || nexthops.length === 0) {
            return '<span class="text-muted">None</span>';
        }
        
        let hopHtml = '';
        
        nexthops.forEach((hop, index) => {
            if (index > 0) {
                hopHtml += '<br>';
            }
            
            // Process interface
            const interfaceHtml = hop.interfaceName ? 
                `<span class="badge ${this.getInterfaceType(hop.interfaceName)}">${hop.interfaceName}</span>` : 
                '';
            
            // Create next hop display
            if (hop.ip) {
                hopHtml += `
                    <div class="d-flex align-items-center gap-2">
                        <small>${hop.ip}</small>
                        ${interfaceHtml}
                    </div>
                `;
            } else if (hop.interfaceName) {
                hopHtml += interfaceHtml;
            } else {
                hopHtml += '<span class="text-muted">Direct</span>';
            }
        });
        
        return hopHtml;
    }

    /**
     * Get interface type for styling
     * @param {string} interfaceName - Name of the interface
     * @returns {string} - CSS class for the interface type
     */
    getInterfaceType(interfaceName) {
        if (!interfaceName) return 'ethernet';
        
        // Check if we have a known interface type
        if (this.interfaceTypes[interfaceName]) {
            return this.interfaceTypes[interfaceName];
        }
        
        // Otherwise, make an educated guess based on the name
        const name = interfaceName.toLowerCase();
        
        if (name.startsWith('lo') || name.includes('loopback')) {
            return 'loopback';
        } else if (name.startsWith('tu') || name.includes('tunnel')) {
            return 'tunnel';
        } else if (name.startsWith('vl') || name.includes('vlan')) {
            return 'vlan';
        } else if (name.includes('port-channel') || name.startsWith('po')) {
            return 'port-channel';
        } else {
            return 'ethernet';
        }
    }

    /**
     * Show detailed information about a specific route
     * @param {string} prefix - The route prefix
     * @param {string} vrf - The VRF of the route
     */
    showRouteDetails(prefix, vrf) {
        if (!this.routes[vrf]) return;
        
        // Find the route
        const route = this.routes[vrf].find(r => r.prefix === prefix);
        if (!route) return;
        
        // Generate HTML for the route details
        let detailsHtml = `
            <div class="route-detail-header">
                <div class="badge ${route.selected && route.installed ? 'bg-success' : 'bg-secondary'} mb-2">
                    ${route.selected && route.installed ? 'Active' : 'Inactive'}
                </div>
                <h4>Route: ${route.prefix}</h4>
                <div class="d-flex align-items-center mb-3">
                    <span class="badge ${vrf === 'default' ? 'bg-primary' : 'bg-info'} me-2">VRF: ${vrf === 'default' ? 'Default' : vrf}</span>
                    ${this.formatProtocol(route.protocol)}
                </div>
            </div>
            
            <div class="row mb-3">
                <div class="col-md-6">
                    <strong>Protocol:</strong> ${route.protocol}
                </div>
                <div class="col-md-6">
                    <strong>Uptime:</strong> ${route.uptime}
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
        
        // Add next hop information
        if (route.nexthops && route.nexthops.length > 0) {
            detailsHtml += `
                <h5 class="mt-3 mb-2">Next Hops</h5>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>IP Address</th>
                                <th>Interface</th>
                                <th>Weight</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            route.nexthops.forEach(hop => {
                const interfaceDisplay = hop.interfaceName ? 
                    `<span class="badge ${this.getInterfaceType(hop.interfaceName)}">${hop.interfaceName}</span>` : 
                    '<span class="text-muted">N/A</span>';
                
                detailsHtml += `
                    <tr>
                        <td>${hop.ip || 'Connected'}</td>
                        <td>${interfaceDisplay}</td>
                        <td>${hop.weight || 'N/A'}</td>
                        <td>
                            <span class="badge ${hop.active ? 'bg-success' : 'bg-secondary'}">
                                ${hop.active ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                    </tr>
                `;
            });
            
            detailsHtml += `
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            detailsHtml += `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    No next hop information available.
                </div>
            `;
        }
        
        // Add additional information if available
        if (route.adminDistance || route.metric || route.sourcePeer) {
            detailsHtml += `
                <h5 class="mt-3 mb-2">Additional Information</h5>
                <div class="row">
            `;
            
            if (route.adminDistance) {
                detailsHtml += `
                    <div class="col-md-4 mb-2">
                        <strong>Admin Distance:</strong> ${route.adminDistance}
                    </div>
                `;
            }
            
            if (route.metric) {
                detailsHtml += `
                    <div class="col-md-4 mb-2">
                        <strong>Metric:</strong> ${route.metric}
                    </div>
                `;
            }
            
            if (route.sourcePeer) {
                detailsHtml += `
                    <div class="col-md-4 mb-2">
                        <strong>Source Peer:</strong> ${route.sourcePeer}
                    </div>
                `;
            }
            
            detailsHtml += `
                </div>
            `;
        }
        
        // Set the modal title and content
        const modalTitle = document.getElementById('routeDetailsModalLabel');
        if (modalTitle) {
            modalTitle.textContent = `Route Details: ${prefix}`;
        }
        
        const modalContent = document.getElementById('routeDetailsContent');
        if (modalContent) {
            modalContent.innerHTML = detailsHtml;
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
            // Check prefix
            if (route.prefix.toLowerCase().includes(searchText)) {
                return true;
            }
            
            // Check protocol
            if (route.protocol.toLowerCase().includes(searchText)) {
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
            const protocol = this.formatProtocol(route.protocol);
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
                    <td>${route.uptime}</td>
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
        const container = document.getElementById('vrf-list-container');
        if (!container || !this.loaded) return;
        
        // Get VRFs from the loaded data sorted with default first
        const sortedVrfs = this.getSortedVrfs();
        
        if (sortedVrfs.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    No VRFs found in the routing table.
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="list-group">
        `;
        
        sortedVrfs.forEach(vrf => {
            const routes = this.routes[vrf] || [];
            const activeRoutes = routes.filter(route => route.selected && route.installed).length;
            
            html += `
                <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="mb-1">${vrf === 'default' ? 'Default VRF' : vrf}</h5>
                        <p class="mb-1 text-secondary">${routes.length} routes (${activeRoutes} active)</p>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-primary view-vrf-btn" data-vrf="${vrf}">
                            View Routes
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `
            </div>
        `;
        
        container.innerHTML = html;
        
        // Add event listeners to the view buttons
        document.querySelectorAll('.view-vrf-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const vrf = e.currentTarget.getAttribute('data-vrf');
                this.switchVrf(vrf);
                
                // Switch to the routes tab
                const routesTab = document.getElementById('routes-tab');
                if (routesTab) {
                    const tab = new bootstrap.Tab(routesTab);
                    tab.show();
                }
            });
        });
    }

    /**
     * Render routing statistics
     */
    renderRoutingStats() {
        const container = document.getElementById('routing-stats-container');
        if (!container || !this.loaded) return;
        
        // Calculate statistics
        const vrfs = Object.keys(this.routes);
        const totalRoutes = Object.values(this.routes).reduce((sum, routes) => sum + routes.length, 0);
        
        // Count routes by protocol
        const protocolCounts = {};
        Object.values(this.routes).forEach(routes => {
            routes.forEach(route => {
                const protocol = route.protocol.toLowerCase();
                protocolCounts[protocol] = (protocolCounts[protocol] || 0) + 1;
            });
        });
        
        // Calculate active routes
        const activeRoutes = Object.values(this.routes).reduce((sum, routes) => {
            return sum + routes.filter(route => route.selected && route.installed).length;
        }, 0);
        
        // Create HTML for statistics cards
        let statsHtml = `
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="routing-stat">
                    <h5>VRF Instances</h5>
                    <div class="routing-stat-value">${vrfs.length}</div>
                    <div class="routing-stat-label">Distinct routing domains</div>
                </div>
            </div>
            
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="routing-stat">
                    <h5>Total Routes</h5>
                    <div class="routing-stat-value">${totalRoutes}</div>
                    <div class="routing-stat-label">Across all VRFs</div>
                </div>
            </div>
            
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="routing-stat">
                    <h5>Active Routes</h5>
                    <div class="routing-stat-value">${activeRoutes}</div>
                    <div class="routing-stat-label">${(activeRoutes / totalRoutes * 100).toFixed(1)}% of total</div>
                </div>
            </div>
            
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="routing-stat">
                    <h5>Default Routes</h5>
                    <div class="routing-stat-value">${this.countDefaultRoutes()}</div>
                    <div class="routing-stat-label">0.0.0.0/0 routes</div>
                </div>
            </div>
        `;
        
        // Create protocol distribution section
        statsHtml += `
            <div class="col-12 mb-4">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Protocol Distribution</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
        `;
        
        // Add protocol cards
        for (const protocol in protocolCounts) {
            const percentage = (protocolCounts[protocol] / totalRoutes * 100).toFixed(1);
            statsHtml += `
                <div class="col-md-3 col-sm-6 mb-3">
                    <div class="routing-stat">
                        <div class="mb-2">${this.formatProtocol(protocol)}</div>
                        <div class="routing-stat-value">${protocolCounts[protocol]}</div>
                        <div class="routing-stat-label">${percentage}% of total routes</div>
                    </div>
                </div>
            `;
        }
        
        statsHtml += `
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Routes Per VRF</h5>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>VRF Name</th>
                                        <th>Total Routes</th>
                                        <th>Active Routes</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
        `;
        
        // Get VRFs sorted with default first
        const sortedVrfs = this.getSortedVrfs();
        
        // Add VRF rows
        sortedVrfs.forEach(vrf => {
            const routes = this.routes[vrf] || [];
            const activeVrfRoutes = routes.filter(route => route.selected && route.installed).length;
            const percentage = routes.length > 0 ? (activeVrfRoutes / routes.length * 100).toFixed(1) : 0;
            
            statsHtml += `
                <tr>
                    <td>${vrf === 'default' ? 'Default VRF' : vrf}</td>
                    <td>${routes.length}</td>
                    <td>${activeVrfRoutes} (${percentage}%)</td>
                    <td>
                        <button class="btn btn-sm btn-primary view-vrf-btn" data-vrf="${vrf}">
                            View Routes
                        </button>
                    </td>
                </tr>
            `;
        });
        
        statsHtml += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = statsHtml;
        
        // Add event listeners to the view buttons
        document.querySelectorAll('.view-vrf-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const vrf = e.currentTarget.getAttribute('data-vrf');
                this.switchVrf(vrf);
                
                // Switch to the routes tab
                const routesTab = document.getElementById('routes-tab');
                if (routesTab) {
                    const tab = new bootstrap.Tab(routesTab);
                    tab.show();
                }
            });
        });
    }

    /**
     * Count default routes (0.0.0.0/0) across all VRFs
     * @returns {number} - Number of default routes
     */
    countDefaultRoutes() {
        let count = 0;
        Object.values(this.routes).forEach(routes => {
            routes.forEach(route => {
                if (route.prefix === '0.0.0.0/0') {
                    count++;
                }
            });
        });
        return count;
    }

    /**
     * Helper method to get VRFs sorted with Default first
     * @returns {Array} Array of VRF names with default first
     */
    getSortedVrfs() {
        const vrfs = Object.keys(this.routes);
        const defaultVrf = vrfs.find(vrf => vrf === 'default');
        const otherVrfs = vrfs.filter(vrf => vrf !== 'default').sort();
        return defaultVrf ? [defaultVrf, ...otherVrfs] : otherVrfs;
    }
}

// Initialize the routing table when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    const routingTable = new NetworkRoutingTable();
    // Store it globally for debugging
    window.routingTable = routingTable;
    routingTable.init();
}); 