// Global configuration cache
let configCache = null;

/**
 * ConfigurationLogger - Tracks and logs configuration data for analysis
 */
class ConfigurationLogger {
    constructor() {
        // Define known fields for each service
        this.knownFields = {
            service: {
                dhcp: {
                    server: {
                        'shared-network-name': true,
                        subnet: {
                            range: true,
                            'default-router': true,
                            'name-server': true,
                            'domain-name': true,
                            lease: true,
                            'domain-search': true,
                            'ping-check': true,
                            'static-mapping': true
                        }
                    },
                    'listen-address': true
                },
                dns: {
                    forwarding: {
                        'allow-from': true,
                        'cache-size': true,
                        'listen-address': true,
                        'listen_address': true,
                        'name-server': true,
                        'system': true,
                        'options': true
                    },
                    'dynamic': true,
                    'nameserver': true
                },
                ntp: {
                    server: true,
                    'allow-client': {
                        address: true,
                        'address-v6': true,
                        network: true,
                        'network-v6': true
                    },
                    'listen-address': true,
                    'listen_address': true
                },
                ssh: {
                    port: true,
                    'client-keepalive-interval': true,
                    'disable-password-authentication': true,
                    'disable-pubkey-authentication': true,
                    'listen-address': true,
                    'listen_address': true,
                    ciphers: true,
                    'key-exchange-algorithms': true,
                    'mac-algorithms': true,
                    'host-key-algorithms': true
                }
            },
            system: {
                'host-name': true,
                'domain-name': true,
                'domain-search': true,
                'name-server': true,
                login: {
                    user: {
                        authentication: {
                            plaintext: true,
                            encrypted: true
                        },
                        'full-name': true
                    }
                },
                'time-zone': true
            },
            interfaces: {
                ethernet: true,
                loopback: true,
                bridge: true,
                wireguard: true,
                vlan: true,
                'tunnel': true,
                pppoe: true
            }
        };
        this.configLogs = [];
        this.unknownFields = {};
        this.loggingEnabled = localStorage.getItem('configLoggerEnabled') === 'true';
        this.sessionId = this.generateSessionId();
        
        // Try to load existing logs from storage
        this.loadLogsFromStorage();
        
        console.log(`ConfigurationLogger initialized with session ID: ${this.sessionId}, logging ${this.loggingEnabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Generate a unique session ID for this logging session
     */
    generateSessionId() {
        const timestamp = new Date().getTime();
        const random = Math.floor(Math.random() * 10000);
        return `log_${timestamp}_${random}`;
    }

    /**
     * Toggle logging on/off
     * @param {boolean} enabled - Whether logging should be enabled
     */
    toggleLogging(enabled) {
        this.loggingEnabled = enabled !== undefined ? enabled : !this.loggingEnabled;
        localStorage.setItem('configLoggerEnabled', this.loggingEnabled);
        console.log(`Configuration logging ${this.loggingEnabled ? 'enabled' : 'disabled'}`);
        
        // Update UI if toggle element exists
        const toggleEl = document.getElementById('config-logging-toggle');
        if (toggleEl) {
            toggleEl.checked = this.loggingEnabled;
        }
        
        return this.loggingEnabled;
    }

    /**
     * Log and analyze a configuration
     * @param {Object} config - The configuration object to analyze
     * @param {string} source - Source of the configuration
     */
    logConfiguration(config, source) {
        // Skip logging if disabled
        if (!this.loggingEnabled) {
            console.log('Configuration logging is disabled, skipping log');
            return null;
        }
        
        console.log(`Logging configuration from: ${source}`, config);
        
        // Add to logs
        const timestamp = new Date().toISOString();
        const logId = `${this.sessionId}_${this.configLogs.length + 1}`;
        const configEntry = {
            id: logId,
            timestamp,
            source,
            config: JSON.parse(JSON.stringify(config)), // Clone to avoid reference issues
            unknownFields: {}
        };
        
        // Analyze for unknown fields
        this.findUnknownFields(config, configEntry.unknownFields, '');
        
        // Add to logs
        this.configLogs.push(configEntry);
        console.log(`Configuration logged with ID: ${logId}`);
        
        // Store in localStorage (limited to recent entries to avoid storage issues)
        this.saveLogsToStorage();
        
        // Save to file
        this.saveLogToFile(configEntry);
        
        return configEntry;
    }
    
    /**
     * Save log entry to storage (without downloading)
     */
    saveLogToFile(logEntry) {
        try {
            // Get existing logs or create new array
            let allLogs = [];
            try {
                const savedLogs = localStorage.getItem('vyosConfigLogFile');
                if (savedLogs) {
                    allLogs = JSON.parse(savedLogs);
                }
            } catch (e) {
                console.warn('Could not load existing logs, starting fresh');
            }
            
            // Add new log entry
            allLogs.push(logEntry);
            
            // Save to localStorage
            localStorage.setItem('vyosConfigLogFile', JSON.stringify(allLogs));
            
            // Update status message
            this.showLogSavedNotification(allLogs.length);
            
            console.log(`Log entry saved to storage (${allLogs.length} total entries)`);
            return true;
        } catch (error) {
            console.error('Error saving log to storage:', error);
            return false;
        }
    }
    
    /**
     * Show a notification about log storage
     */
    showLogSavedNotification(entryCount) {
        const statusEl = document.getElementById('log-file-status');
        if (statusEl) {
            statusEl.textContent = `Log saved (${entryCount} entries in storage)`;
            statusEl.classList.add('show');
            
            // Hide after 3 seconds
            setTimeout(() => {
                statusEl.classList.remove('show');
            }, 3000);
        }
    }
    
    /**
     * Find unknown fields in configuration recursively
     */
    findUnknownFields(obj, results, path) {
        if (!obj || typeof obj !== 'object') return;
        
        const keys = Object.keys(obj);
        for (const key of keys) {
            const newPath = path ? `${path}.${key}` : key;
            
            // Check if this field is known based on path
            let isKnown = this.isFieldKnown(newPath);
            
            if (!isKnown) {
                if (!results[path]) {
                    results[path] = [];
                }
                results[path].push(key);
                
                // Add to global unknown fields
                if (!this.unknownFields[newPath]) {
                    this.unknownFields[newPath] = 0;
                }
                this.unknownFields[newPath]++;
            }
            
            // Recursively check children
            if (obj[key] && typeof obj[key] === 'object') {
                this.findUnknownFields(obj[key], results, newPath);
            }
        }
    }
    
    /**
     * Check if a field is known based on its path
     */
    isFieldKnown(path) {
        const parts = path.split('.');
        let current = this.knownFields;
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            // If this is a numeric index, skip the check
            if (!isNaN(part)) continue;
            
            // Check if this part exists in current known fields
            if (!current[part]) return false;
            
            // Move deeper into the structure
            current = current[part];
        }
        
        return true;
    }
    
    /**
     * Save logs to localStorage
     */
    saveLogsToStorage() {
        try {
            // Only keep the last 10 logs to avoid storage limits
            const recentLogs = this.configLogs.slice(-10);
            localStorage.setItem('configurationLogs', JSON.stringify(recentLogs));
            localStorage.setItem('unknownFields', JSON.stringify(this.unknownFields));
        } catch (e) {
            console.error('Failed to save logs to localStorage:', e);
        }
    }
    
    /**
     * Load logs from localStorage
     */
    loadLogsFromStorage() {
        try {
            const storedLogs = localStorage.getItem('configurationLogs');
            const storedUnknownFields = localStorage.getItem('unknownFields');
            
            if (storedLogs) {
                this.configLogs = JSON.parse(storedLogs);
                console.log(`Loaded ${this.configLogs.length} configuration logs from storage`);
            }
            
            if (storedUnknownFields) {
                this.unknownFields = JSON.parse(storedUnknownFields);
                console.log('Loaded unknown fields from storage');
            }
        } catch (e) {
            console.error('Failed to load logs from localStorage:', e);
        }
    }
    
    /**
     * Get all configuration logs
     */
    getLogs() {
        return this.configLogs;
    }
    
    /**
     * Get summary of unknown fields
     */
    getUnknownFieldsSummary() {
        return this.unknownFields;
    }
    
    /**
     * Get known fields
     */
    getKnownFields() {
        return this.knownFields;
    }
    
    /**
     * Merge known fields with new data
     */
    mergeKnownFields(newFields) {
        this.knownFields = { ...this.knownFields, ...newFields };
    }
}

// Initialize global configuration logger
const configLogger = new ConfigurationLogger();

/**
 * Apply the specified theme to the document
 * @param {string} theme - 'light' or 'dark'
 */
function setTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
    }
    console.log(`Theme set to: ${theme}`);
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Determine which page we're on based on the URL
        const currentPath = window.location.pathname;
        
        // Initialize theme manager
        new ThemeManager();
        
        // Create logging toggle in UI
        createLoggingToggle();
        
        if (currentPath === '/' || currentPath === '/index.html') {
            // Initialize dashboard
            initDashboard();
            
            // Add refresh button event listener for DHCP
            const refreshDhcpBtn = document.getElementById('refresh-dhcp-btn');
            if (refreshDhcpBtn) {
                refreshDhcpBtn.addEventListener('click', function() {
                    // Refresh the DHCP service data
                    refreshDhcpService();
                });
            }
        } else if (currentPath === '/firewall') {
            // Initialize firewall view
            initFirewallView();
        } else if (currentPath === '/interfaces') {
            // Initialize interfaces view
            initInterfacesView();
        } else if (currentPath === '/dhcp') {
            // Initialize DHCP view
            initDhcpView();
        } else if (currentPath.startsWith('/section/')) {
            // Initialize section view
            initSectionView();
        }
        
        // Setup event listeners for expand/collapse buttons if they exist
        const expandAllBtn = document.getElementById('btn-expand-all');
        const collapseAllBtn = document.getElementById('btn-collapse-all');
        
        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', expandAllNodes);
        }
        
        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', collapseAllNodes);
        }
        
        // Initialize tabs functionality
        initializeTabsHandlers();
    } catch (error) {
        console.error('Error in DOMContentLoaded handler:', error);
    }
});

// Initialize tab handlers safely
function initializeTabsHandlers() {
    // Get all tab sections
    const tabSections = document.querySelectorAll('.tab-section');
    
    // For each tab section, initialize handlers
    tabSections.forEach(section => {
        const tabLinks = section.querySelectorAll('.nav-link');
        const servicesTabLinks = section.querySelectorAll('.nav-tabs .nav-link');
        
        if (tabLinks && tabLinks.length > 0) {
            // Add click event to each tab link
            tabLinks.forEach(link => {
                if (link) {
                    link.addEventListener('click', function(e) {
                        try {
                            // Prevent default behavior
                            e.preventDefault();
                            
                            const target = this.getAttribute('data-target');
                            if (!target) return;
                            
                            // Hide all tab contents
                            document.querySelectorAll('.tab-pane').forEach(pane => {
                                if (pane) pane.classList.add('d-none');
                            });
                            
                            // Show the target tab content
                            const targetElement = document.getElementById(target);
                            if (targetElement) targetElement.classList.remove('d-none');
                            if (targetElement) targetElement.classList.add('d-block');
                            
                            // Add active class to the clicked tab and remove from others
                            servicesTabLinks.forEach(link => {
                                if (link) link.classList.remove('active');
                            });
                            this.classList.add('active');
                            
                            // Initialize specific tab content if needed
                            if (target === 'dhcp-tab-content' && typeof initDhcpService === 'function') {
                                initDhcpService();
                            } else if (target === 'dns-tab-content' && typeof initDnsService === 'function') {
                                initDnsService();
                            } else if (target === 'ntp-tab-content' && typeof initNtpService === 'function') {
                                initNtpService();
                            } else if (target === 'ssh-tab-content' && typeof initSshService === 'function') {
                                initSshService();
                            } else if (target === 'config-analysis-tab-content' && typeof initConfigAnalysis === 'function') {
                                initConfigAnalysis();
                            }
                        } catch (tabError) {
                            console.error('Error in tab click handler:', tabError);
                        }
                    });
                }
            });
            
            // Initialize the first tab (DHCP) by default
            const firstTab = servicesTabLinks[0];
            if (firstTab) {
                firstTab.click();
            }
        }
    });
}

// Fetch configuration data with retry logic
async function loadConfigData(endpoint = '', forceRefresh = false, retryCount = 3, retryDelay = 1000) {
    try {
        // Check cache first unless forced refresh
        const cacheKey = `config_${endpoint}`;
        const cachedData = sessionStorage.getItem(cacheKey);
        
        if (!forceRefresh && cachedData) {
            console.log(`Using cached configuration data for: ${endpoint || 'main'}`);
            return JSON.parse(cachedData);
        }
        
        // Show loading indicator safely
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('d-block');
            loadingIndicator.classList.remove('d-none');
        }
        
        // Use the correct endpoint: /config instead of /vyos-config
        const url = `/config${endpoint ? '?path=' + endpoint : ''}${forceRefresh ? (endpoint ? '&' : '?') + 'force_refresh=true' : ''}`;
        console.log(`Fetching config from: ${url}`);
        
        let response;
        try {
            response = await fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                cache: 'no-cache'
            });
        } catch (fetchError) {
            // Network error - retry if we have retries left
            if (retryCount > 0) {
                console.warn(`Network error, retrying (${retryCount} attempts left): ${fetchError.message}`);
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                
                // Recursive retry with exponential backoff
                return loadConfigData(endpoint, forceRefresh, retryCount - 1, retryDelay * 2);
            }
            throw fetchError;
        }
        
        if (!response.ok) {
            throw new Error(`Failed to fetch configuration data: ${response.status} ${response.statusText}`);
        }
        
        // Parse response data
        const result = await response.json();
        
        // Check if the result has the expected structure
        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch configuration data');
        }
        
        // Log the configuration with our logger
        configLogger.logConfiguration(result.data, 'API_FETCH');
        
        // Cache the result
        configCache = result.data;
        
        // Hide loading indicator safely
        if (loadingIndicator) {
            loadingIndicator.classList.remove('d-block');
            loadingIndicator.classList.add('d-none');
        }
        
        return result;
    } catch (error) {
        console.error('Error loading configuration data:', error);
        
        // Hide loading indicator safely even on error
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.classList.remove('d-block');
            loadingIndicator.classList.add('d-none');
        }
        
        // Show error notification
        showError(`Failed to load configuration data: ${error.message}. Please try again later.`);
        
        // Return empty data structure on error
        return { data: {} };
    }
}

// Initialize dashboard
async function initDashboard() {
    console.log("Initializing dashboard...");
    
    // Get UI elements
    const loadingIndicator = document.getElementById('loadingIndicator');
    const dashboardContent = document.getElementById('dashboardContent');
    const errorAlert = document.getElementById('errorAlert');
    
    // Make sure loading indicator is visible and dashboard is hidden
    if (loadingIndicator) {
        loadingIndicator.classList.add('d-block');
        loadingIndicator.classList.remove('d-none');
    }
    if (dashboardContent) {
        dashboardContent.classList.add('d-none');
        dashboardContent.classList.remove('d-block');
    }
    if (errorAlert) {
        errorAlert.classList.add('d-none');
        errorAlert.classList.remove('d-block');
    }
    
    try {
        // Load configuration data - force refresh to always get latest data
        const result = await loadConfigData('', true);
        const data = result.data || {};
        
        // Update dashboard with data if it exists
        if (Object.keys(data).length > 0) {
            try {
                updateDashboard(data);
                
                // Also initialize other tabs with the same data if they exist
                if (typeof initNetworkTab === 'function') initNetworkTab(data);
                if (typeof initFirewallTab === 'function') initFirewallTab(data);
                if (typeof initNatTab === 'function') initNatTab(data);
                if (typeof initServicesTab === 'function') initServicesTab(data);
                if (typeof initSystemTab === 'function') initSystemTab(data);
                
                // Show dashboard content when everything is loaded
                if (dashboardContent) {
                    dashboardContent.classList.remove('d-none');
                    dashboardContent.classList.add('d-block');
                }
            } catch (updateError) {
                console.error('Error updating dashboard:', updateError);
                
                // Show error alert
                if (errorAlert) {
                    errorAlert.textContent = `Failed to update dashboard: ${updateError.message}`;
                    errorAlert.classList.remove('d-none');
                    errorAlert.classList.add('d-block');
                }
            }
        } else {
            console.error('No configuration data available');
            
            // Show error alert
            if (errorAlert) {
                errorAlert.textContent = 'No configuration data available. Please check your connection and try again.';
                errorAlert.classList.remove('d-none');
                errorAlert.classList.add('d-block');
            }
        }
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        
        // Show error alert
        if (errorAlert) {
            errorAlert.textContent = `Dashboard initialization error: ${error.message}`;
            errorAlert.classList.remove('d-none');
            errorAlert.classList.add('d-block');
        }
    } finally {
        // Hide loading indicator when done
        if (loadingIndicator) {
            loadingIndicator.classList.remove('d-block');
            loadingIndicator.classList.add('d-none');
        }
    }
}

// Update dashboard with configuration data
function updateDashboard(data) {
    console.log("Updating dashboard with data:", data);
    
    if (!data) {
        console.error('No data provided to update dashboard');
        return;
    }
    
    try {
        // Get system information
        const hostname = data.system && data.system['host-name'] ? data.system['host-name'] : 'Unknown';
        updateElementText('hostname', hostname);
        
        // Update default gateway
        const defaultGateway = getDefaultGateway(data);
        updateElementText('defaultGateway', defaultGateway || 'N/A');
        
        // Update network information
        const interfaces = getInterfaces(data);
        const wanInterface = getWanInterface(interfaces, data);
        const lanInterface = getLanInterface(interfaces, data);
        
        // Count interfaces - include all types (ethernet, loopback, etc.)
        const interfaceCount = countAllInterfaces(data);
        updateElementText('interfaceCount', interfaceCount);
        
        // Update interface details
        if (wanInterface) {
            updateElementText('wanInterface', `${wanInterface.name} (${wanInterface.address})`);
        } else {
            updateElementText('wanInterface', 'N/A');
        }
        
        if (lanInterface) {
            updateElementText('lanInterface', `${lanInterface.name} (${lanInterface.address})`);
        } else {
            updateElementText('lanInterface', 'N/A');
        }
        
        // Count firewall rules from all rule groups
        const firewallRules = countFirewallRules(data);
        updateElementText('firewallRuleCount', firewallRules);
        
        // Count NAT rules
        const natRules = countNatRules(data);
        updateElementText('natRuleCount', natRules);
        
        // Count enabled services
        const services = countServices(data);
        updateElementText('serviceCount', services);
        
        // Update network topology details
        updateElementText('internetDetails', `WAN: ${wanInterface ? wanInterface.address : 'N/A'}`);
        updateElementText('routerDetails', hostname);
        
        // Update LAN details from the LAN interface
        if (lanInterface) {
            updateElementText('lanDetails', `LAN: ${lanInterface.network || lanInterface.address || 'N/A'}`);
        } else {
            updateElementText('lanDetails', 'LAN: N/A');
        }
        
        // Update other network interfaces
        updateOtherNetworks(interfaces, wanInterface, lanInterface);
        
        // Update DHCP Server information
        console.log("DHCP detection - Checking DHCP service data:", data.service);
        let dhcpStatus = 'Disabled';
        let dhcpPools = [];

        // Based on console logs, we see the service is using 'dhcp-server' not 'dhcp'
        // Check for DHCP pools in the 'dhcp-server' path
        if (data.service?.['dhcp-server']?.['shared-network-name']) {
            const networks = data.service['dhcp-server']['shared-network-name'];
            console.log("DHCP shared networks found:", networks);
            
            // Process each network to find subnets (pools)
            Object.entries(networks).forEach(([networkName, network]) => {
                console.log(`Processing network ${networkName}:`, network);
                if (network.subnet) {
                    const networkPools = Object.keys(network.subnet);
                    console.log("DHCP pools in network:", networkPools);
                    dhcpPools = dhcpPools.concat(networkPools);
                }
            });
        }

        // Check for direct pools in 'dhcp-server'
        if (data.service?.['dhcp-server']?.subnet) {
            const directPools = Object.keys(data.service['dhcp-server'].subnet);
            console.log("DHCP direct pools found:", directPools);
            dhcpPools = dhcpPools.concat(directPools);
        }

        console.log("DHCP pools detected:", dhcpPools);

        // If any pools were found, DHCP is enabled
        if (dhcpPools.length > 0) {
            dhcpStatus = `Enabled (${dhcpPools.length} pool${dhcpPools.length !== 1 ? 's' : ''})`;
        }

        console.log("Final DHCP status:", dhcpStatus);
        updateElementText('dhcpServer', dhcpStatus);
        
        // Update DNS Forwarding information
        let dnsStatus = 'Disabled';
        if (data.service && data.service.dns && data.service.dns.forwarding) {
            const dnsForwarding = data.service.dns.forwarding;
            if (dnsForwarding['listen-address'] || dnsForwarding['name-server']) {
                let dnsListeners = '';
                if (dnsForwarding['listen-address']) {
                    const listeners = Array.isArray(dnsForwarding['listen-address']) 
                        ? dnsForwarding['listen-address'] 
                        : [dnsForwarding['listen-address']];
                    dnsListeners = ` on ${listeners.join(', ')}`;
                }
                dnsStatus = `Enabled${dnsListeners}`;
            }
        }
        updateElementText('dnsForwarding', dnsStatus);
        
        // Update SSH Access information
        let sshStatus = 'Disabled';
        if (data.service && data.service.ssh) {
            const sshService = data.service.ssh;
            let sshPort = sshService.port || '22';
            if (Array.isArray(sshPort)) {
                sshPort = sshPort[0];
            }
            
            let sshAddresses = '';
            if (sshService['listen-address']) {
                const listeners = Array.isArray(sshService['listen-address'])
                    ? sshService['listen-address']
                    : [sshService['listen-address']];
                sshAddresses = ` on ${listeners.join(', ')}`;
            }
            
            sshStatus = `Enabled (Port ${sshPort}${sshAddresses})`;
        }
        updateElementText('sshAccess', sshStatus);
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

/**
 * Update the other networks section with additional interfaces
 * @param {Array} interfaces - All interfaces
 * @param {Object} wanInterface - The WAN interface
 * @param {Object} lanInterface - The LAN interface
 */
function updateOtherNetworks(interfaces, wanInterface, lanInterface) {
    const otherNetworksContainer = document.getElementById('other-networks-container');
    if (!otherNetworksContainer) return;
    
    // Clear existing networks except the first template
    const template = otherNetworksContainer.querySelector('.other-network');
    otherNetworksContainer.innerHTML = '';
    
    // Add eth2 as 10.10.10.0.2/24 as requested
    const eth2Network = {
        name: 'eth2',
        address: '10.10.10.0.2/24',
        description: 'Unknown'
    };
    addNetworkNode(otherNetworksContainer, eth2Network);
    
    // Add other interfaces that are not WAN or LAN
    if (interfaces && interfaces.length) {
        interfaces.forEach(iface => {
            // Skip if this is the WAN or LAN interface
            if ((wanInterface && iface.name === wanInterface.name) || 
                (lanInterface && iface.name === lanInterface.name) ||
                iface.name === 'eth2') {
                return;
            }
            
            // Determine description based on interface name
            let description = 'Unknown';
            if (iface.description) {
                description = iface.description;
            } else if (iface.name.includes('LAN') || iface.name.includes('lan')) {
                description = 'Internal Network';
            }
            
            addNetworkNode(otherNetworksContainer, {
                name: iface.name,
                address: iface.address,
                description: description
            });
        });
    }
}

/**
 * Add a network node to the container
 * @param {HTMLElement} container - Container to add the node to
 * @param {Object} network - Network information
 */
function addNetworkNode(container, network) {
    const node = document.createElement('div');
    node.className = 'network-node other-network mb-2';
    
    const icon = network.description === 'Internal Network' ? 'pc-display' : 'diagram-3';
    
    node.innerHTML = `
        <div class="d-flex align-items-center">
            <div class="node-icon me-2"><i class="bi bi-${icon}"></i></div>
            <div>
                <div class="node-label">${network.description}</div>
                <div class="node-details">${network.name}: ${network.address || 'No IP'}</div>
            </div>
        </div>
    `;
    
    container.appendChild(node);
}

// Safely update text of an element if it exists
function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    } else {
        console.warn(`Element with ID "${elementId}" not found, could not update text to "${text}"`);
    }
}

// Initialize firewall view
async function initFirewallView() {
    const loadingSpinner = document.getElementById('loading-spinner');
    const firewallContent = document.getElementById('firewall-content');
    
    if (!loadingSpinner || !firewallContent) {
        return;
    }
    
    // Show loading spinner
    loadingSpinner.style.display = 'block';
    firewallContent.style.display = 'none';
    
    try {
        // Try to use cached data first
        let firewallData;
        
        if (configCache) {
            firewallData = configCache.firewall;
        } else {
            // If no cache, fetch firewall data specifically
            const result = await loadConfigData('firewall');
            if (!result.success) {
                throw new Error('Failed to load firewall configuration');
            }
            firewallData = result.data;
        }
        
        renderFirewallGroups(firewallData);
        
        // Hide loading spinner and show content
        loadingSpinner.style.display = 'none';
        firewallContent.style.display = 'block';
    } catch (error) {
        console.error('Error loading firewall data:', error);
        loadingSpinner.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Failed to load firewall configuration: ${error.message}
            </div>
        `;
    }
}

// Initialize interfaces view
async function initInterfacesView() {
    const loadingSpinner = document.getElementById('loading-spinner');
    const interfacesContent = document.getElementById('interfaces-content');
    
    if (!loadingSpinner || !interfacesContent) {
        return;
    }
    
    // Show loading spinner
    loadingSpinner.style.display = 'block';
    interfacesContent.style.display = 'none';
    
    try {
        // Try to use cached data first
        let interfacesData;
        
        if (configCache) {
            interfacesData = configCache.interfaces;
        } else {
            // If no cache, fetch interfaces data specifically
            const result = await loadConfigData('interfaces');
            if (!result.success) {
                throw new Error('Failed to load interface configuration');
            }
            interfacesData = result.data;
        }
        
        renderInterfaces(interfacesData);
        
        // Hide loading spinner and show content
        loadingSpinner.style.display = 'none';
        interfacesContent.style.display = 'block';
    } catch (error) {
        console.error('Error loading interfaces data:', error);
        loadingSpinner.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Failed to load interface configuration: ${error.message}
            </div>
        `;
    }
}

// Initialize DHCP view
async function initDhcpView() {
    const loadingSpinner = document.getElementById('loading-spinner');
    const dhcpContent = document.getElementById('dhcp-content');
    
    if (!loadingSpinner || !dhcpContent) {
        return;
    }
    
    // Show loading spinner
    loadingSpinner.style.display = 'block';
    dhcpContent.style.display = 'none';
    
    try {
        // Try to use cached data first
        let dhcpData;
        
        if (configCache) {
            dhcpData = configCache.service?.['dhcp-server'];
        } else {
            // If no cache, fetch DHCP data specifically
            const result = await loadConfigData('service/dhcp-server');
            if (!result.success) {
                throw new Error('Failed to load DHCP server configuration');
            }
            dhcpData = result.data;
        }
        
        renderDhcpConfig(dhcpData);
        
        // Hide loading spinner and show content
        loadingSpinner.style.display = 'none';
        dhcpContent.style.display = 'block';
        
        // Load DHCP leases
        loadDhcpLeases();
    } catch (error) {
        console.error('Error loading DHCP data:', error);
        loadingSpinner.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Failed to load DHCP server configuration: ${error.message}
            </div>
        `;
    }
}

// Initialize the section view with tree structure
async function initSectionView() {
    try {
        // Extract section path from URL
        const sectionPath = window.location.pathname.replace('/section/', '');
        
        // Fetch the configuration for this section
        const response = await fetch(`/config?path=${sectionPath}`);
        const result = await response.json();
        
        if (!result.success) {
            showError('Error loading section data');
            return;
        }
        
        // Render the configuration tree
        const configTree = document.getElementById('config-tree');
        configTree.innerHTML = '';
        
        renderConfigTree(configTree, result.data);
        
    } catch (error) {
        console.error('Error initializing section view:', error);
        showError('Error loading section data');
    }
}

// Helper function to find DNS server
function findDnsServer(config) {
    if (config.service && config.service.dns && config.service.dns.forwarding) {
        return config.service.dns.forwarding['listen-address'] || null;
    }
    return null;
}

// Count the number of interfaces
function countInterfaces(config) {
    let count = 0;
    if (config.interfaces) {
        // Count ethernet interfaces
        if (config.interfaces.ethernet) {
            count += Object.keys(config.interfaces.ethernet).length;
        }
        // Count other interface types
        ['loopback', 'bridge', 'vlan', 'wireguard'].forEach(type => {
            if (config.interfaces[type]) {
                count += Object.keys(config.interfaces[type]).length;
            }
        });
    }
    return count;
}

// Count DHCP subnets
function countDhcpSubnets(config) {
    let count = 0;
    if (config.service && config.service['dhcp-server'] && config.service['dhcp-server']['shared-network-name']) {
        const networks = config.service['dhcp-server']['shared-network-name'];
        for (const network in networks) {
            if (networks[network].subnet) {
                count += Object.keys(networks[network].subnet).length;
            }
        }
    }
    return count;
}

// Populate the interfaces table
function populateInterfacesTable(config) {
    const table = document.getElementById('interfaces-table');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (!config.interfaces || !config.interfaces.ethernet) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No interface data available</td></tr>';
        return;
    }
    
    const interfaces = config.interfaces.ethernet;
    
    for (const ifName in interfaces) {
        const iface = interfaces[ifName];
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        
        row.innerHTML = `
            <td>${ifName}</td>
            <td>${iface.address || 'Not configured'}</td>
            <td>${iface.description || 'No description'}</td>
            <td>${iface.mtu || 'Default'}</td>
            <td>${iface['hw-id'] || 'N/A'}</td>
        `;
        
        tbody.appendChild(row);
    }
}

// Render configuration tree recursively
function renderConfigTree(container, configData) {
    if (typeof configData !== 'object' || configData === null) {
        // Handle primitive values
        const valueNode = document.createElement('span');
        valueNode.className = 'config-value';
        valueNode.textContent = configData;
        container.appendChild(valueNode);
        return;
    }
    
    // Create a container for this level
    const treeContainer = document.createElement('div');
    treeContainer.className = 'config-tree';
    
    // Process each key in the config object
    for (const key in configData) {
        const value = configData[key];
        const isObject = typeof value === 'object' && value !== null;
        
        // Create item container
        const itemDiv = document.createElement('div');
        itemDiv.className = 'config-item';
        
        // Create toggle button for objects
        if (isObject) {
            const toggle = document.createElement('span');
            toggle.className = 'config-toggle';
            toggle.textContent = '▼';
            toggle.addEventListener('click', function() {
                const childrenDiv = this.parentNode.querySelector('.config-children');
                const isExpanded = childrenDiv.style.display !== 'none';
                
                childrenDiv.style.display = isExpanded ? 'none' : 'block';
                this.textContent = isExpanded ? '▶' : '▼';
            });
            itemDiv.appendChild(toggle);
        }
        
        // Create key element
        const keySpan = document.createElement('span');
        keySpan.className = 'config-key';
        keySpan.textContent = key;
        itemDiv.appendChild(keySpan);
        
        // Add value or child elements
        if (isObject) {
            // Create container for child elements
            const childrenDiv = document.createElement('div');
            childrenDiv.className = 'config-children';
            renderConfigTree(childrenDiv, value);
            itemDiv.appendChild(childrenDiv);
        } else {
            // Add colon and space for simple values
            itemDiv.appendChild(document.createTextNode(': '));
            
            // Add value
            const valueSpan = document.createElement('span');
            valueSpan.className = 'config-value';
            valueSpan.textContent = value;
            itemDiv.appendChild(valueSpan);
        }
        
        treeContainer.appendChild(itemDiv);
    }
    
    container.appendChild(treeContainer);
}

// Expand all nodes in the config tree
function expandAllNodes() {
    const toggles = document.querySelectorAll('.config-toggle');
    toggles.forEach(toggle => {
        const childrenDiv = toggle.parentNode.querySelector('.config-children');
        childrenDiv.style.display = 'block';
        toggle.textContent = '▼';
    });
}

// Collapse all nodes in the config tree
function collapseAllNodes() {
    const toggles = document.querySelectorAll('.config-toggle');
    toggles.forEach(toggle => {
        const childrenDiv = toggle.parentNode.querySelector('.config-children');
        childrenDiv.style.display = 'none';
        toggle.textContent = '▶';
    });
}

// Show error message
function showError(message) {
    console.error('Error:', message);
    
    try {
        // Check if we're in a browser environment
        if (typeof document === 'undefined') return;
        
        // Check if error container exists, if not create it
        let errorContainer = document.getElementById('error-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'error-container';
            errorContainer.className = 'error-container';
            errorContainer.style.position = 'fixed';
            errorContainer.style.top = '10px';
            errorContainer.style.left = '50%';
            errorContainer.style.transform = 'translateX(-50%)';
            errorContainer.style.zIndex = '9999';
            errorContainer.style.maxWidth = '80%';
            document.body.appendChild(errorContainer);
        }
        
        // Create error alert
        const errorAlert = document.createElement('div');
        errorAlert.className = 'alert alert-danger';
        errorAlert.style.margin = '10px 0';
        errorAlert.style.padding = '10px 15px';
        errorAlert.style.borderRadius = '4px';
        errorAlert.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        errorAlert.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-close';
        closeBtn.style.float = 'right';
        closeBtn.style.fontSize = '0.8rem';
        closeBtn.style.marginLeft = '10px';
        closeBtn.addEventListener('click', function() {
            errorAlert.remove();
        });
        errorAlert.querySelector('.d-flex').appendChild(closeBtn);
        
        // Add error to container
        errorContainer.appendChild(errorAlert);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            errorAlert.remove();
            
            // Remove container if empty
            if (errorContainer.children.length === 0) {
                errorContainer.remove();
            }
        }, 5000);
    } catch (e) {
        // If DOM manipulation fails, just log to console
        console.error('Failed to show error in UI:', e);
    }
}

// Add theme manager script
class ThemeManager {
    constructor() {
        this.toggleBtn = document.getElementById('themeToggle');
        this.prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        
        this.init();
    }
    
    init() {
        this.applyTheme(this.currentTheme);
        
        if (this.toggleBtn) {
            // Add click event listener to the button
            this.toggleBtn.addEventListener('click', () => this.switchTheme());
        }
        
        this.prefersDarkScheme.addEventListener('change', (e) => {
            const newTheme = e.matches ? 'dark' : 'light';
            this.applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
    
    applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
        } else {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        }
        this.currentTheme = theme;
    }
    
    switchTheme() {
        // Toggle between light and dark
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    }
}

// Initialize the Network tab with detailed interface and routing information
function initNetworkTab(data) {
    // Fill in network interfaces table
    populateNetworkInterfaces(data);
    
    // Fill in network groups table
    populateNetworkGroups(data);
    
    // Fill in routing information
    populateRoutingInfo(data);
}

// Populate network interfaces table
function populateNetworkInterfaces(data) {
    // Get interfaces from data
    const interfaces = getInterfaces(data);
    const tableBody = document.getElementById('interfaces-table-body');
    const counter = document.getElementById('interfaces-count');
    
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // If no interfaces, show a message
    if (Object.keys(interfaces).length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No interfaces found</td></tr>';
        if (counter) counter.textContent = '0';
        return;
    }
    
    // Update the counter
    if (counter) counter.textContent = Object.keys(interfaces).length;
    
    // Sort interfaces by name
    const sortedInterfaceNames = Object.keys(interfaces).sort();
    
    // Create a row for each interface
    sortedInterfaceNames.forEach(name => {
        const iface = interfaces[name];
        const row = document.createElement('tr');
        
        // Determine the type badge class
        let typeBadgeClass = 'bg-secondary';
        if (iface.type === 'ethernet') {
            if (name === 'eth0' || iface.description && /wan|mgmt|external/i.test(iface.description)) {
                typeBadgeClass = 'bg-dark';
            } else if (name === 'eth1' || iface.description && /lan|internal/i.test(iface.description)) {
                typeBadgeClass = 'bg-success';
            }
        }
        
        // Create the interface row
        row.innerHTML = `
            <td>${name}</td>
            <td>${iface.description || '-'}</td>
            <td>${iface.address || '-'}</td>
            <td>${iface['hw-id'] || '-'}</td>
            <td>${iface.mtu || '1500'}</td>
            <td><span class="badge ${typeBadgeClass}">${formatInterfaceType(iface.type, name)}</span></td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Helper function to format interface type for display
function formatInterfaceType(type, name) {
    if (type === 'ethernet') {
        if (name === 'eth0' || /^eth0/.test(name)) {
            return 'WAN';
        } else if (name === 'eth1' || /^eth1/.test(name)) {
            return 'LAN';
        } else {
            return type.toUpperCase();
        }
    }
    return type.toUpperCase();
}

// Populate network groups table
function populateNetworkGroups(data) {
    const tableBody = document.getElementById('network-groups-table-body');
    const counter = document.getElementById('network-groups-count');
    
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Extract interface groups and network groups
    const interfaceGroups = data.firewall?.group?.['interface-group'] || {};
    const networkGroups = data.firewall?.group?.['network-group'] || {};
    const addressGroups = data.firewall?.group?.['address-group'] || {};
    const portGroups = data.firewall?.group?.['port-group'] || {};
    
    // Combine all groups
    const allGroups = {};
    
    // Process interface groups
    Object.keys(interfaceGroups).forEach(name => {
        allGroups[name] = {
            name: name,
            type: 'Interface Group',
            members: interfaceGroups[name].interface || '-'
        };
    });
    
    // Process network groups
    Object.keys(networkGroups).forEach(name => {
        allGroups[name] = {
            name: name,
            type: 'Network Group',
            members: networkGroups[name].network || '-'
        };
    });
    
    // Process address groups
    Object.keys(addressGroups).forEach(name => {
        allGroups[name] = {
            name: name,
            type: 'Address Group',
            members: addressGroups[name].address || '-'
        };
    });
    
    // Process port groups
    Object.keys(portGroups).forEach(name => {
        allGroups[name] = {
            name: name,
            type: 'Port Group',
            members: portGroups[name].port || '-'
        };
    });
    
    // Update the counter
    if (counter) counter.textContent = Object.keys(allGroups).length;
    
    // If no groups, show a message
    if (Object.keys(allGroups).length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No network groups found</td></tr>';
        return;
    }
    
    // Sort groups by name
    const sortedGroupNames = Object.keys(allGroups).sort();
    
    // Create a row for each group
    sortedGroupNames.forEach(name => {
        const group = allGroups[name];
        const row = document.createElement('tr');
        
        // Format members for display
        let membersDisplay = '';
        if (Array.isArray(group.members)) {
            membersDisplay = group.members.join(', ');
        } else if (typeof group.members === 'object') {
            membersDisplay = Object.keys(group.members).join(', ');
        } else {
            membersDisplay = group.members;
        }
        
        row.innerHTML = `
            <td>${name}</td>
            <td>${group.type}</td>
            <td>${membersDisplay}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Populate routing information
function populateRoutingInfo(data) {
    // Get routing information
    const defaultGateway = getDefaultGateway(data);
    const staticRoutes = data.protocols?.static?.route || {};
    
    // Get BGP networks if available
    const bgpNetworks = data.protocols?.bgp?.['address-family']?.['ipv4-unicast']?.network || {};
    
    // Update default gateway information
    const defaultGatewayInfo = document.getElementById('default-gateway-info');
    if (defaultGatewayInfo) {
        defaultGatewayInfo.textContent = defaultGateway || 'Not configured';
    }
    
    // Count total routes: static + bgp
    const totalRouteCount = Object.keys(staticRoutes).length + Object.keys(bgpNetworks).length;
    
    // Update static routes count
    const staticRoutesCount = document.getElementById('static-routes-count');
    if (staticRoutesCount) {
        staticRoutesCount.textContent = `${totalRouteCount} routes configured`;
    }
    
    // Populate routes table
    const routesTableBody = document.getElementById('routes-table-body');
    
    if (!routesTableBody) return;
    
    // Clear existing content
    routesTableBody.innerHTML = '';
    
    // If no routes, show a message
    if (totalRouteCount === 0) {
        routesTableBody.innerHTML = '<tr><td colspan="3" class="text-center">No routes configured</td></tr>';
        return;
    }
    
    // Process each static route
    Object.keys(staticRoutes).forEach(destination => {
        const route = staticRoutes[destination];
        
        // Check if this is a next-hop route
        const nextHops = route['next-hop'] || {};
        
        // If next-hop exists, create rows for each next hop
        if (Object.keys(nextHops).length > 0) {
            Object.keys(nextHops).forEach(nextHop => {
                const settings = nextHops[nextHop];
                const row = document.createElement('tr');
                
                // Extract distance or use default
                const distance = settings.distance || '1';
                
                row.innerHTML = `
                    <td>${destination}</td>
                    <td>${nextHop}</td>
                    <td>${distance}</td>
                `;
                
                routesTableBody.appendChild(row);
            });
        }
        
        // Check if this is a blackhole route
        if (route.blackhole) {
            const row = document.createElement('tr');
            const distance = route.blackhole.distance || '1';
            
            row.innerHTML = `
                <td>${destination}</td>
                <td><span class="badge bg-danger">Blackhole</span></td>
                <td>${distance}</td>
            `;
            
            routesTableBody.appendChild(row);
        }
    });
    
    // Process BGP networks if any
    Object.keys(bgpNetworks).forEach(network => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${network}</td>
            <td><span class="badge bg-info">BGP Network</span></td>
            <td>-</td>
        `;
        
        routesTableBody.appendChild(row);
    });
}

// Initialize the Firewall tab with detailed rule information
function initFirewallTab(data) {
    // Populate input rules table
    populateInputRules(data);
    
    // Populate forward rules table
    populateForwardRules(data);
    
    // Populate named rule sets
    populateNamedRuleSets(data);
    
    // Populate global policies
    populateGlobalPolicies(data);
    
    // Populate firewall groups table (reusing the same function as in Network tab)
    populateFirewallGroups(data);
}

// Populate input rules table
function populateInputRules(data) {
    const tableBody = document.getElementById('input-rules-table-body');
    
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Extract input filter rules
    const inputRules = data.firewall?.ipv4?.input?.filter?.rule || {};
    
    // If no rules, show a message
    if (Object.keys(inputRules).length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No input rules found</td></tr>';
        return;
    }
    
    // Sort rules by rule number
    const sortedRuleNumbers = Object.keys(inputRules).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Create a row for each rule
    sortedRuleNumbers.forEach(ruleNumber => {
        const rule = inputRules[ruleNumber];
        const row = document.createElement('tr');
        
        // Determine action and its styling
        let actionBadgeClass = 'bg-secondary';
        let actionIcon = '';
        
        if (rule.action === 'accept') {
            actionBadgeClass = 'bg-success';
            actionIcon = '<i class="bi bi-check-circle me-1"></i>';
        } else if (rule.action === 'drop' || rule.action === 'reject') {
            actionBadgeClass = 'bg-danger';
            actionIcon = '<i class="bi bi-x-circle me-1"></i>';
        } else if (rule.action === 'jump') {
            actionBadgeClass = 'bg-primary';
            actionIcon = '<i class="bi bi-arrow-right-circle me-1"></i>';
        }
        
        // Collect rule details
        const details = [];
        
        if (rule.protocol) {
            details.push(`<span class="badge bg-secondary">Protocol: ${rule.protocol}</span>`);
        }
        
        if (rule.destination?.port) {
            details.push(`<span class="badge bg-info">Port: ${rule.destination.port}</span>`);
        }
        
        if (rule['jump-target']) {
            details.push(`<span class="badge bg-primary">Jump to: ${rule['jump-target']}</span>`);
        }
        
        if (rule.source?.['address']) {
            details.push(`<span class="badge bg-secondary">Source: ${rule.source.address}</span>`);
        }
        
        if (rule.source?.['group']) {
            const groupType = Object.keys(rule.source.group)[0];
            const groupName = rule.source.group[groupType];
            details.push(`<span class="badge bg-secondary">Source Group: ${groupName}</span>`);
        }
        
        if (rule.icmp?.['type-name']) {
            details.push(`<span class="badge bg-secondary">ICMP: ${rule.icmp['type-name']}</span>`);
        }
        
        // Add state information if present
        if (rule.state) {
            const states = Object.keys(rule.state).join(', ');
            details.push(`<span class="badge bg-info">State: ${states}</span>`);
        }
        
        row.innerHTML = `
            <td>${ruleNumber}</td>
            <td><span class="badge ${actionBadgeClass}">${actionIcon}${capitalizeFirstLetter(rule.action)}</span></td>
            <td>${details.join(' ')}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Populate forward rules table
function populateForwardRules(data) {
    const tableBody = document.getElementById('forward-rules-table-body');
    
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Extract forward filter rules
    const forwardRules = data.firewall?.ipv4?.forward?.filter?.rule || {};
    
    // If no rules, show a message
    if (Object.keys(forwardRules).length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No forward rules found</td></tr>';
        return;
    }
    
    // Sort rules by rule number
    const sortedRuleNumbers = Object.keys(forwardRules).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Create a row for each rule
    sortedRuleNumbers.forEach(ruleNumber => {
        const rule = forwardRules[ruleNumber];
        const row = document.createElement('tr');
        
        // Determine action and its styling
        let actionBadgeClass = 'bg-secondary';
        let actionIcon = '';
        
        if (rule.action === 'accept') {
            actionBadgeClass = 'bg-success';
            actionIcon = '<i class="bi bi-check-circle me-1"></i>';
        } else if (rule.action === 'drop' || rule.action === 'reject') {
            actionBadgeClass = 'bg-danger';
            actionIcon = '<i class="bi bi-x-circle me-1"></i>';
        } else if (rule.action === 'jump') {
            actionBadgeClass = 'bg-primary';
            actionIcon = '<i class="bi bi-arrow-right-circle me-1"></i>';
        }
        
        // Collect rule details
        const details = [];
        
        if (rule.protocol) {
            details.push(`<span class="badge bg-secondary">Protocol: ${rule.protocol}</span>`);
        }
        
        if (rule['inbound-interface']) {
            const interfaceValue = rule['inbound-interface'].name || 
                                  (rule['inbound-interface'].group ? `Group: ${rule['inbound-interface'].group}` : '');
            details.push(`<span class="badge bg-secondary">In: ${interfaceValue}</span>`);
        }
        
        if (rule['outbound-interface']) {
            const interfaceValue = rule['outbound-interface'].name || 
                                  (rule['outbound-interface'].group ? `Group: ${rule['outbound-interface'].group}` : '');
            details.push(`<span class="badge bg-secondary">Out: ${interfaceValue}</span>`);
        }
        
        if (rule.destination?.port) {
            details.push(`<span class="badge bg-info">Port: ${rule.destination.port}</span>`);
        }
        
        if (rule['jump-target']) {
            details.push(`<span class="badge bg-primary">Jump to: ${rule['jump-target']}</span>`);
        }
        
        if (rule.destination?.group) {
            const groupType = Object.keys(rule.destination.group)[0];
            const groupName = rule.destination.group[groupType];
            details.push(`<span class="badge bg-secondary">Dest Group: ${groupName}</span>`);
        }
        
        row.innerHTML = `
            <td>${ruleNumber}</td>
            <td><span class="badge ${actionBadgeClass}">${actionIcon}${capitalizeFirstLetter(rule.action)}</span></td>
            <td>${details.join(' ')}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Populate named rule sets
function populateNamedRuleSets(data) {
    const container = document.getElementById('named-rule-sets-container');
    
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Extract named rule sets
    const namedRuleSets = data.firewall?.name || {};
    
    // If no named rule sets, show a message
    if (Object.keys(namedRuleSets).length === 0) {
        container.innerHTML = '<div class="text-center">No named rule sets found</div>';
        return;
    }
    
    // Sort rule set names alphabetically
    const sortedRuleSetNames = Object.keys(namedRuleSets).sort();
    
    // Create rule set panels
    sortedRuleSetNames.forEach(ruleSetName => {
        const ruleSet = namedRuleSets[ruleSetName];
        const ruleSetPanel = document.createElement('div');
        ruleSetPanel.className = 'card mb-3';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'card-header d-flex justify-content-between align-items-center';
        
        let defaultAction = ruleSet['default-action'] || 'none';
        let actionBadgeClass = 'bg-secondary';
        
        if (defaultAction === 'accept') {
            actionBadgeClass = 'bg-success';
        } else if (defaultAction === 'drop' || defaultAction === 'reject') {
            actionBadgeClass = 'bg-danger';
        }
        
        header.innerHTML = `
            <h5 class="m-0">${ruleSetName}</h5>
            <span class="badge ${actionBadgeClass}">Default: ${capitalizeFirstLetter(defaultAction)}</span>
        `;
        
        ruleSetPanel.appendChild(header);
        
        // Create rules table
        const rules = ruleSet.rule || {};
        const ruleCount = Object.keys(rules).length;
        
        const bodyContent = document.createElement('div');
        bodyContent.className = 'card-body p-2';
        
        if (ruleCount === 0) {
            bodyContent.innerHTML = '<div class="text-center">No rules in this rule set</div>';
        } else {
            // Create table for rules
            const table = document.createElement('table');
            table.className = 'table table-sm table-hover mb-0';
            
            // Add table header
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th width="60">Rule</th>
                    <th width="100">Action</th>
                    <th>Details</th>
                </tr>
            `;
            table.appendChild(thead);
            
            // Add table body
            const tbody = document.createElement('tbody');
            
            // Sort rule numbers
            const sortedRuleNumbers = Object.keys(rules).sort((a, b) => parseInt(a) - parseInt(b));
            
            // Add each rule
            sortedRuleNumbers.forEach(ruleNumber => {
                const rule = rules[ruleNumber];
                const row = document.createElement('tr');
                
                // Determine action and its styling
                let actionBadgeClass = 'bg-secondary';
                let actionIcon = '';
                
                if (rule.action === 'accept') {
                    actionBadgeClass = 'bg-success';
                    actionIcon = '<i class="bi bi-check-circle me-1"></i>';
                } else if (rule.action === 'drop' || rule.action === 'reject') {
                    actionBadgeClass = 'bg-danger';
                    actionIcon = '<i class="bi bi-x-circle me-1"></i>';
                } else if (rule.action === 'jump') {
                    actionBadgeClass = 'bg-primary';
                    actionIcon = '<i class="bi bi-arrow-right-circle me-1"></i>';
                }
                
                // Collect rule details
                const details = [];
                
                if (rule.protocol) {
                    details.push(`<span class="badge bg-secondary">Protocol: ${rule.protocol}</span>`);
                }
                
                if (rule['inbound-interface']) {
                    const interfaceValue = rule['inbound-interface'].name || 
                                          (rule['inbound-interface'].group ? `Group: ${rule['inbound-interface'].group}` : '');
                    details.push(`<span class="badge bg-secondary">In: ${interfaceValue}</span>`);
                }
                
                if (rule.state) {
                    const states = Object.keys(rule.state).join(', ');
                    details.push(`<span class="badge bg-info">State: ${states}</span>`);
                }
                
                if (rule.recent) {
                    details.push(`<span class="badge bg-warning">Recent: ${rule.recent.count}/${rule.recent.time}</span>`);
                }
                
                row.innerHTML = `
                    <td>${ruleNumber}</td>
                    <td><span class="badge ${actionBadgeClass}">${actionIcon}${capitalizeFirstLetter(rule.action)}</span></td>
                    <td>${details.join(' ')}</td>
                `;
                
                tbody.appendChild(row);
            });
            
            table.appendChild(tbody);
            bodyContent.appendChild(table);
        }
        
        ruleSetPanel.appendChild(bodyContent);
        container.appendChild(ruleSetPanel);
    });
}

// Populate global policies
function populateGlobalPolicies(data) {
    const tableBody = document.getElementById('global-policies-table-body');
    
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Extract global policies
    const globalPolicies = data.firewall?.['global-options']?.['state-policy'] || {};
    
    // If no policies, show a message
    if (Object.keys(globalPolicies).length === 0) {
        tableBody.innerHTML = '<tr><td colspan="2" class="text-center">No global policies found</td></tr>';
        return;
    }
    
    // Define the ordering of state policies for display
    const stateOrder = ['established', 'related', 'invalid', 'new'];
    const sortedStates = Object.keys(globalPolicies).sort((a, b) => {
        return stateOrder.indexOf(a) - stateOrder.indexOf(b);
    });
    
    // Create a row for each state policy
    sortedStates.forEach(state => {
        const policy = globalPolicies[state];
        const row = document.createElement('tr');
        
        // Determine policy and its styling
        let policyBadgeClass = 'bg-secondary';
        let policyIcon = '';
        
        if (policy.action === 'accept') {
            policyBadgeClass = 'bg-success';
            policyIcon = '<i class="bi bi-check-circle me-1"></i>';
        } else if (policy.action === 'drop' || policy.action === 'reject') {
            policyBadgeClass = 'bg-danger';
            policyIcon = '<i class="bi bi-x-circle me-1"></i>';
        }
        
        row.innerHTML = `
            <td>${capitalizeFirstLetter(state)}</td>
            <td><span class="badge ${policyBadgeClass}">${policyIcon}${capitalizeFirstLetter(policy.action)}</span></td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Populate firewall groups table
function populateFirewallGroups(data) {
    const tableBody = document.getElementById('firewall-groups-table-body');
    
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Extract firewall groups
    const interfaceGroups = data.firewall?.group?.['interface-group'] || {};
    const networkGroups = data.firewall?.group?.['network-group'] || {};
    const addressGroups = data.firewall?.group?.['address-group'] || {};
    const portGroups = data.firewall?.group?.['port-group'] || {};
    
    // Combine all groups
    const allGroups = {};
    
    // Process interface groups
    Object.keys(interfaceGroups).forEach(name => {
        allGroups[name] = {
            name: name,
            type: 'Interface Group',
            members: interfaceGroups[name].interface || '-'
        };
    });
    
    // Process network groups
    Object.keys(networkGroups).forEach(name => {
        allGroups[name] = {
            name: name,
            type: 'Network Group',
            members: networkGroups[name].network || '-'
        };
    });
    
    // Process address groups
    Object.keys(addressGroups).forEach(name => {
        allGroups[name] = {
            name: name,
            type: 'Address Group',
            members: addressGroups[name].address || '-'
        };
    });
    
    // Process port groups
    Object.keys(portGroups).forEach(name => {
        allGroups[name] = {
            name: name,
            type: 'Port Group',
            members: portGroups[name].port || '-'
        };
    });
    
    // If no groups, show a message
    if (Object.keys(allGroups).length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No firewall groups found</td></tr>';
        return;
    }
    
    // Sort groups by name
    const sortedGroupNames = Object.keys(allGroups).sort();
    
    // Create a row for each group
    sortedGroupNames.forEach(name => {
        const group = allGroups[name];
        const row = document.createElement('tr');
        
        // Format members for display
        let membersDisplay = '';
        if (Array.isArray(group.members)) {
            membersDisplay = group.members.join(', ');
        } else if (typeof group.members === 'object') {
            membersDisplay = Object.keys(group.members).join(', ');
        } else {
            membersDisplay = group.members;
        }
        
        row.innerHTML = `
            <td>${name}</td>
            <td>${group.type}</td>
            <td>${membersDisplay}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Helper function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Initialize the NAT tab with rules and flow visualization
function initNatTab(data) {
    // Populate source NAT rules table
    populateSourceNatRules(data);
    
    // Populate destination NAT rules table
    populateDestinationNatRules(data);
    
    // Update the NAT flow visualization
    updateNatFlowVisualization(data);
}

// Populate source NAT rules table
function populateSourceNatRules(data) {
    const tableBody = document.getElementById('source-nat-table-body');
    
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Extract source NAT rules
    const sourceNatRules = data.nat?.source?.rule || {};
    
    // If no rules, show a message
    if (Object.keys(sourceNatRules).length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No source NAT rules found</td></tr>';
        return;
    }
    
    // Sort rules by rule number
    const sortedRuleNumbers = Object.keys(sourceNatRules).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Create a row for each rule
    sortedRuleNumbers.forEach(ruleNumber => {
        const rule = sourceNatRules[ruleNumber];
        const row = document.createElement('tr');
        
        // Extract source address/network
        let sourceAddress = '-';
        if (rule.source?.address) {
            sourceAddress = rule.source.address;
        } else if (rule.source?.group) {
            const groupType = Object.keys(rule.source.group)[0];
            sourceAddress = `Group: ${rule.source.group[groupType]}`;
        }
        
        // Extract outbound interface
        let outboundInterface = '-';
        if (rule['outbound-interface']?.name) {
            outboundInterface = rule['outbound-interface'].name;
        } else if (rule['outbound-interface']) {
            outboundInterface = rule['outbound-interface'];
        }
        
        // Extract translation type and address
        let translationAddress = '-';
        let translationType = 'Static';
        
        if (rule.translation?.address === 'masquerade') {
            translationAddress = 'masquerade';
            translationType = 'Dynamic';
        } else if (rule.translation?.address) {
            translationAddress = rule.translation.address;
        }
        
        row.innerHTML = `
            <td>${ruleNumber}</td>
            <td>${sourceAddress}</td>
            <td>${outboundInterface}</td>
            <td>${translationAddress}</td>
            <td><span class="badge ${translationType === 'Dynamic' ? 'bg-primary' : 'bg-secondary'}">${translationType}</span></td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Populate destination NAT rules table
function populateDestinationNatRules(data) {
    const tableBody = document.getElementById('destination-nat-table-body');
    
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Extract destination NAT rules
    const destinationNatRules = data.nat?.destination?.rule || {};
    
    // If no rules, show a message
    if (Object.keys(destinationNatRules).length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No destination NAT rules found</td></tr>';
        return;
    }
    
    // Sort rules by rule number
    const sortedRuleNumbers = Object.keys(destinationNatRules).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Create a row for each rule
    sortedRuleNumbers.forEach(ruleNumber => {
        const rule = destinationNatRules[ruleNumber];
        const row = document.createElement('tr');
        
        // Extract destination address/port
        let destination = '-';
        if (rule.destination?.address) {
            destination = rule.destination.address;
            if (rule.destination.port) {
                destination += `:${rule.destination.port}`;
            }
        } else if (rule.destination?.port) {
            destination = `Port: ${rule.destination.port}`;
        }
        
        // Extract inbound interface
        let inboundInterface = '-';
        if (rule['inbound-interface']?.name) {
            inboundInterface = rule['inbound-interface'].name;
        } else if (rule['inbound-interface']) {
            inboundInterface = rule['inbound-interface'];
        }
        
        // Extract protocol
        const protocol = rule.protocol || '-';
        
        // Extract translation address/port
        let translation = '-';
        if (rule.translation?.address) {
            translation = rule.translation.address;
            if (rule.translation.port) {
                translation += `:${rule.translation.port}`;
            }
        } else if (rule.translation?.port) {
            translation = `Port: ${rule.translation.port}`;
        }
        
        row.innerHTML = `
            <td>${ruleNumber}</td>
            <td>${destination}</td>
            <td>${inboundInterface}</td>
            <td>${protocol.toUpperCase()}</td>
            <td>${translation}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Update the NAT flow visualization
function updateNatFlowVisualization(data) {
    // Get NAT rule information for SNAT (masquerade)
    const sourceNatRules = data.nat?.source?.rule || {};
    
    // Find the private network being NATed
    let privateNetwork = '192.168.0.0/24'; // Default
    let publicIp = '';
    let outboundInterface = '';
    let translationType = 'Source Address Translation (Masquerade)';
    
    // Look for masquerade rule
    for (const ruleNumber in sourceNatRules) {
        const rule = sourceNatRules[ruleNumber];
        if (rule.translation?.address === 'masquerade') {
            // Found a masquerade rule
            if (rule.source?.address) {
                privateNetwork = rule.source.address;
            }
            
            if (rule['outbound-interface']) {
                outboundInterface = rule['outbound-interface'].name || rule['outbound-interface'];
            }
            
            break;
        }
    }
    
    // Get the WAN IP for the outbound interface
    const interfaces = getInterfaces(data);
    if (outboundInterface && interfaces[outboundInterface]) {
        publicIp = interfaces[outboundInterface].address;
    } else {
        // Try to get any public IP
        const wanInterface = getWanInterface(interfaces, data);
        if (wanInterface) {
            publicIp = wanInterface.address;
        }
    }
    
    // Update visualization elements
    updateElementText('internal-network-ip', privateNetwork);
    updateElementText('external-network-ip', publicIp);
    updateElementText('nat-translation-type', translationType);
    
    // Determine public IP for detail message
    const publicIpWithoutMask = publicIp.split('/')[0];
    updateElementText('nat-translation-detail', `Internal clients appear as ${publicIpWithoutMask} to external servers`);
}

// Initialize the Services tab with network services configuration
function initServicesTab(data) {
    console.log('Initializing Services tab');
    console.log('Services data:', data.service);
    
    // Initialize DHCP Service
    initDhcpService(data);
    
    // Initialize BGP Service
    initBgpService(data);
    
    // Initialize DNS Service (lazy load)
    document.getElementById('dns-tab')?.addEventListener('click', function() {
        initDnsService();
    });
    
    // Initialize NTP Service (lazy load)
    document.getElementById('ntp-tab')?.addEventListener('click', function() {
        initNtpService();
    });
    
    // Initialize SSH Service (lazy load)
    document.getElementById('ssh-tab')?.addEventListener('click', function() {
        initSshService();
    });
    
    // Set up refresh button events
    document.getElementById('refreshDns')?.addEventListener('click', function() {
        initDnsService(true);
    });
    
    document.getElementById('refreshBgp')?.addEventListener('click', function() {
        initBgpService(data, true);
    });
    
    document.getElementById('refreshNtp')?.addEventListener('click', function() {
        initNtpService(true);
    });
    
    document.getElementById('refreshSsh')?.addEventListener('click', function() {
        initSshService(true);
    });
}

// Initialize the DHCP Service tab
function initDhcpService(data) {
    console.log("Initializing DHCP Service tab with data:", data);
    
    const dhcpStatus = document.getElementById('dhcp-status');
    const dhcpConfig = document.getElementById('dhcp-config');
    const dhcpNetworks = document.getElementById('dhcp-networks');
    
    if (!dhcpStatus || !dhcpConfig || !dhcpNetworks) {
        console.error("One or more DHCP elements not found:", {
            status: !!dhcpStatus,
            config: !!dhcpConfig,
            networks: !!dhcpNetworks
        });
        return;
    }
    
    // Log the service data structure to understand how to access DHCP server
    console.log("Service data structure:", data.service);
    
    // Check if DHCP server is configured - try both dhcp.server and dhcp-server paths
    const dhcpServer = 
        (data.service && data.service.dhcp && data.service.dhcp.server) || 
        (data.service && data.service['dhcp-server']);
    
    if (!dhcpServer) {
        dhcpStatus.style.display = 'block';
        dhcpConfig.style.display = 'none';
        dhcpStatus.innerHTML = '<div class="alert alert-warning mb-0">DHCP server is not configured</div>';
        console.error("No DHCP server configuration found in data:", data.service);
        return;
    }
    
    console.log("DHCP server configuration found:", dhcpServer);
    
    // Hide status and show configuration
    dhcpStatus.style.display = 'none';
    dhcpConfig.style.display = 'block';
    
    // Clear existing content
    dhcpNetworks.innerHTML = '';
    
    // Get shared networks - try both ways of accessing the shared-network-name property
    const sharedNetworks = dhcpServer["shared-network-name"] || {};
    console.log("Shared networks:", sharedNetworks);
    
    // Check if there are any shared networks
    if (!sharedNetworks || Object.keys(sharedNetworks).length === 0) {
        dhcpNetworks.innerHTML = '<div class="alert alert-info mb-0">No DHCP networks configured</div>';
        return;
    }
    
    // Process each shared network
    Object.keys(sharedNetworks).forEach(networkName => {
        console.log(`Processing network ${networkName}:`, sharedNetworks[networkName]);
        
        // Create a card for the shared network
        const networkItem = document.createElement('div');
        networkItem.className = 'network-item';
        
        // Create network header
        const networkHeader = document.createElement('div');
        networkHeader.className = 'network-item-header';
        networkHeader.innerHTML = `
            <h6>
                <i class="fas fa-network-wired"></i> ${networkName}
            </h6>
            <span class="badge bg-primary">${Object.keys(sharedNetworks[networkName].subnet || {}).length} Subnet(s)</span>
        `;
        networkItem.appendChild(networkHeader);
        
        // Create network body
        const networkBody = document.createElement('div');
        networkBody.className = 'network-item-body';
        
        // Get subnets for this network
        const subnets = sharedNetworks[networkName].subnet || {};
        console.log(`Subnets for ${networkName}:`, subnets);
        
        // Add each subnet as a clickable item
        const subnetKeys = Object.keys(subnets);
        
        if (subnetKeys.length === 0) {
            networkBody.innerHTML = '<div class="alert alert-warning mb-0">No subnets configured for this network</div>';
        } else {
            subnetKeys.forEach(subnetCidr => {
                console.log(`Processing subnet ${subnetCidr}:`, subnets[subnetCidr]);
                
                // Create subnet item
                const subnetItem = document.createElement('div');
                subnetItem.className = 'd-flex justify-content-between align-items-center mb-2 dhcp-subnet-card';
                subnetItem.style.cursor = 'pointer';
                
                // Safely parse subnet information
                const subnetInfo = parseSubnetInfo(subnetCidr);
                
                // Determine range if available
                let rangeText = "Default range";
                if (subnets[subnetCidr] && subnets[subnetCidr].range && subnets[subnetCidr].range[0]) {
                    const rangeData = subnets[subnetCidr].range[0];
                    if (rangeData.start && rangeData.start[0] && rangeData.stop && rangeData.stop[0]) {
                        rangeText = `${rangeData.start[0]} - ${rangeData.stop[0]}`;
                    }
                }
                
                // Get router/gateway information if available
                let routerInfo = '';
                if (subnets[subnetCidr]['default-router']) {
                    const router = subnets[subnetCidr]['default-router'];
                    routerInfo = `<small class="text-muted ms-2"><i class="fas fa-network-wired"></i> Gateway: ${Array.isArray(router) ? router[0] : router}</small>`;
                }
                
                // Get DNS server information if available
                let dnsInfo = '';
                if (subnets[subnetCidr]['name-server']) {
                    const dns = subnets[subnetCidr]['name-server'];
                    dnsInfo = `<small class="text-muted ms-2"><i class="fas fa-server"></i> DNS: ${Array.isArray(dns) ? dns[0] : dns}</small>`;
                }
                
                // Add subnet details
                subnetItem.innerHTML = `
                    <div>
                        <span class="subnet-badge">${subnetCidr}</span>
                        <small class="text-muted">${rangeText}</small>
                        ${routerInfo}
                        ${dnsInfo}
                    </div>
                    <div class="action-buttons">
                        <button class="action-button view-details-btn">
                            <i class="fas fa-chart-network"></i> View Details
                        </button>
                    </div>
                `;
                
                // Make entire subnet card clickable
                subnetItem.addEventListener('click', (event) => {
                    // Don't trigger if clicking on the button directly (to avoid double events)
                    if (!event.target.classList.contains('view-details-btn') && 
                        !event.target.closest('.view-details-btn')) {
                        console.log(`Clicked on subnet ${subnetCidr} in network ${networkName}`);
                        
                        // Clone the subnet data to ensure we have a clean copy
                        const subnetData = JSON.parse(JSON.stringify(subnets[subnetCidr]));
                        
                        // Ensure the subnet property exists and contains the CIDR
                        if (!subnetData.subnet || !Array.isArray(subnetData.subnet) || !subnetData.subnet.length) {
                            subnetData.subnet = [subnetCidr];
                        }
                        
                        // Show subnet details
                        showSubnetDetails(networkName, subnetCidr, subnetData);
                    }
                });
                
                // Keep original button click functionality
                const viewDetailsBtn = subnetItem.querySelector('.view-details-btn');
                viewDetailsBtn.addEventListener('click', () => {
                    console.log(`Clicked on subnet button ${subnetCidr} in network ${networkName}`);
                    
                    // Clone the subnet data to ensure we have a clean copy
                    const subnetData = JSON.parse(JSON.stringify(subnets[subnetCidr]));
                    
                    // Ensure the subnet property exists and contains the CIDR
                    if (!subnetData.subnet || !Array.isArray(subnetData.subnet) || !subnetData.subnet.length) {
                        subnetData.subnet = [subnetCidr];
                    }
                    
                    // Show subnet details
                    showSubnetDetails(networkName, subnetCidr, subnetData);
                });
                
                networkBody.appendChild(subnetItem);
            });
        }
        
        networkItem.appendChild(networkBody);
        dhcpNetworks.appendChild(networkItem);
    });
    
    // Set up the refresh button
    const refreshBtn = document.getElementById('refreshDhcp');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log("Refreshing DHCP configuration...");
            initDhcpService(true);
        });
    }
    
    // Set up the search functionality
    const searchInput = document.getElementById('dhcpSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            console.log("Searching for:", searchTerm);
            
            // Get all network items and subnet items
            const networkItems = document.querySelectorAll('.network-item');
            
            networkItems.forEach(networkItem => {
                const networkName = networkItem.querySelector('.network-item-header h6').textContent.trim().toLowerCase();
                const subnetItems = networkItem.querySelectorAll('.subnet-badge');
                
                let networkVisible = networkName.includes(searchTerm);
                let anySubnetVisible = false;
                
                subnetItems.forEach(subnetBadge => {
                    const subnetText = subnetBadge.textContent.toLowerCase();
                    const subnetVisible = subnetText.includes(searchTerm);
                    const subnetItem = subnetBadge.closest('.d-flex');
                    
                    if (subnetVisible) {
                        subnetItem.style.display = '';
                        anySubnetVisible = true;
                    } else {
                        subnetItem.style.display = networkVisible ? '' : 'none';
                    }
                });
                
                networkItem.style.display = (networkVisible || anySubnetVisible) ? '' : 'none';
            });
        });
    }
    
    // If we need to fetch data
    if (data === true) {
        loadConfigData('', true).then(result => {
            // Log the DHCP service configuration specifically
            if (result.data && result.data.service && result.data.service.dhcp) {
                configLogger.logConfiguration({dhcp: result.data.service.dhcp}, 'DHCP_SERVICE');
            }
            
            initDhcpService(result.data);
        }).catch(error => {
            console.error('Error loading DHCP data:', error);
            
            // Show error message
            const dhcpStatus = document.getElementById('dhcp-status');
            if (dhcpStatus) {
                dhcpStatus.style.display = 'block';
                dhcpStatus.innerHTML = `<div class="alert alert-danger mb-0">Failed to load DHCP data: ${error.message}</div>`;
            }
        });
        return;
    }
}

// Show detailed subnet information with IP address map and DHCP leases
async function showSubnetDetails(networkName, subnetName, subnet) {
    console.log("Subnet details for:", networkName, subnetName, subnet);
    
    try {
        // Get DHCP leases separately
        console.log("Fetching DHCP leases data...");
        const response = await fetch('/dhcpleases');
        const leasesData = await response.json();
        console.log("Raw leases response:", leasesData);
        
        // Parse subnet information from CIDR - subnet data comes from config
        const subnetCidr = Array.isArray(subnet.subnet) ? subnet.subnet[0] : subnet.subnet;
        console.log("Subnet CIDR to parse:", subnetCidr);
        const subnetInfo = parseSubnetInfo(subnetCidr);
        
        // Check if we have leases for this network
        let networkLeases = [];
        
        // The API response format changed - check different possible structures
        if (leasesData && leasesData.data && leasesData.data[networkName]) {
            // Format: data.data[networkName]
            networkLeases = leasesData.data[networkName];
            console.log(`Found ${networkLeases.length} leases for network ${networkName}`);
        } else if (leasesData && leasesData.leases && leasesData.leases[networkName]) {
            // Format: data.leases[networkName] 
            networkLeases = leasesData.leases[networkName];
            console.log(`Found ${networkLeases.length} leases for network ${networkName}`);
        } else {
            console.log(`No leases found for network ${networkName} in the response`);
            console.log("Available keys in response:", Object.keys(leasesData));
            if (leasesData.data) console.log("Available keys in data:", Object.keys(leasesData.data));
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'subnet-details-modal';
        modal.id = 'subnet-details-modal';
        
        // Create content
        const content = document.createElement('div');
        content.className = 'subnet-details-content';
        
        // Add close button
        const close = document.createElement('span');
        close.className = 'subnet-details-close';
        close.innerHTML = '&times;';
        close.onclick = () => {
            document.body.removeChild(modal);
        };
        
        // Add click outside functionality
        modal.addEventListener('click', (event) => {
            // If the click is on the modal background (not the content)
            if (event.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        // Add title
        const title = document.createElement('h2');
        title.textContent = `${networkName} - ${subnetCidr}`;
        
        // Create subnet info section
        const subnetInfoSection = document.createElement('div');
        subnetInfoSection.className = 'subnet-info';
        
        // Get DHCP range - this comes from the config (subnet parameter)
        let dhcpRanges = [];
        if (subnet.range) {
            // Get all range IDs (0, 1, 2, etc)
            const rangeIds = Object.keys(subnet.range);
            console.log("Range IDs:", rangeIds);
            
            // Process each range
            rangeIds.forEach(id => {
                const rangeData = subnet.range[id];
                if (rangeData.start && rangeData.stop) {
                    dhcpRanges.push(`${rangeData.start} - ${rangeData.stop}`);
                }
            });
        }
        
        const dhcpRange = dhcpRanges.length > 0 ? dhcpRanges.join(', ') : 'undefined - undefined';
        console.log("DHCP ranges:", dhcpRanges);
        
        // Get router/gateway information
        let routerInfo = 'Not configured';
        if (subnet['default-router']) {
            routerInfo = Array.isArray(subnet['default-router']) 
                ? subnet['default-router'].join(', ')
                : subnet['default-router'];
        }
        
        // Get DNS server information
        let dnsInfo = 'Not configured';
        if (subnet['name-server']) {
            dnsInfo = Array.isArray(subnet['name-server'])
                ? subnet['name-server'].join(', ')
                : subnet['name-server'];
        }
        
        // Get domain name if available
        let domainName = 'Not configured';
        if (subnet['domain-name']) {
            domainName = subnet['domain-name'];
        }
        
        subnetInfoSection.innerHTML = `
            <p><strong>Network:</strong> <span class="float-end">${subnetCidr}</span></p>
            <p><strong>Network Address:</strong> <span class="float-end">${subnetInfo.networkAddress}</span></p>
            <p><strong>Broadcast Address:</strong> <span class="float-end">${subnetInfo.broadcastAddress}</span></p>
            <p><strong>Gateway/Router:</strong> <span class="float-end">${routerInfo}</span></p>
            <p><strong>DNS Servers:</strong> <span class="float-end">${dnsInfo}</span></p>
            <p><strong>Domain Name:</strong> <span class="float-end">${domainName}</span></p>
            <p><strong>DHCP Range:</strong> <span class="float-end">${dhcpRange}</span></p>
            <p><strong>Usable Hosts:</strong> <span class="float-end">${subnetInfo.usableHosts}</span></p>
            <p><strong>Lease Time:</strong> <span class="float-end">${subnet.lease || 'Default'}</span></p>
        `;
        
        // Create IP Address Map section
        const ipMapContainer = document.createElement('div');
        ipMapContainer.className = 'ip-address-map-container';
        
        const ipMapTitle = document.createElement('h4');
        ipMapTitle.textContent = 'IP Address Map';
        ipMapContainer.appendChild(ipMapTitle);
        
        // Create the IP address map
        // Handle multiple DHCP ranges
        let ranges = [];
        
        // If range is defined in subnet config, add all ranges
        if (subnet.range) {
            const rangeIds = Object.keys(subnet.range);
            
            rangeIds.forEach(id => {
                const rangeData = subnet.range[id];
                if (rangeData.start && rangeData.stop) {
                    ranges.push({
                        start: rangeData.start,
                        stop: rangeData.stop
                    });
                }
            });
        }
        
        // If no ranges defined, use subnet's usable range
        if (ranges.length === 0) {
            ranges.push({
                start: subnetInfo.firstUsable,
                stop: subnetInfo.lastUsable
            });
        }
        
        console.log("DHCP ranges for IP map:", ranges);
        
        const ipAddressMap = createIpAddressMap(
            subnetCidr,
            subnetInfo.networkAddress,
            subnetInfo.broadcastAddress,
            subnetInfo.firstUsable,
            subnetInfo.lastUsable,
            ranges,
            subnetInfo.totalHosts,
            subnetInfo.usableHosts,
            networkLeases
        );
        
        ipMapContainer.appendChild(ipAddressMap);
        
        // Create DHCP Leases section
        const leasesContainer = document.createElement('div');
        leasesContainer.className = 'dhcp-leases-container';
        
        const leasesTitle = document.createElement('h4');
        leasesTitle.textContent = 'DHCP Leases';
        leasesContainer.appendChild(leasesTitle);
        
        const leasesTable = createLeasesTable(networkLeases);
        leasesContainer.appendChild(leasesTable);
        
        // Debug section (hidden by default)
        const debugSection = document.createElement('div');
        debugSection.className = 'debug-section';
        
        const debugToggle = document.createElement('button');
        debugToggle.className = 'btn btn-sm btn-outline-secondary mb-2';
        debugToggle.textContent = 'Show Raw API Response';
        debugToggle.onclick = () => {
            const debugData = debugSection.querySelector('.debug-data');
            if (debugData.style.display === 'none') {
                debugData.style.display = 'block';
                debugToggle.textContent = 'Hide Raw API Response';
            } else {
                debugData.style.display = 'none';
                debugToggle.textContent = 'Show Raw API Response';
            }
        };
        
        const debugData = document.createElement('pre');
        debugData.className = 'debug-data';
        debugData.style.display = 'none';
        debugData.textContent = JSON.stringify({
            subnet: subnet,
            subnetInfo: subnetInfo,
            leases: networkLeases,
            rawLeasesData: leasesData,
            networkName: networkName
        }, null, 2);
        
        debugSection.appendChild(debugToggle);
        debugSection.appendChild(debugData);
        
        // Append all sections to content
        content.appendChild(close);
        content.appendChild(title);
        content.appendChild(subnetInfoSection);
        content.appendChild(ipMapContainer);
        content.appendChild(leasesContainer);
        content.appendChild(debugSection);
        
        // Append content to modal
        modal.appendChild(content);
        
        // Add modal to body
        document.body.appendChild(modal);
        
        // Add escape key event listener
        document.addEventListener('keydown', function escListener(e) {
            if (e.key === 'Escape') {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
                document.removeEventListener('keydown', escListener);
            }
        });
        
    } catch (error) {
        console.error('Error displaying subnet details:', error);
        showError('Failed to display subnet details. Please try again later.');
    }
}

// Parse subnet information (CIDR notation)
function parseSubnetInfo(cidr) {
    console.log("Parsing subnet info for:", cidr);
    
    try {
        // Extract IP address and prefix
        const parts = cidr.split('/');
        
        if (parts.length !== 2) {
            console.warn(`Invalid CIDR format: ${cidr}`);
            return {
                cidr: cidr,
                networkAddress: "N/A",
                broadcastAddress: "N/A",
                firstUsable: "N/A",
                lastUsable: "N/A",
                totalHosts: 0,
                usableHosts: 0
            };
        }
        
        const ipAddress = parts[0];
        const prefixLength = parseInt(parts[1], 10);
        
        if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) {
            console.warn(`Invalid prefix length in CIDR: ${cidr}`);
            return {
                cidr: cidr,
                networkAddress: ipAddress,
                broadcastAddress: ipAddress,
                firstUsable: ipAddress,
                lastUsable: ipAddress,
                totalHosts: 1,
                usableHosts: 1
            };
        }
        
        // Convert IP to integer
        const ipInt = ipToInt(ipAddress);
        
        if (isNaN(ipInt)) {
            console.warn(`Invalid IP address in CIDR: ${cidr}`);
            return {
                cidr: cidr,
                networkAddress: ipAddress,
                broadcastAddress: ipAddress,
                firstUsable: ipAddress,
                lastUsable: ipAddress,
                totalHosts: 1,
                usableHosts: 1
            };
        }
        
        // Calculate subnet mask
        const mask = prefixLength === 0 ? 0 : (~0 << (32 - prefixLength));
        
        // Calculate network and broadcast addresses
        const networkInt = ipInt & mask;
        const broadcastInt = networkInt | (~mask);
        
        // Convert back to IP strings
        const networkAddress = intToIp(networkInt);
        const broadcastAddress = intToIp(broadcastInt);
        
        // Calculate first and last usable addresses (excluding network and broadcast)
        let firstUsableInt = networkInt;
        let lastUsableInt = broadcastInt;
        
        // For /31 and /32 networks, behavior is different
        if (prefixLength < 31) {
            firstUsableInt = networkInt + 1;
            lastUsableInt = broadcastInt - 1;
        } else if (prefixLength === 31) {
            // In a /31 network, there are only 2 addresses and both are usable (RFC 3021)
            firstUsableInt = networkInt;
            lastUsableInt = broadcastInt;
        } else if (prefixLength === 32) {
            // In a /32 network, there is only 1 address
            firstUsableInt = networkInt;
            lastUsableInt = networkInt;
        }
        
        const firstUsable = intToIp(firstUsableInt);
        const lastUsable = intToIp(lastUsableInt);
        
        // Calculate total hosts (2^(32-prefix))
        const totalHosts = Math.pow(2, 32 - prefixLength);
        
        // Calculate usable hosts (total - 2, except for /31 and /32)
        let usableHosts = totalHosts;
        if (prefixLength < 31) {
            usableHosts = Math.max(0, totalHosts - 2); // Subtract network and broadcast
        }
        
        console.log(`Parsed ${cidr}: Network=${networkAddress}, Broadcast=${broadcastAddress}, First=${firstUsable}, Last=${lastUsable}, Total=${totalHosts}, Usable=${usableHosts}`);
        
        return {
            cidr: cidr,
            networkAddress: networkAddress,
            broadcastAddress: broadcastAddress,
            firstUsable: firstUsable,
            lastUsable: lastUsable,
            totalHosts: totalHosts,
            usableHosts: usableHosts
        };
    } catch (error) {
        console.error("Error parsing subnet info:", error);
        return {
            cidr: cidr,
            networkAddress: "Error",
            broadcastAddress: "Error",
            firstUsable: "Error",
            lastUsable: "Error",
            totalHosts: 0,
            usableHosts: 0
        };
    }
}

// Convert IP address to integer
function ipToInt(ip) {
    try {
        // Handle cases where the IP might not be a string
        if (typeof ip !== 'string') {
            console.warn(`Invalid IP address format: ${ip} (type: ${typeof ip})`);
            return NaN;
        }
        
        // Split the IP into octets
        const parts = ip.split('.');
        
        // Check if we have exactly 4 octets
        if (parts.length !== 4) {
            console.warn(`Invalid IP address format: ${ip}`);
            return NaN;
        }
        
        // Convert each octet to a number and check range
        for (let i = 0; i < 4; i++) {
            const octet = parseInt(parts[i], 10);
            if (isNaN(octet) || octet < 0 || octet > 255) {
                console.warn(`Invalid octet in IP address ${ip}: ${parts[i]}`);
                return NaN;
            }
            parts[i] = octet;
        }
        
        // Combine the octets into a single integer
        return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
    } catch (error) {
        console.error(`Error in ipToInt for ${ip}:`, error);
        return NaN;
    }
}

// Convert integer to IP address
function intToIp(int) {
    return [
        (int >>> 24) & 255,
        (int >>> 16) & 255,
        (int >>> 8) & 255,
        int & 255
    ].join('.');
}

// Create IP address map visualization
function createIpAddressMap(cidr, networkAddress, broadcastAddress, firstUsable, lastUsable, ranges, totalHosts, usableHosts, leases) {
    // Create the container
    const container = document.createElement('div');
    container.className = 'ip-address-map';
    
    // Determine if we should show all IPs or just the leased ones (for large subnets)
    const showAllIps = usableHosts <= 256;
    let ipGrid;
    
    if (showAllIps) {
        // For small subnets, show all IP addresses
        ipGrid = createFullIPGrid(networkAddress, broadcastAddress, firstUsable, lastUsable, ranges, totalHosts, leases);
        container.appendChild(ipGrid);
    } else {
        // For larger subnets, only show leased IPs and network/broadcast addresses
        const message = document.createElement('div');
        message.className = 'alert alert-info mb-3';
        message.innerHTML = `<i class="fas fa-info-circle"></i> This subnet contains ${usableHosts} usable IP addresses. Only leased IPs are shown below.`;
        container.appendChild(message);
        
        ipGrid = createLeasedIPsGrid(networkAddress, broadcastAddress, ranges, totalHosts, leases);
        container.appendChild(ipGrid);
    }
    
    // Add usage summary
    const usageSummary = createUsageSummary(leases, usableHosts);
    container.appendChild(usageSummary);
    
    return container;
}

function createFullIPGrid(networkAddress, broadcastAddress, firstUsable, lastUsable, ranges, totalHosts, leases) {
    // Parse addresses to integers for comparison
    const networkInt = ipToInt(networkAddress);
    const broadcastInt = ipToInt(broadcastAddress);
    const firstUsableInt = ipToInt(firstUsable);
    const lastUsableInt = ipToInt(lastUsable);
    
    // Create a map of leased IPs for quick lookup
    const leasedIpMap = {};
    if (leases && leases.length > 0) {
        leases.forEach(lease => {
            if (lease && lease.ip_address) {
                leasedIpMap[lease.ip_address] = lease;
                console.log(`Adding ${lease.ip_address} to leased IPs map`);
            }
        });
    }
    console.log("Leased IPs map:", leasedIpMap);
    
    // Parse all range start and stop to integers
    const parsedRanges = ranges.map(range => ({
        startInt: ipToInt(range.start),
        stopInt: ipToInt(range.stop)
    }));
    console.log("Parsed DHCP ranges:", parsedRanges);
    
    // Create a document fragment to hold all IP boxes
    const fragment = document.createDocumentFragment();
    const grid = document.createElement('div');
    grid.className = 'ip-address-grid';
    fragment.appendChild(grid);
    
    // Helper function to check if an IP is in any DHCP range
    function isInAnyRange(ipInt) {
        for (const range of parsedRanges) {
            if (ipInt >= range.startInt && ipInt <= range.stopInt) {
                return true;
            }
        }
        return false;
    }
    
    // Generate all IPs in the subnet
    let currentInt = networkInt;
    while (currentInt <= broadcastInt) {
        const currentIp = intToIp(currentInt);
        
        let status = 'Available';
        let statusClass = 'available';
        let lease = null;
        
        // Determine the status of this IP
        if (currentInt === networkInt) {
            // Network address
            status = 'Network';
            statusClass = 'network';
        } else if (currentInt === broadcastInt) {
            // Broadcast address
            status = 'Broadcast';
            statusClass = 'broadcast';
        } else if (leasedIpMap[currentIp]) {
            // Leased IP
            status = 'Used';
            statusClass = 'used';
            lease = leasedIpMap[currentIp];
            console.log(`IP ${currentIp} is leased to ${lease.hostname}`);
        } else if (!isInAnyRange(currentInt) && currentInt >= firstUsableInt && currentInt <= lastUsableInt) {
            // Outside DHCP range but inside usable range
            status = 'Reserved';
            statusClass = 'reserved';
        }
        
        // Create the IP box
        const ipBox = createIPBox(currentIp, status, statusClass, lease);
        grid.appendChild(ipBox);
        
        // Move to next IP
        currentInt++;
    }
    
    return fragment;
}

// Create grid showing only leased IPs for large subnets
function createLeasedIPsGrid(networkAddress, broadcastAddress, ranges, totalHosts, leases) {
    // Create the grid
    const grid = document.createElement('div');
    grid.className = 'ip-address-grid';
    
    // Make sure we have the network address
    grid.appendChild(createIPBox(networkAddress, 'Network', 'network'));
    
    // Add range start addresses
    const networkInt = ipToInt(networkAddress);
    const firstUsableInt = networkInt + 1;
    
    if (ranges.length > 0) {
        // Add all range start points
        ranges.forEach((range, index) => {
            grid.appendChild(createIPBox(range.start, `Range ${index + 1} Start`, 'available'));
        });
    } else {
        grid.appendChild(createIPBox(intToIp(firstUsableInt), 'Range Start', 'available'));
    }
    
    // Add all leased IPs sorted by IP address
    if (leases && leases.length > 0) {
        // Sort leases by IP address
        const sortedLeases = [...leases].sort((a, b) => {
            const aInt = ipToInt(a.ip_address);
            const bInt = ipToInt(b.ip_address);
            return aInt - bInt;
        });
        
        // Add each leased IP
        sortedLeases.forEach(lease => {
            if (lease && lease.ip_address) {
                const ip = lease.ip_address;
                grid.appendChild(createIPBox(ip, lease.hostname || 'Used', 'used', lease));
            }
        });
    }
    
    // Add range end addresses
    const broadcastInt = ipToInt(broadcastAddress);
    const lastUsableInt = broadcastInt - 1;
    
    if (ranges.length > 0) {
        // Add all range end points
        ranges.forEach((range, index) => {
            grid.appendChild(createIPBox(range.stop, `Range ${index + 1} Stop`, 'available'));
        });
    } else {
        grid.appendChild(createIPBox(intToIp(lastUsableInt), 'Range Stop', 'available'));
    }
    
    // Add broadcast address
    grid.appendChild(createIPBox(broadcastAddress, 'Broadcast', 'broadcast'));
    
    return grid;
}

function createIPBox(ip, status, className, lease = null) {
    const box = document.createElement('div');
    box.className = `ip-address-box ${className}`;
    
    // Add tooltip for leased IPs
    if (lease && lease.hostname) {
        box.title = `${lease.hostname} (${lease.mac})`;
    }
    
    const ipText = document.createElement('div');
    ipText.className = 'ip-text';
    ipText.textContent = ip;
    
    const statusText = document.createElement('div');
    statusText.className = 'ip-status';
    statusText.textContent = status;
    
    box.appendChild(ipText);
    box.appendChild(statusText);
    
    return box;
}

// Create usage summary
function createUsageSummary(leases, usableHosts) {
    // Create the container
    const container = document.createElement('div');
    container.className = 'usage-summary';
    
    // Calculate usage
    const totalLeases = leases.length;
    const usagePercent = usableHosts > 0 ? Math.round((totalLeases / usableHosts) * 100) : 0;
    
    // Create status types with colors
    const statusTypes = [
        { name: 'Used', count: totalLeases, color: 'used' },
        { name: 'Available', count: usableHosts - totalLeases, color: 'available' },
        { name: 'Reserved', count: 2, color: 'network' } // Network and broadcast addresses
    ];
    
    // Create the stats section
    const stats = document.createElement('div');
    stats.className = 'usage-stats';
    
    statusTypes.forEach(type => {
        const stat = document.createElement('div');
        stat.className = 'usage-stat';
        
        const color = document.createElement('span');
        color.className = `usage-stat-color ${type.color}`;
        
        const label = document.createElement('span');
        label.className = 'usage-stat-label';
        label.textContent = `${type.name}: ${type.count}`;
        
        stat.appendChild(color);
        stat.appendChild(label);
        stats.appendChild(stat);
    });
    
    container.appendChild(stats);
    
    // Create the progress bar
    const progressContainer = document.createElement('div');
    progressContainer.className = 'usage-progress';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'usage-progress-bar';
    progressBar.style.width = `${usagePercent}%`;
    
    progressContainer.appendChild(progressBar);
    container.appendChild(progressContainer);
    
    // Add text summary
    const summary = document.createElement('div');
    summary.className = 'usage-percentage text-end';
    summary.textContent = `${totalLeases} of ${usableHosts} addresses in use (${usagePercent}%)`;
    container.appendChild(summary);
    
    return container;
}

// Create leases table
function createLeasesTable(leases) {
    const container = document.createElement('div');
    container.className = 'table-responsive';
    
    if (!leases || leases.length === 0) {
        const message = document.createElement('div');
        message.className = 'alert alert-info';
        message.textContent = 'No active DHCP leases found for this subnet.';
        container.appendChild(message);
        return container;
    }
    
    console.log("Creating leases table with:", leases);
    
    // Create table
    const table = document.createElement('table');
    table.className = 'table table-hover';
    
    // Create header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>IP Address</th>
            <th>Hostname</th>
            <th>MAC Address</th>
            <th>State</th>
            <th>Lease Expires</th>
            <th>Remaining</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    // Sort leases by IP address
    const sortedLeases = [...leases].sort((a, b) => {
        const aIP = ipToInt(a.ip_address);
        const bIP = ipToInt(b.ip_address);
        return aIP - bIP;
    });
    
    sortedLeases.forEach(lease => {
        const row = document.createElement('tr');
        
        // IP Address column
        const ipCell = document.createElement('td');
        ipCell.textContent = lease.ip_address || 'N/A';
        row.appendChild(ipCell);
        
        // Hostname column
        const hostnameCell = document.createElement('td');
        hostnameCell.textContent = lease.hostname || '';
        row.appendChild(hostnameCell);
        
        // MAC Address column
        const macCell = document.createElement('td');
        macCell.textContent = lease.mac_address || '';
        row.appendChild(macCell);
        
        // State column with badge
        const stateCell = document.createElement('td');
        const stateBadge = document.createElement('span');
        stateBadge.className = `badge ${lease.state === 'active' ? 'bg-success' : 'bg-secondary'}`;
        stateBadge.textContent = lease.state || 'unknown';
        stateCell.appendChild(stateBadge);
        row.appendChild(stateCell);
        
        // Lease Expires column
        const expiresCell = document.createElement('td');
        expiresCell.textContent = lease.lease_end || 'N/A';
        row.appendChild(expiresCell);
        
        // Remaining column
        const remainingCell = document.createElement('td');
        remainingCell.textContent = lease.remaining || 'N/A';
        row.appendChild(remainingCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
    
    return container;
}

// Initialize DNS Service
function initDnsService(forceRefresh = false) {
    console.log("Initializing DNS Service...");
    const dnsStatusElement = document.getElementById('dns-status');
    
    if (!dnsStatusElement) {
        console.error("DNS status element not found");
        return;
    }
    
    loadConfigData('', forceRefresh).then(result => {
        // For debugging purposes
        console.log("Full config data for DNS:", result);
        
        // Log the DNS service configuration specifically
        if (result.data && result.data.service && result.data.service.dns) {
            configLogger.logConfiguration({dns: result.data.service.dns}, 'DNS_SERVICE');
        }
        
        // Check if DNS service data exists
        const dnsService = result.data.service && result.data.service.dns;
        
        if (!dnsService || Object.keys(dnsService).length === 0) {
            dnsStatusElement.innerHTML = `
                <div class="p-4">
                    <div class="alert alert-warning mb-0">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        DNS service is not configured
                    </div>
                </div>
            `;
            return;
        }
        
        // Render DNS configuration
        let html = `
            <div class="network-list">
                <div class="network-item">
                    <div class="network-item-header">
                        <h6>
                            <i class="fas fa-globe"></i> DNS Service Configuration
                        </h6>
                        <span class="badge bg-success">Active</span>
                    </div>
                    <div class="network-item-body">
        `;
        
        // Add nameservers if available
        if (dnsService.nameserver) {
            html += `
                <div class="mb-3">
                    <h6 class="mb-2">Nameservers</h6>
                    <div class="row">
            `;
            
            const nameservers = Array.isArray(dnsService.nameserver) 
                ? dnsService.nameserver 
                : [dnsService.nameserver];
                
            nameservers.forEach(ns => {
                html += `
                    <div class="col-md-4 mb-2">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-server me-2 text-primary"></i>
                            <span class="subnet-badge">${ns}</span>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Add forwarding configuration if available
        if (dnsService.forwarding) {
            html += `
                <div class="mb-3">
                    <h6 class="mb-2">Forwarding</h6>
                    <div class="d-flex align-items-center mb-2">
                        <span class="me-2">Status:</span>
                        <span class="badge bg-success">Enabled</span>
                    </div>
            `;
            
            if (dnsService.forwarding.cache_size) {
                html += `
                    <div class="d-flex align-items-center mb-2">
                        <span class="me-2">Cache Size:</span>
                        <span class="subnet-badge">${dnsService.forwarding.cache_size}</span>
                    </div>
                `;
            }
            
            if (dnsService.forwarding["allow-from"]) {
                html += `
                    <div class="d-flex align-items-center mb-2">
                        <span class="me-2">Allow From:</span>
                        <span class="subnet-badge">${dnsService.forwarding["allow-from"]}</span>
                    </div>
                `;
            }
            
            if (dnsService.forwarding.listen_address || dnsService.forwarding["listen-address"]) {
                const listenAddressKey = dnsService.forwarding.listen_address ? 'listen_address' : 'listen-address';
                
                html += `
                    <div class="mb-2">
                        <div class="mb-1">Listen Addresses:</div>
                        <div class="row">
                `;
                
                const listenAddresses = Array.isArray(dnsService.forwarding[listenAddressKey]) 
                    ? dnsService.forwarding[listenAddressKey] 
                    : [dnsService.forwarding[listenAddressKey]];
                    
                listenAddresses.forEach(addr => {
                    html += `
                        <div class="col-md-4 mb-2">
                            <span class="subnet-badge">${addr}</span>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }
            
            html += `</div>`;
        }
        
        // Close the network item divs
        html += `
                    </div>
                </div>
            </div>
        `;
        
        dnsStatusElement.innerHTML = html;
        
        // Initialize search functionality
        const dnsSearch = document.getElementById('dnsSearch');
        if (dnsSearch) {
            dnsSearch.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase();
                // Implement search logic for DNS entries
                console.log("Searching DNS entries:", searchTerm);
            });
        }
    }).catch(error => {
        console.error("Error fetching DNS configuration:", error);
        dnsStatusElement.innerHTML = `
            <div class="p-4">
                <div class="alert alert-danger mb-0">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Error loading DNS service: ${error.message}
                </div>
            </div>
        `;
    });
}

// Initialize NTP Service
function initNtpService(forceRefresh = false) {
    console.log("Initializing NTP Service...");
    const ntpConfigElement = document.getElementById('ntp-config');
    
    if (!ntpConfigElement) {
        console.error("NTP config element not found");
        return;
    }
    
    loadConfigData('', forceRefresh).then(result => {
        // For debugging purposes
        console.log("Full config data for NTP:", result);
        
        // Log the NTP service configuration specifically
        if (result.data && result.data.service && result.data.service.ntp) {
            configLogger.logConfiguration({ntp: result.data.service.ntp}, 'NTP_SERVICE');
        }
        
        // Check if NTP service data exists
        const ntpService = result.data.service && result.data.service.ntp;
        
        if (!ntpService || Object.keys(ntpService).length === 0) {
            ntpConfigElement.innerHTML = `
                <div class="p-4">
                    <div class="alert alert-warning mb-0">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        NTP service is not configured
                    </div>
                </div>
            `;
            return;
        }
        
        // Render NTP configuration
        let html = `
            <div class="network-item">
                <div class="network-item-header">
                    <h6>
                        <i class="far fa-clock"></i> NTP Service Configuration
                    </h6>
                    <span class="badge bg-success">Active</span>
                </div>
                <div class="network-item-body">
        `;
        
        // Add NTP servers if available
        if (ntpService.server) {
            html += `
                <div class="mb-3">
                    <h6 class="mb-2">NTP Servers</h6>
                    <div class="row">
            `;
            
            const servers = Array.isArray(ntpService.server) 
                ? ntpService.server 
                : Object.keys(ntpService.server);
                
            servers.forEach(server => {
                html += `
                    <div class="col-md-4 mb-2">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-server me-2 text-primary"></i>
                            <span class="subnet-badge">${server}</span>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Add allow client configurations if available
        if (ntpService["allow-client"] && ntpService["allow-client"].address) {
            html += `
                <div class="mb-3">
                    <h6 class="mb-2">Allow Clients</h6>
                    <div class="row">
            `;
            
            const allowAddresses = Array.isArray(ntpService["allow-client"].address) 
                ? ntpService["allow-client"].address 
                : [ntpService["allow-client"].address];
                
            allowAddresses.forEach(addr => {
                html += `
                    <div class="col-md-4 mb-2">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-network-wired me-2 text-success"></i>
                            <span class="subnet-badge">${addr}</span>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Add listen addresses if available
        if (ntpService.listen_address || ntpService["listen-address"]) {
            const listenAddressKey = ntpService.listen_address ? 'listen_address' : 'listen-address';
            
            html += `
                <div class="mb-3">
                    <h6 class="mb-2">Listen Addresses</h6>
                    <div class="row">
            `;
            
            const listenAddresses = Array.isArray(ntpService[listenAddressKey]) 
                ? ntpService[listenAddressKey] 
                : [ntpService[listenAddressKey]];
                
            listenAddresses.forEach(addr => {
                html += `
                    <div class="col-md-4 mb-2">
                        <span class="subnet-badge">${addr}</span>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Close the network item divs
        html += `
                </div>
            </div>
        `;
        
        ntpConfigElement.innerHTML = html;
    }).catch(error => {
        console.error("Error fetching NTP configuration:", error);
        ntpConfigElement.innerHTML = `
            <div class="p-4">
                <div class="alert alert-danger mb-0">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Error loading NTP service: ${error.message}
                </div>
            </div>
        `;
    });
}

// Initialize the SSH Service tab
function initSshService(forceRefresh = false) {
    // Get the SSH config element
    const sshConfigElement = document.getElementById('ssh-config');
    if (!sshConfigElement) {
        console.error("SSH config element not found");
        return;
    }
    
    // Set loading state
    sshConfigElement.innerHTML = '<div class="d-flex justify-content-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    
    // Fetch complete configuration data to get SSH service info
    loadConfigData('', forceRefresh).then(result => {
        // Extract SSH service data from the full configuration
        const data = result.data || {};
        const sshService = data.service && data.service.ssh ? data.service.ssh : {};
        
        // Debug output to console
        console.log("SSH Service Configuration:", JSON.stringify(sshService));
        
        // Default port 
        const port = sshService.port || 22;
        
        // Build the HTML for SSH configuration
        let html = `
            <div class="network-item mb-3 p-3">
                <div class="row">
                    <div class="col-12 mb-3">
                        <div class="d-flex flex-column">
                            <span class="text-muted mb-1 text-muted-light">Port</span>
                            <span class="subnet-badge">${port}</span>
                        </div>
                    </div>
                    
                    <div class="col-12 mb-3">
                        <div class="d-flex flex-column">
                            <span class="text-muted mb-1 text-muted-light">Authentication Methods</span>
                            <div class="d-flex flex-wrap gap-2 mt-1">
        `;
        
        // Password authentication - if disable-password-authentication exists, it's disabled
        const passwordAuthDisabled = sshService.hasOwnProperty("disable-password-authentication");
        console.log("Password auth disabled:", passwordAuthDisabled);
        
        html += `
            <div class="d-flex align-items-center">
                <span class="me-2 text-white">Password:</span>
                <span class="badge ${!passwordAuthDisabled ? 'bg-success' : 'bg-danger'}">
                    ${!passwordAuthDisabled ? 'Enabled' : 'Disabled'}
                </span>
            </div>
        `;
        
        // Public key authentication - if disable-pubkey-authentication exists, it's disabled
        const pubkeyAuthDisabled = sshService.hasOwnProperty("disable-pubkey-authentication");
        console.log("Pubkey auth disabled:", pubkeyAuthDisabled);
        
        html += `
            <div class="d-flex align-items-center">
                <span class="me-2 text-white">Public Key:</span>
                <span class="badge ${!pubkeyAuthDisabled ? 'bg-success' : 'bg-danger'}">
                    ${!pubkeyAuthDisabled ? 'Enabled' : 'Disabled'}
                </span>
            </div>
        `;
        
        // Close the authentication methods section
        html += `
                    </div>
                </div>
            </div>
        `;
        
        // Add any other SSH config options
        if (sshService.listen_address || sshService["listen-address"]) {
            const listenAddressKey = sshService.listen_address ? 'listen_address' : 'listen-address';
            const listenAddresses = Array.isArray(sshService[listenAddressKey]) 
                ? sshService[listenAddressKey] 
                : [sshService[listenAddressKey]];
                
            html += `
                <div class="col-12 mb-3">
                    <div class="d-flex flex-column">
                        <span class="text-muted mb-1 text-muted-light">Listen Addresses</span>
                        <div class="d-flex flex-wrap gap-2 mt-1">
            `;
            
            listenAddresses.forEach(addr => {
                html += `<span class="subnet-badge">${addr}</span>`;
            });
            
            html += `
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Close the row and network item divs
        html += `
                    </div>
                </div>
            </div>
        `;
        
        sshConfigElement.innerHTML = html;
    }).catch(error => {
        console.error("Error fetching SSH configuration:", error);
        sshConfigElement.innerHTML = `
            <div class="p-4">
                <div class="alert alert-danger mb-0">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Error loading SSH service: ${error.message}
                </div>
            </div>
        `;
    });
}

// Function to refresh the DHCP service data
async function refreshDhcpService() {
    // Get DHCP status and config elements
    const dhcpStatus = document.getElementById('dhcp-status');
    const dhcpConfig = document.getElementById('dhcp-config');
    
    if (!dhcpStatus || !dhcpConfig) return;
    
    // Show loading status
    dhcpStatus.style.display = 'block';
    dhcpConfig.style.display = 'none';
    
    try {
        // Force refresh data from API
        const result = await loadConfigData('', true);
        
        if (result.success) {
            // Update DHCP service with fresh data
            initDhcpService(result.data);
            console.log("DHCP service data refreshed successfully");
        } else {
            throw new Error(result.error || 'Failed to refresh DHCP data');
        }
    } catch (error) {
        console.error("Error refreshing DHCP service:", error);
        dhcpStatus.innerHTML = `
            <div class="alert alert-danger mb-0">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Failed to refresh DHCP data: ${error.message}
            </div>
        `;
    }
}

// Initialize the System tab with system information, user accounts and connection tracking
function initSystemTab(data) {
    // Initialize System Information
    initSystemInfo(data);
    
    // Initialize User Accounts
    initUserAccounts(data);
    
    // Initialize Connection Tracking modules
    initConnectionTracking(data);
}

// Initialize system information section
function initSystemInfo(data) {
    const systemData = data.system || {};
    
    // Update hostname
    updateElementText('system-hostname', systemData['host-name'] || 'Not configured');
    
    // Update config management information
    const commitRevisions = systemData['config-management']?.['commit-revisions'] || 'Not configured';
    updateElementText('system-config-management', `Commit Revisions: ${commitRevisions}`);
    
    // Update console speed
    let consoleSpeed = 'Not configured';
    if (systemData.console?.device?.ttyS0?.speed) {
        consoleSpeed = `${systemData.console.device.ttyS0.speed} bps`;
    }
    updateElementText('system-console-speed', consoleSpeed);
}

// Initialize user accounts section
function initUserAccounts(data) {
    const userAccountsList = document.getElementById('user-accounts-list');
    
    if (!userAccountsList) return;
    
    // Clear existing content
    userAccountsList.innerHTML = '';
    
    // Get user accounts
    const userAccounts = data.system?.login?.user || {};
    
    // If no user accounts, show a message
    if (!userAccounts || Object.keys(userAccounts).length === 0) {
        userAccountsList.innerHTML = '<div class="alert alert-warning mb-0">No user accounts configured</div>';
        return;
    }
    
    // Sort usernames alphabetically
    const sortedUsernames = Object.keys(userAccounts).sort();
    
    // Process each user
    sortedUsernames.forEach(username => {
        const user = userAccounts[username];
        
        // Create user card
        const userCard = document.createElement('div');
        userCard.className = 'user-card';
        
        // Create user header
        const userHeader = document.createElement('div');
        userHeader.className = 'user-card-header';
        userHeader.innerHTML = `
            <h5>${username}</h5>
            <span class="badge bg-success">Active</span>
        `;
        userCard.appendChild(userHeader);
        
        // Create user body
        const userBody = document.createElement('div');
        userBody.className = 'user-card-body';
        
        // Create user details
        const details = [
            { 
                label: 'Authentication', 
                value: determineAuthMethod(user.authentication) 
            },
            { 
                label: 'Full Name', 
                value: user['full-name'] || 'N/A' 
            }
        ];
        
        // Add SSH keys count if they exist
        if (user.authentication?.['public-keys']) {
            const keysCount = Object.keys(user.authentication['public-keys']).length;
            details.push({
                label: 'SSH Keys',
                value: `${keysCount} key(s)`
            });
        }
        
        // Add details to user card
        details.forEach(detail => {
            const detailElement = document.createElement('div');
            detailElement.className = 'user-detail';
            detailElement.innerHTML = `
                <div class="user-detail-label">${detail.label}</div>
                <div class="user-detail-value">${detail.value}</div>
            `;
            userBody.appendChild(detailElement);
        });
        
        // Add user body to user card
        userCard.appendChild(userBody);
        
        // Add user card to user accounts list
        userAccountsList.appendChild(userCard);
    });
}

// Helper function to determine user authentication method
function determineAuthMethod(authentication) {
    if (!authentication) return 'None';
    
    const methods = [];
    
    if (authentication['encrypted-password']) {
        methods.push('Password');
    }
    
    if (authentication['public-keys']) {
        methods.push('Public Key');
    }
    
    return methods.length > 0 ? methods.join(', ') : 'None';
}

/**
 * Initialize connection tracking modules display
 * @param {Object} data - Configuration data
 */
function initConnectionTracking(data) {
    const container = document.getElementById('connection-tracking-modules');
    const loader = document.getElementById('connection-tracking-loader');
    
    if (!container) {
        console.error('Connection tracking container not found');
        return;
    }
    
    try {
        // Define all possible protocols with their icons
        const allProtocols = {
            ftp: { name: 'ftp', icon: 'bi-file-earmark-arrow-up-fill' },
            h323: { name: 'h323', icon: 'bi-telephone-fill' },
            nfs: { name: 'nfs', icon: 'bi-folder-symlink' },
            pptp: { name: 'pptp', icon: 'bi-shield-lock-fill' },
            sip: { name: 'sip', icon: 'bi-headset' },
            sqlnet: { name: 'sqlnet', icon: 'bi-database' },
            tftp: { name: 'tftp', icon: 'bi-cloud-arrow-down-fill' },
            rtp: { name: 'rtp', icon: 'bi-broadcast' }
        };
        
        // Check for enabled protocols in system connection tracking
        const enabledProtocols = [];
        if (data && data.system && data.system['connection-tracking']) {
            const connTrack = data.system['connection-tracking'];
            
            // Check for each protocol in connection tracking
            Object.keys(allProtocols).forEach(proto => {
                if (connTrack[proto] && connTrack[proto].enable === true) {
                    enabledProtocols.push(allProtocols[proto]);
                }
            });
            
            // If no specific protocols enabled, check if modules exist in config
            if (enabledProtocols.length === 0) {
                // Alternative way: check if they exist in config paths
                Object.keys(allProtocols).forEach(proto => {
                    if (connTrack[proto] || (data.firewall && data.firewall.service && data.firewall.service[proto])) {
                        enabledProtocols.push(allProtocols[proto]);
                    }
                });
            }
        }
        
        // If still no protocols found, check for services in firewall config
        if (enabledProtocols.length === 0 && data.firewall && data.firewall.service) {
            Object.keys(data.firewall.service).forEach(proto => {
                if (allProtocols[proto]) {
                    enabledProtocols.push(allProtocols[proto]);
                }
            });
        }
        
        // Hide loader
        if (loader) {
            loader.style.display = 'none';
        }
        
        // Display protocol cards
        const template = container.querySelector('.protocol-template');
        if (!template) {
            console.error('Protocol template not found');
            return;
        }
        
        // If no protocols are found enabled, show message
        if (enabledProtocols.length === 0) {
            const noModulesElement = document.createElement('div');
            noModulesElement.className = 'text-center py-3 w-100';
            noModulesElement.innerHTML = '<p class="text-muted">No connection tracking modules enabled</p>';
            container.appendChild(noModulesElement);
            return;
        }
        
        // Create and append protocol cards
        enabledProtocols.forEach(proto => {
            const protoCard = template.cloneNode(true);
            protoCard.classList.remove('protocol-template');
            protoCard.style.display = '';
            
            const iconElement = protoCard.querySelector('.protocol-icon i');
            const nameElement = protoCard.querySelector('.protocol-name');
            
            if (iconElement) {
                iconElement.className = `bi ${proto.icon}`;
            }
            
            if (nameElement) {
                nameElement.textContent = proto.name;
            }
            
            container.appendChild(protoCard);
        });
        
    } catch (error) {
        console.error('Error initializing connection tracking modules:', error);
        if (loader) {
            loader.innerHTML = '<p class="text-danger">Error loading connection tracking modules</p>';
        }
    }
}

// Initialize Configuration Analysis tab
function initConfigAnalysis() {
    console.log("Initializing Configuration Analysis tab...");
    
    const configAnalysisElement = document.getElementById('config-analysis-content');
    
    if (!configAnalysisElement) {
        console.error("Config analysis element not found");
        return;
    }
    
    // Get logs and unknown fields from the logger
    const logs = configLogger.getLogs();
    const unknownFields = configLogger.getUnknownFieldsSummary();
    
    console.log("Configuration logs:", logs);
    console.log("Unknown fields:", unknownFields);
    
    // Create HTML content
    let html = `
        <div class="row mb-4">
            <div class="col-12">
                <div class="card dashboard-card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5>Configuration Analysis</h5>
                        <button id="clearLogsBtn" class="btn btn-sm btn-danger">
                            <i class="fas fa-trash-alt"></i> Clear Logs
                        </button>
                    </div>
                    <div class="card-body">
                        <p>This tool helps you analyze different configuration formats and identify unknown fields that might need special handling.</p>
                        
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            ${logs.length} configuration logs collected. 
                            ${Object.keys(unknownFields).length} potentially unknown fields identified.
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-7">
                <div class="card dashboard-card mb-4">
                    <div class="card-header">
                        <h5>Configuration Logs</h5>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Timestamp</th>
                                        <th>Source</th>
                                        <th>Unknown Fields</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="configLogTableBody">
    `;
    
    // Add log entries
    if (logs.length === 0) {
        html += `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <div class="text-muted">No configuration logs available yet</div>
                    <small>Navigate through the app to automatically collect configuration logs</small>
                </td>
            </tr>
        `;
    } else {
        logs.forEach(log => {
            const unknownCount = Object.values(log.unknownFields)
                .reduce((total, fields) => total + fields.length, 0);
                
            html += `
                <tr data-log-id="${log.id}">
                    <td>${log.id}</td>
                    <td>${new Date(log.timestamp).toLocaleString()}</td>
                    <td>${log.source}</td>
                    <td>
                        ${unknownCount > 0 
                            ? `<span class="badge bg-warning">${unknownCount} unknown fields</span>` 
                            : '<span class="badge bg-success">All fields known</span>'}
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary view-config-btn" data-log-id="${log.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        });
    }
    
    html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-5">
                <div class="card dashboard-card mb-4">
                    <div class="card-header">
                        <h5>Unknown Fields Summary</h5>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead>
                                    <tr>
                                        <th>Field Path</th>
                                        <th>Occurrences</th>
                                    </tr>
                                </thead>
                                <tbody id="unknownFieldsTableBody">
    `;
    
    // Add unknown fields
    const unknownFieldPaths = Object.keys(unknownFields);
    if (unknownFieldPaths.length === 0) {
        html += `
            <tr>
                <td colspan="2" class="text-center py-4">
                    <div class="text-muted">No unknown fields detected</div>
                    <small>All configuration fields are recognized</small>
                </td>
            </tr>
        `;
    } else {
        // Sort by most frequent
        unknownFieldPaths
            .sort((a, b) => unknownFields[b] - unknownFields[a])
            .forEach(path => {
                html += `
                    <tr>
                        <td><code>${path || '(root)'}</code></td>
                        <td>${unknownFields[path]}</td>
                    </tr>
                `;
            });
    }
    
    html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class="card dashboard-card">
                    <div class="card-header">
                        <h5>Add Known Fields</h5>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label for="knownFieldPath" class="form-label">Field Path</label>
                            <input type="text" class="form-control" id="knownFieldPath" 
                                placeholder="e.g., dhcp.server.subnet">
                        </div>
                        <button id="addKnownFieldBtn" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Add as Known Field
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Modal for viewing configuration -->
        <div class="modal fade" id="configViewModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Configuration Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <ul class="nav nav-tabs mb-3" id="configViewTabs">
                            <li class="nav-item">
                                <a class="nav-link active" id="json-tab" data-bs-toggle="tab" href="#json-view">JSON View</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="unknown-tab" data-bs-toggle="tab" href="#unknown-view">Unknown Fields</a>
                            </li>
                        </ul>
                        <div class="tab-content" id="configViewTabContent">
                            <div class="tab-pane fade show active" id="json-view">
                                <pre id="configJsonView" class="language-json"></pre>
                            </div>
                            <div class="tab-pane fade" id="unknown-view">
                                <div id="configUnknownView"></div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mb-4">
            <div class="col-12">
                <div class="card dashboard-card">
                    <div class="card-header">
                        <h5>Configuration Fields Manager</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Export/Import Known Fields</h6>
                                <div class="d-flex gap-2 mb-3">
                                    <button id="exportFieldsBtn" class="btn btn-primary">
                                        <i class="fas fa-download"></i> Export Known Fields
                                    </button>
                                    <button id="importFieldsBtn" class="btn btn-secondary">
                                        <i class="fas fa-upload"></i> Import Known Fields
                                    </button>
                                </div>
                                <input type="file" id="importFieldsInput" style="display: none;" accept=".json">
                            </div>
                            <div class="col-md-6">
                                <h6>Batch Add Known Fields</h6>
                                <div class="mb-3">
                                    <textarea id="batchKnownFields" class="form-control" rows="3" 
                                        placeholder="Enter one field path per line, e.g.&#10;service.dhcp.server.subnet.netbios-name-server&#10;service.dns.forwarding.options"></textarea>
                                </div>
                                <button id="batchAddKnownFieldsBtn" class="btn btn-primary">
                                    <i class="fas fa-plus"></i> Add All Fields
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mb-4">
            <div class="col-12">
                <div class="card dashboard-card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5>Current Known Fields</h5>
                        <span class="badge bg-primary" id="knownFieldsCount">0 Fields</span>
                    </div>
                    <div class="card-body">
                        <div class="known-fields-tree" id="knownFieldsTree">
                            <!-- Tree will be rendered here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Set HTML content
    configAnalysisElement.innerHTML = html;
    
    // Add event listeners
    
    // View configuration button
    document.querySelectorAll('.view-config-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const logId = parseInt(this.getAttribute('data-log-id'));
            const logEntry = logs.find(log => log.id === logId);
            
            if (logEntry) {
                // Show the modal
                const configModal = new bootstrap.Modal(document.getElementById('configViewModal'));
                
                // Set JSON view
                document.getElementById('configJsonView').textContent = 
                    JSON.stringify(logEntry.config, null, 2);
                
                // Set unknown fields view
                let unknownFieldsHtml = '';
                
                if (Object.keys(logEntry.unknownFields).length === 0) {
                    unknownFieldsHtml = `
                        <div class="alert alert-success">
                            <i class="fas fa-check-circle me-2"></i>
                            No unknown fields detected in this configuration.
                        </div>
                    `;
                } else {
                    unknownFieldsHtml = `
                        <div class="alert alert-warning mb-3">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            This configuration contains potentially unknown fields.
                        </div>
                        
                        <table class="table table-bordered">
                            <thead>
                                <tr>
                                    <th>Path</th>
                                    <th>Unknown Fields</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    
                    for (const [path, fields] of Object.entries(logEntry.unknownFields)) {
                        unknownFieldsHtml += `
                            <tr>
                                <td><code>${path || '(root)'}</code></td>
                                <td>
                                    ${fields.map(field => `<span class="badge bg-info me-1">${field}</span>`).join('')}
                                </td>
                            </tr>
                        `;
                    }
                    
                    unknownFieldsHtml += `
                            </tbody>
                        </table>
                    `;
                }
                
                document.getElementById('configUnknownView').innerHTML = unknownFieldsHtml;
                
                // Show the modal
                configModal.show();
            }
        });
    });
    
    // Clear logs button
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', function() {
            // Confirm before clearing
            if (confirm('Are you sure you want to clear all configuration logs?')) {
                // Clear logs
                configLogger.configLogs = [];
                configLogger.unknownFields = {};
                configLogger.saveLogsToStorage();
                
                // Refresh the tab
                initConfigAnalysis();
            }
        });
    }
    
    // Add known field button
    const addKnownFieldBtn = document.getElementById('addKnownFieldBtn');
    if (addKnownFieldBtn) {
        addKnownFieldBtn.addEventListener('click', function() {
            const fieldPath = document.getElementById('knownFieldPath').value.trim();
            
            if (!fieldPath) {
                alert('Please enter a valid field path');
                return;
            }
            
            // Add the field to known fields
            const parts = fieldPath.split('.');
            let current = configLogger.knownFields;
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                
                if (i === parts.length - 1) {
                    current[part] = true;
                } else {
                    if (!current[part]) {
                        current[part] = {};
                    }
                    current = current[part];
                }
            }
            
            // Re-analyze logs with the new known field
            configLogger.configLogs.forEach(log => {
                log.unknownFields = {};
                configLogger.findUnknownFields(log.config, log.unknownFields, '');
            });
            
            // Reset unknown fields and reanalyze
            configLogger.unknownFields = {};
            configLogger.configLogs.forEach(log => {
                configLogger.findUnknownFields(log.config, log.unknownFields, '');
            });
            
            // Save to storage
            configLogger.saveLogsToStorage();
            
            // Clear the input
            document.getElementById('knownFieldPath').value = '';
            
            // Refresh the tab
            initConfigAnalysis();
            
            // Show success message
            alert(`Field "${fieldPath}" has been added to known fields.`);
        });
    }
    
    // Export known fields button
    const exportFieldsBtn = document.getElementById('exportFieldsBtn');
    if (exportFieldsBtn) {
        exportFieldsBtn.addEventListener('click', function() {
            const fieldsData = JSON.stringify(configLogger.knownFields, null, 2);
            const blob = new Blob([fieldsData], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'known_fields.json';
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);
        });
    }
    
    // Import known fields button
    const importFieldsBtn = document.getElementById('importFieldsBtn');
    const importFieldsInput = document.getElementById('importFieldsInput');
    if (importFieldsBtn && importFieldsInput) {
        importFieldsBtn.addEventListener('click', function() {
            importFieldsInput.click();
        });
        
        importFieldsInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const fieldsData = JSON.parse(e.target.result);
                    
                    // Confirm import
                    if (confirm('This will replace your current known fields list. Continue?')) {
                        configLogger.knownFields = fieldsData;
                        
                        // Re-analyze logs with the new known fields
                        configLogger.configLogs.forEach(log => {
                            log.unknownFields = {};
                            configLogger.findUnknownFields(log.config, log.unknownFields, '');
                        });
                        
                        // Reset unknown fields and reanalyze
                        configLogger.unknownFields = {};
                        configLogger.configLogs.forEach(log => {
                            configLogger.findUnknownFields(log.config, log.unknownFields, '');
                        });
                        
                        // Save to storage
                        configLogger.saveLogsToStorage();
                        
                        // Refresh the tab
                        initConfigAnalysis();
                        
                        // Show success message
                        alert('Known fields imported successfully.');
                    }
                } catch (error) {
                    console.error('Error parsing JSON file:', error);
                    alert('Error importing fields: ' + error.message);
                }
            };
            reader.readAsText(file);
        });
    }
    
    // Batch add known fields button
    const batchAddKnownFieldsBtn = document.getElementById('batchAddKnownFieldsBtn');
    if (batchAddKnownFieldsBtn) {
        batchAddKnownFieldsBtn.addEventListener('click', function() {
            const fieldsList = document.getElementById('batchKnownFields').value.trim();
            
            if (!fieldsList) {
                alert('Please enter at least one field path');
                return;
            }
            
            // Split by lines
            const fields = fieldsList.split('\n').map(f => f.trim()).filter(f => f);
            
            if (fields.length === 0) {
                alert('Please enter at least one valid field path');
                return;
            }
            
            // Add each field to known fields
            let addedCount = 0;
            fields.forEach(fieldPath => {
                if (!fieldPath) return;
                
                const parts = fieldPath.split('.');
                let current = configLogger.knownFields;
                
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    
                    if (i === parts.length - 1) {
                        current[part] = true;
                    } else {
                        if (!current[part]) {
                            current[part] = {};
                        }
                        current = current[part];
                    }
                }
                addedCount++;
            });
            
            // Re-analyze logs with the new known fields
            configLogger.configLogs.forEach(log => {
                log.unknownFields = {};
                configLogger.findUnknownFields(log.config, log.unknownFields, '');
            });
            
            // Reset unknown fields and reanalyze
            configLogger.unknownFields = {};
            configLogger.configLogs.forEach(log => {
                configLogger.findUnknownFields(log.config, log.unknownFields, '');
            });
            
            // Save to storage
            configLogger.saveLogsToStorage();
            
            // Clear the input
            document.getElementById('batchKnownFields').value = '';
            
            // Refresh the tab
            initConfigAnalysis();
            
            // Show success message
            alert(`Added ${addedCount} fields to known fields list.`);
        });
    }
    
    // Render the known fields tree
    renderKnownFieldsTree();
}

// Helper function to render the known fields tree
function renderKnownFieldsTree() {
    const knownFieldsContainer = document.getElementById('knownFieldsContainer');
    const fieldsMappingData = configLogger.getKnownFields();
    
    if (!knownFieldsContainer || !fieldsMappingData) {
        console.error("Container or field mapping data not found");
        return;
    }
    
    // Count total fields
    function countFields(obj, path = '') {
        let count = 0;
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                count += countFields(obj[key], path ? `${path}.${key}` : key);
            } else {
                count += 1;
            }
        }
        return count;
    }
    
    const totalFields = countFields(fieldsMappingData);
    
    // Generate HTML for the tree
    function renderTree(obj, path = '', level = 0) {
        let result = '';
        
        if (level === 0) {
            result += `<h5 class="mb-3">Known Configuration Fields (${totalFields} total)</h5>`;
            result += `
                <div class="mb-3">
                    <button id="expandAllFields" class="btn btn-sm btn-outline-primary me-2">Expand All</button>
                    <button id="collapseAllFields" class="btn btn-sm btn-outline-secondary">Collapse All</button>
                    <button id="exportFieldsBtn" class="btn btn-sm btn-outline-success ms-2">Export</button>
                    <button id="importFieldsBtn" class="btn btn-sm btn-outline-info ms-2">Import</button>
                </div>
            `;
        }
        
        result += `<ul class="known-fields-list ${level === 0 ? 'root-list pl-0' : 'pl-20'}">`;
        
        for (const key in obj) {
            const currentPath = path ? `${path}.${key}` : key;
            const isObject = typeof obj[key] === 'object' && obj[key] !== null;
            
            result += `
                <li class="known-field-item">
                    <div class="d-flex align-items-center">
                        ${isObject ? '<i class="fa fa-caret-right config-toggle me-2"></i>' : '<span class="me-3"></span>'}
                        <span class="config-key">${key}</span>
                        ${!isObject ? `<span class="ms-2 text-muted">(${obj[key]})</span>` : ''}
                    </div>
            `;
            
            if (isObject) {
                result += `<div class="config-children d-none">`;
                result += renderTree(obj[key], currentPath, level + 1);
                result += `</div>`;
            }
            
            result += '</li>';
        }
        
        result += '</ul>';
        return result;
    }
    
    knownFieldsContainer.innerHTML = renderTree(fieldsMappingData);
    
    // Add toggle functionality
    document.querySelectorAll('#knownFieldsContainer .config-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const childrenDiv = this.closest('li').querySelector('.config-children');
            if (childrenDiv) {
                const isExpanded = childrenDiv.classList.contains('d-block');
                if (isExpanded) {
                    childrenDiv.classList.remove('d-block');
                    childrenDiv.classList.add('d-none');
                    this.classList.remove('fa-caret-down');
                    this.classList.add('fa-caret-right');
                } else {
                    childrenDiv.classList.remove('d-none');
                    childrenDiv.classList.add('d-block');
                    this.classList.remove('fa-caret-right');
                    this.classList.add('fa-caret-down');
                }
            }
        });
    });
    
    // Add expand/collapse all functionality
    document.getElementById('expandAllFields')?.addEventListener('click', () => {
        document.querySelectorAll('#knownFieldsContainer .config-children').forEach(child => {
            child.classList.remove('d-none');
            child.classList.add('d-block');
        });
        document.querySelectorAll('#knownFieldsContainer .config-toggle').forEach(toggle => {
            toggle.classList.remove('fa-caret-right');
            toggle.classList.add('fa-caret-down');
        });
    });
    
    document.getElementById('collapseAllFields')?.addEventListener('click', () => {
        document.querySelectorAll('#knownFieldsContainer .config-children').forEach(child => {
            child.classList.remove('d-block');
            child.classList.add('d-none');
        });
        document.querySelectorAll('#knownFieldsContainer .config-toggle').forEach(toggle => {
            toggle.classList.remove('fa-caret-down');
            toggle.classList.add('fa-caret-right');
        });
    });
    
    // Handle import/export functionality
    document.getElementById('exportFieldsBtn')?.addEventListener('click', () => {
        const fieldsJson = JSON.stringify(fieldsMappingData, null, 2);
        const blob = new Blob([fieldsJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'known_config_fields.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    // Create hidden file input for import
    let importInput = document.getElementById('importFieldsInput');
    if (!importInput) {
        importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.id = 'importFieldsInput';
        importInput.classList.add('d-none');
        importInput.accept = '.json';
        document.body.appendChild(importInput);
        
        importInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importedFields = JSON.parse(e.target.result);
                        configLogger.mergeKnownFields(importedFields);
                        renderKnownFieldsTree(); // Re-render the tree
                        alert('Fields imported successfully!');
                    } catch (error) {
                        console.error('Error importing fields:', error);
                        alert('Error importing fields: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        });
    }
    
    document.getElementById('importFieldsBtn')?.addEventListener('click', () => {
        importInput.click();
    });
}

// Count all network interfaces in the configuration
function countAllInterfaces(data) {
    let count = 0;
    if (data.interfaces) {
        // Count all interface types
        const interfaceTypes = ['ethernet', 'loopback', 'bridge', 'vlan', 'tunnel', 'wireguard', 'openvpn', 'pppoe'];
        interfaceTypes.forEach(type => {
            if (data.interfaces[type]) {
                count += Object.keys(data.interfaces[type]).length;
            }
        });
    }
    return count || '0';
}

// Helper function to get interfaces from config
function getInterfaces(data) {
    if (!data.interfaces) return {};
    
    const interfaces = {};
    
    // Process all interface types
    const interfaceTypes = ['ethernet', 'loopback', 'bridge', 'vlan', 'tunnel', 'wireguard', 'openvpn', 'pppoe'];
    
    interfaceTypes.forEach(type => {
        if (data.interfaces[type]) {
            Object.keys(data.interfaces[type]).forEach(name => {
                const iface = data.interfaces[type][name];
                interfaces[name] = {
                    name: name,
                    type: type,
                    address: iface.address || 'No IP',
                    description: iface.description || '',
                    'hw-id': iface['hw-id'] || '',
                    mtu: iface.mtu || ''
                };
            });
        }
    });
    
    return interfaces;
}

// Find WAN interface based on firewall groups or description
function getWanInterface(interfaces, data) {
    // First check if there's a firewall interface group for WAN
    if (data.firewall?.group?.['interface-group']?.WAN?.interface) {
        const wanIfName = data.firewall.group['interface-group'].WAN.interface;
        if (interfaces[wanIfName]) {
            return interfaces[wanIfName];
        }
    }
    
    // Then look for typical WAN patterns
    for (const name in interfaces) {
        const iface = interfaces[name];
        
        // Check for WAN in description
        if (iface.description && /\b(wan|internet|external|uplink|mgmt)\b/i.test(iface.description)) {
            return iface;
        }
        
        // Check common WAN interface names
        if (/^(eth0|wan|pppoe|internet)/i.test(name)) {
            return iface;
        }
        
        // Check for non-private IP
        if (iface.address && !isPrivateIP(iface.address)) {
            return iface;
        }
    }
    
    // Fallback - return first interface
    const names = Object.keys(interfaces);
    return names.length > 0 ? interfaces[names[0]] : null;
}

// Find LAN interface based on firewall groups or description
function getLanInterface(interfaces, data) {
    // First check if there's a firewall interface group for LAN
    if (data.firewall?.group?.['interface-group']?.LAN?.interface) {
        const lanIfName = data.firewall.group['interface-group'].LAN.interface;
        if (interfaces[lanIfName]) {
            return interfaces[lanIfName];
        }
    }
    
    // Then look for typical LAN patterns
    for (const name in interfaces) {
        const iface = interfaces[name];
        
        // Check for LAN in description
        if (iface.description && /\b(lan|internal|local)\b/i.test(iface.description)) {
            return iface;
        }
        
        // Check common LAN interface names
        if (/^(eth1|lan|internal|local)/i.test(name)) {
            return iface;
        }
        
        // Check for private IP that's not loopback
        if (iface.type !== 'loopback' && iface.address && isPrivateIP(iface.address)) {
            return iface;
        }
    }
    
    // Fallback - return second interface or null
    const names = Object.keys(interfaces);
    return names.length > 1 ? interfaces[names[1]] : null;
}

// Check if an IP address is private
function isPrivateIP(ip) {
    if (!ip) return false;
    
    // Extract IP address without CIDR notation
    const addr = ip.split('/')[0];
    
    // Check RFC1918 private IP ranges
    return /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(addr);
}

// Get default gateway from static routes
function getDefaultGateway(data) {
    if (data.protocols?.static?.route?.['0.0.0.0/0']?.['next-hop']) {
        const nextHops = Object.keys(data.protocols.static.route['0.0.0.0/0']['next-hop']);
        if (nextHops.length > 0) {
            return nextHops[0];
        }
    }
    return null;
}

// Count firewall rules
function countFirewallRules(data) {
    let count = 0;
    
    // Count rules in named firewall rule sets
    if (data.firewall?.name) {
        Object.keys(data.firewall.name).forEach(groupName => {
            const group = data.firewall.name[groupName];
            if (group.rule) {
                count += Object.keys(group.rule).length;
            }
        });
    }
    
    // Count rules in ipv4 input filter
    if (data.firewall?.ipv4?.input?.filter?.rule) {
        count += Object.keys(data.firewall.ipv4.input.filter.rule).length;
    }
    
    // Count rules in ipv4 forward filter
    if (data.firewall?.ipv4?.forward?.filter?.rule) {
        count += Object.keys(data.firewall.ipv4.forward.filter.rule).length;
    }
    
    return count || '0';
}

// Count NAT rules
function countNatRules(data) {
    let count = 0;
    
    if (data.nat) {
        // Count source NAT rules
        if (data.nat.source?.rule) {
            count += Object.keys(data.nat.source.rule).length;
        }
        
        // Count destination NAT rules
        if (data.nat.destination?.rule) {
            count += Object.keys(data.nat.destination.rule).length;
        }
    }
    
    return count || '0';
}

// Count active services
function countServices(data) {
    let count = 0;
    
    if (data.service) {
        // Check common services
        const commonServices = [
            'dhcp', 'dhcp-server', 'dns', 'ssh', 'https', 'ntp',
            'snmp', 'lldp', 'dhcp-relay', 'dns-dynamic', 'ids', 
            'mdns', 'router-advert', 'upnp', 'webproxy'
        ];
        
        commonServices.forEach(service => {
            // Handle hyphen vs underscore in service names
            const serviceName = service.replace(/-/g, '_');
            
            // Check both formats (with hyphens and with underscores)
            if (data.service[serviceName] || data.service[service]) {
                // For DHCP, do a special check to ensure it has configuration
                if (service === 'dhcp' || service === 'dhcp-server' || serviceName === 'dhcp_server') {
                    const dhcpConfig = data.service[serviceName] || data.service[service];
                    // Only count if it has server config or listen addresses
                    if (dhcpConfig.server || dhcpConfig['listen-address'] || dhcpConfig.listen_address) {
                        count++;
                    }
                } else {
                    count++;
                }
            }
        });
    }
    
    return count || '0';
}

/**
 * Create logging toggle UI in footer
 */
function createLoggingToggle() {
    const loggingControls = document.getElementById('logging-controls');
    if (!loggingControls) return;
    
    const toggleContainer = document.createElement('div');
    toggleContainer.className = `logging-toggle-container ${configLogger.loggingEnabled ? 'enabled' : ''}`;
    toggleContainer.innerHTML = `
        <i class="bi bi-database-fill"></i>
        <label class="toggle-label" for="config-logging-toggle">
            Configuration Logging
            <input type="checkbox" id="config-logging-toggle" 
                ${configLogger.loggingEnabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
        </label>
        <span id="log-file-status" class="log-file-status"></span>
    `;
    
    loggingControls.appendChild(toggleContainer);
    
    // Add log action buttons container
    const logActionsContainer = document.createElement('div');
    logActionsContainer.className = 'log-actions-container';
    loggingControls.appendChild(logActionsContainer);
    
    // Add download button for full logs
    const viewLogsBtn = document.createElement('button');
    viewLogsBtn.className = 'btn btn-sm btn-outline-secondary';
    viewLogsBtn.innerHTML = '<i class="bi bi-download"></i> Full Log';
    viewLogsBtn.addEventListener('click', downloadCurrentLogs);
    logActionsContainer.appendChild(viewLogsBtn);
    
    // Add zip download button
    const zipLogsBtn = document.createElement('button');
    zipLogsBtn.className = 'btn btn-sm btn-outline-primary';
    zipLogsBtn.innerHTML = '<i class="bi bi-file-earmark-zip"></i> Download ZIP';
    zipLogsBtn.title = 'Download all log files as a single ZIP archive';
    zipLogsBtn.addEventListener('click', downloadZippedLogFiles);
    logActionsContainer.appendChild(zipLogsBtn);
    
    // Add event listener to toggle
    const toggle = document.getElementById('config-logging-toggle');
    if (toggle) {
        toggle.addEventListener('change', function() {
            const enabled = this.checked;
            configLogger.toggleLogging(enabled);
            toggleContainer.classList.toggle('enabled', enabled);
            
            // Save setting to localStorage
            localStorage.setItem('configLoggingEnabled', enabled);
        });
    }
}

/**
 * Download the current logs file
 */
function downloadCurrentLogs() {
    try {
        // Get existing logs from localStorage
        const savedLogs = localStorage.getItem('vyosConfigLogFile');
        
        if (!savedLogs) {
            // Show message if no logs found
            const statusEl = document.getElementById('log-file-status');
            if (statusEl) {
                statusEl.textContent = 'No log data found';
                statusEl.classList.add('show');
                
                setTimeout(() => statusEl.classList.remove('show'), 3000);
            }
            return;
        }
        
        // Parse the logs
        const allLogs = JSON.parse(savedLogs);
        
        // Create downloadable JSON file
        const logBlob = new Blob(
            [JSON.stringify(allLogs, null, 2)], 
            { type: 'application/json' }
        );
        
        // Create and trigger download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(logBlob);
        link.download = `vyos_config_log_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
            URL.revokeObjectURL(link.href);
            document.body.removeChild(link);
        }, 100);
        
        // Show notification
        const statusEl = document.getElementById('log-file-status');
        if (statusEl) {
            statusEl.textContent = `Downloaded log file with ${allLogs.length} entries`;
            statusEl.classList.add('show');
            setTimeout(() => statusEl.classList.remove('show'), 3000);
        }
        
    } catch (error) {
        console.error('Error downloading logs:', error);
        // Show error message
        const statusEl = document.getElementById('log-file-status');
        if (statusEl) {
            statusEl.textContent = 'Error downloading logs';
            statusEl.classList.add('show');
            setTimeout(() => statusEl.classList.remove('show'), 3000);
        }
    }
}

/**
 * Split and download log files by categories
 */
function downloadSplitLogFiles() {
    try {
        // Get existing logs from localStorage
        const savedLogs = localStorage.getItem('vyosConfigLogFile');
        
        if (!savedLogs) {
            // Show message if no logs found
            const statusEl = document.getElementById('log-file-status');
            if (statusEl) {
                statusEl.textContent = 'No log data found';
                statusEl.classList.add('show');
                setTimeout(() => statusEl.classList.remove('show'), 3000);
            }
            return;
        }
        
        // Parse the logs
        const allLogs = JSON.parse(savedLogs);
        const dateStr = new Date().toISOString().slice(0,10);
        
        // Create separate files for specific categories
        const logFiles = {
            'all_logs': allLogs,
            'unknown_fields': extractUnknownFields(allLogs),
            'unknown_fields_summary': summarizeUnknownFields(allLogs),
            'chronological': sortLogsByTimestamp(allLogs),
            'by_source': groupLogsBySource(allLogs),
            'missing_fields': findMissingFields(allLogs),
            'service_config_issues': extractServiceIssues(allLogs)
        };
        
        // Download each file separately
        Object.entries(logFiles).forEach(([category, data]) => {
            // Skip empty data sets
            if (Array.isArray(data) && data.length === 0) {
                console.log(`Skipping empty category: ${category}`);
                return;
            }
            
            if (typeof data === 'object' && Object.keys(data).length === 0) {
                console.log(`Skipping empty category: ${category}`);
                return;
            }
            
            // Create downloadable JSON file
            const logBlob = new Blob(
                [JSON.stringify(data, null, 2)], 
                { type: 'application/json' }
            );
            
            // Create and trigger download link
            const link = document.createElement('a');
            link.href = URL.createObjectURL(logBlob);
            link.download = `vyos_${category}_${dateStr}.json`;
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            setTimeout(() => {
                URL.revokeObjectURL(link.href);
                document.body.removeChild(link);
            }, 100);
        });
        
        // Show notification
        const statusEl = document.getElementById('log-file-status');
        if (statusEl) {
            const downloadedCount = Object.values(logFiles).filter(data => {
                if (Array.isArray(data)) return data.length > 0;
                if (typeof data === 'object') return Object.keys(data).length > 0;
                return false;
            }).length;
            
            statusEl.textContent = `Downloaded ${downloadedCount} log files`;
            statusEl.classList.add('show');
            setTimeout(() => statusEl.classList.remove('show'), 3000);
        }
        
    } catch (error) {
        console.error('Error downloading split logs:', error);
        // Show error message
        const statusEl = document.getElementById('log-file-status');
        if (statusEl) {
            statusEl.textContent = 'Error splitting log files';
            statusEl.classList.add('show');
            setTimeout(() => statusEl.classList.remove('show'), 3000);
        }
    }
}

/**
 * Extract only unknown fields from logs
 */
function extractUnknownFields(logs) {
    // Create an array of just the unknown fields
    const unknownFieldsLog = logs.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        source: log.source,
        unknownFields: log.unknownFields
    }));
    
    // Filter out logs with no unknown fields
    return unknownFieldsLog.filter(log => 
        log.unknownFields && Object.keys(log.unknownFields).length > 0
    );
}

/**
 * Sort logs by timestamp, newest first
 */
function sortLogsByTimestamp(logs) {
    return [...logs].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA; // Newest first
    });
}

/**
 * Group logs by their source
 */
function groupLogsBySource(logs) {
    const sources = {};
    
    // Group logs by source
    logs.forEach(log => {
        const source = log.source || 'unknown';
        if (!sources[source]) {
            sources[source] = [];
        }
        sources[source].push(log);
    });
    
    return sources;
}

/**
 * Create a summary of all unknown fields and their frequency
 */
function summarizeUnknownFields(logs) {
    const summary = {};
    
    logs.forEach(log => {
        if (!log.unknownFields) return;
        
        Object.keys(log.unknownFields).forEach(path => {
            log.unknownFields[path].forEach(field => {
                const fullPath = path ? `${path}.${field}` : field;
                
                if (!summary[fullPath]) {
                    summary[fullPath] = {
                        count: 0,
                        sources: {},
                        examples: []
                    };
                }
                
                summary[fullPath].count++;
                
                // Track which sources encountered this field
                const source = log.source || 'unknown';
                summary[fullPath].sources[source] = (summary[fullPath].sources[source] || 0) + 1;
                
                // Save up to 3 examples of configurations with this field
                if (summary[fullPath].examples.length < 3) {
                    // Try to find the value from the config
                    const value = getValueFromPath(log.config, fullPath);
                    if (value !== undefined) {
                        summary[fullPath].examples.push({
                            timestamp: log.timestamp,
                            value: value
                        });
                    }
                }
            });
        });
    });
    
    // Sort by frequency (highest first)
    const sortedSummary = {};
    Object.keys(summary)
        .sort((a, b) => summary[b].count - summary[a].count)
        .forEach(key => {
            sortedSummary[key] = summary[key];
        });
    
    return sortedSummary;
}

/**
 * Get a value from an object by dot-notated path
 */
function getValueFromPath(obj, path) {
    if (!obj) return undefined;
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = current[part];
    }
    
    return current;
}

/**
 * Find fields that are sometimes present but missing in other configurations
 */
function findMissingFields(logs) {
    // Build a map of all fields ever seen
    const allFields = {};
    
    // First pass: collect all fields from all logs
    logs.forEach(log => {
        if (!log.config) return;
        
        // Get all paths in this config
        const paths = getAllPaths(log.config);
        paths.forEach(path => {
            if (!allFields[path]) {
                allFields[path] = {
                    present: 0,
                    absent: 0,
                    examples: []
                };
            }
            
            allFields[path].present++;
            
            // Save up to 2 examples
            if (allFields[path].examples.length < 2) {
                const value = getValueFromPath(log.config, path);
                allFields[path].examples.push({
                    timestamp: log.timestamp,
                    value: value
                });
            }
        });
    });
    
    // Second pass: check which fields are missing in each log
    logs.forEach(log => {
        if (!log.config) return;
        
        Object.keys(allFields).forEach(path => {
            const value = getValueFromPath(log.config, path);
            if (value === undefined) {
                allFields[path].absent++;
            }
        });
    });
    
    // Filter to find fields that are sometimes present, sometimes not
    const missingFields = {};
    Object.keys(allFields).forEach(path => {
        const field = allFields[path];
        if (field.present > 0 && field.absent > 0) {
            // It's a field that sometimes exists and sometimes doesn't
            missingFields[path] = {
                presentCount: field.present,
                absentCount: field.absent,
                presentPercentage: Math.round((field.present / (field.present + field.absent)) * 100),
                examples: field.examples
            };
        }
    });
    
    // Sort by presence percentage (lowest first, as these are more interesting)
    const sortedMissingFields = {};
    Object.keys(missingFields)
        .sort((a, b) => missingFields[a].presentPercentage - missingFields[b].presentPercentage)
        .forEach(key => {
            sortedMissingFields[key] = missingFields[key];
        });
    
    return sortedMissingFields;
}

/**
 * Get all possible dot-notated paths in an object
 */
function getAllPaths(obj, parentPath = '') {
    let paths = [];
    
    if (typeof obj !== 'object' || obj === null) {
        return paths;
    }
    
    Object.keys(obj).forEach(key => {
        const currentPath = parentPath ? `${parentPath}.${key}` : key;
        paths.push(currentPath);
        
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            // Add child paths
            const childPaths = getAllPaths(obj[key], currentPath);
            paths = paths.concat(childPaths);
        }
    });
    
    return paths;
}

/**
 * Extract issues specifically related to service configurations
 */
function extractServiceIssues(logs) {
    const serviceIssues = {
        ssh: { issues: [], configs: [] },
        dhcp: { issues: [], configs: [] },
        dns: { issues: [], configs: [] },
        firewall: { issues: [], configs: [] },
        nat: { issues: [], configs: [] }
    };
    
    logs.forEach(log => {
        const config = log.config;
        if (!config || !config.service) return;
        
        // SSH specific checks
        if (config.service.ssh) {
            const ssh = config.service.ssh;
            
            // Check for unusual SSH port
            if (ssh.port && ssh.port !== '22') {
                serviceIssues.ssh.issues.push({
                    timestamp: log.timestamp,
                    issue: 'Non-standard SSH port',
                    details: `Port: ${ssh.port}`
                });
            }
            
            // Always save SSH configs for reference
            serviceIssues.ssh.configs.push({
                timestamp: log.timestamp,
                config: ssh
            });
        }
        
        // DHCP specific checks
        if (config.service['dhcp-server']) {
            const dhcp = config.service['dhcp-server'];
            serviceIssues.dhcp.configs.push({
                timestamp: log.timestamp,
                config: dhcp
            });
        }
        
        // DNS specific checks
        if (config.service.dns) {
            const dns = config.service.dns;
            serviceIssues.dns.configs.push({
                timestamp: log.timestamp,
                config: dns
            });
        }
    });
    
    return serviceIssues;
}

/**
 * Split and download all log files as a single ZIP archive
 */
function downloadZippedLogFiles() {
    try {
        // Get existing logs from localStorage
        const savedLogs = localStorage.getItem('vyosConfigLogFile');
        
        if (!savedLogs) {
            // Show message if no logs found
            const statusEl = document.getElementById('log-file-status');
            if (statusEl) {
                statusEl.textContent = 'No log data found';
                statusEl.classList.add('show');
                setTimeout(() => statusEl.classList.remove('show'), 3000);
            }
            return;
        }
        
        // Parse the logs
        const allLogs = JSON.parse(savedLogs);
        const dateStr = new Date().toISOString().slice(0,10);
        
        // Show loading status
        const statusEl = document.getElementById('log-file-status');
        if (statusEl) {
            statusEl.textContent = 'Creating ZIP file...';
            statusEl.classList.add('show');
        }
        
        // Create ZIP file using JSZip
        const zip = new JSZip();
        
        // Create separate files for different categories
        const logCategories = {
            'all_logs': allLogs,
            'unknown_fields': extractUnknownFields(allLogs),
            'unknown_fields_summary': summarizeUnknownFields(allLogs),
            'chronological': sortLogsByTimestamp(allLogs),
            'by_source': groupLogsBySource(allLogs),
            'missing_fields': findMissingFields(allLogs),
            'service_config_issues': extractServiceIssues(allLogs)
        };
        
        // Add each category to the ZIP
        let addedFilesCount = 0;
        Object.entries(logCategories).forEach(([category, data]) => {
            // Skip empty data sets
            if (Array.isArray(data) && data.length === 0) {
                console.log(`Skipping empty category: ${category}`);
                return;
            }
            
            if (typeof data === 'object' && Object.keys(data).length === 0) {
                console.log(`Skipping empty category: ${category}`);
                return;
            }
            
            // Add the file to ZIP
            zip.file(`vyos_${category}_${dateStr}.json`, JSON.stringify(data, null, 2));
            addedFilesCount++;
        });
        
        // Generate ZIP file
        zip.generateAsync({type: 'blob'}).then(function(content) {
            // Create and trigger download link
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `vyos_logs_${dateStr}.zip`;
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            setTimeout(() => {
                URL.revokeObjectURL(link.href);
                document.body.removeChild(link);
            }, 100);
            
            // Show completion message
            if (statusEl) {
                statusEl.textContent = `Downloaded ZIP with ${addedFilesCount} log files`;
                setTimeout(() => statusEl.classList.remove('show'), 3000);
            }
        }).catch(function(error) {
            console.error('Error generating ZIP:', error);
            if (statusEl) {
                statusEl.textContent = 'Error creating ZIP file';
                setTimeout(() => statusEl.classList.remove('show'), 3000);
            }
        });
        
    } catch (error) {
        console.error('Error preparing log files:', error);
        // Show error message
        const statusEl = document.getElementById('log-file-status');
        if (statusEl) {
            statusEl.textContent = 'Error preparing log files';
            statusEl.classList.add('show');
            setTimeout(() => statusEl.classList.remove('show'), 3000);
        }
    }
}

// Initialize BGP service tab
function initBgpService(data, forceRefresh = false) {
    console.log('Initializing BGP service tab');
    
    const bgpConfigContainer = document.getElementById('bgp-config');
    if (!bgpConfigContainer) return;
    
    // Clear existing content
    bgpConfigContainer.innerHTML = '';
    
    // Get BGP configuration from the data
    const bgpConfig = data.protocols?.bgp || {};
    
    // If no BGP configuration is found
    if (Object.keys(bgpConfig).length === 0) {
        bgpConfigContainer.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                BGP is not configured on this router
            </div>
        `;
        return;
    }
    
    // Get important BGP parameters
    const routerId = bgpConfig.parameters?.['router-id'] || 'Not configured';
    const systemAs = bgpConfig['system-as'] || 'Not configured';
    const neighbors = bgpConfig.neighbor || {};
    const addressFamilies = bgpConfig['address-family'] || {};
    
    // Create BGP overview card
    const overviewCard = document.createElement('div');
    overviewCard.className = 'bgp-overview-card mb-4';
    overviewCard.innerHTML = `
        <h4>BGP Overview</h4>
        <div class="row">
            <div class="col-md-6">
                <div class="info-item">
                    <span class="info-label">Router ID</span>
                    <span class="info-value">${routerId}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Local AS</span>
                    <span class="info-value">${systemAs}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Neighbors</span>
                    <span class="info-value">${Object.keys(neighbors).length}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Networks</span>
                    <span class="info-value">${Object.keys(addressFamilies?.['ipv4-unicast']?.network || {}).length}</span>
                </div>
            </div>
            <div class="col-md-6">
                <div class="bgp-status-box">
                    <div class="display-6"><i class="fas fa-project-diagram me-2"></i> AS${systemAs}</div>
                    <div class="mt-2">BGP Autonomous System</div>
                </div>
            </div>
        </div>
    `;
    bgpConfigContainer.appendChild(overviewCard);
    
    // Create neighbors card
    const neighborsCard = document.createElement('div');
    neighborsCard.className = 'bgp-neighbors-card mb-4';
    
    // Neighbors header
    const neighborsHeader = document.createElement('h4');
    neighborsHeader.textContent = 'BGP Neighbors';
    neighborsCard.appendChild(neighborsHeader);
    
    // Create neighbors table
    const neighborsTable = document.createElement('div');
    neighborsTable.className = 'table-responsive';
    
    if (Object.keys(neighbors).length === 0) {
        neighborsTable.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle me-2"></i>
                No BGP neighbors configured
            </div>
        `;
    } else {
        let tableHtml = `
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Neighbor IP</th>
                        <th>Remote AS</th>
                        <th>Update Source</th>
                        <th>Multihop</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Add a row for each neighbor
        Object.entries(neighbors).forEach(([neighborIp, neighborConfig]) => {
            const remoteAs = neighborConfig['remote-as'] || 'N/A';
            const updateSource = neighborConfig['update-source'] || 'N/A';
            const multihop = neighborConfig['ebgp-multihop'] || 'N/A';
            const description = neighborConfig['description'] || 'N/A';
            
            tableHtml += `
                <tr>
                    <td>${neighborIp}</td>
                    <td>${remoteAs}</td>
                    <td>${updateSource}</td>
                    <td>${multihop}</td>
                    <td>${description}</td>
                </tr>
            `;
        });
        
        tableHtml += `
                </tbody>
            </table>
        `;
        
        neighborsTable.innerHTML = tableHtml;
    }
    
    neighborsCard.appendChild(neighborsTable);
    bgpConfigContainer.appendChild(neighborsCard);
    
    // Create networks card
    const networksCard = document.createElement('div');
    networksCard.className = 'bgp-networks-card mb-4';
    
    // Networks header
    const networksHeader = document.createElement('h4');
    networksHeader.textContent = 'Advertised Networks';
    networksCard.appendChild(networksHeader);
    
    // Get networks from address families
    const networks = addressFamilies?.['ipv4-unicast']?.network || {};
    
    if (Object.keys(networks).length === 0) {
        networksCard.innerHTML += `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle me-2"></i>
                No networks configured for advertisement
            </div>
        `;
    } else {
        const networksList = document.createElement('div');
        networksList.className = 'row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3';
        
        Object.keys(networks).forEach(network => {
            const networkCard = document.createElement('div');
            networkCard.className = 'col';
            networkCard.innerHTML = `
                <div class="card h-100" style="background-color: #383838; border: 1px solid #444;">
                    <div class="card-body">
                        <h5 class="card-title">
                            <i class="fas fa-network-wired me-2"></i>
                            ${network}
                        </h5>
                        <p class="card-text small text-muted">Advertised to peers</p>
                    </div>
                </div>
            `;
            networksList.appendChild(networkCard);
        });
        
        networksCard.appendChild(networksList);
    }
    
    bgpConfigContainer.appendChild(networksCard);
    
    // BGP Route Propagation Visualization
    const visualizationCard = document.createElement('div');
    visualizationCard.className = 'bgp-visualization-card';
    
    // Visualization header
    const visualizationHeader = document.createElement('h4');
    visualizationHeader.textContent = 'BGP Route Propagation';
    visualizationCard.appendChild(visualizationHeader);
    
    // Create a more dynamic visualization that handles multiple peers
    const visualizationContainer = document.createElement('div');
    visualizationContainer.className = 'bgp-route-propagation';
    
    // Create the peer nodes dynamically based on the number of peers
    let peerNodes = '';
    const maxPeersToShow = 3; // Show up to 3 peers directly, then show a count for others
    const neighborEntries = Object.entries(neighbors);
    const displayedPeers = neighborEntries.slice(0, maxPeersToShow);
    
    // If there are more peers than we can display, show a count
    const hasMorePeers = neighborEntries.length > maxPeersToShow;
    const additionalPeersCount = neighborEntries.length - maxPeersToShow;
    
    // Create the main visualization
    visualizationContainer.innerHTML = `
        <div class="bgp-propagation-diagram mb-3">
            <div class="row justify-content-center">
                <div class="col-md-3 mb-3">
                    <div class="bgp-node local-as">
                        <div class="node-title">Local Router</div>
                        <div class="node-value">AS ${systemAs}</div>
                        <div class="node-icon"><i class="fas fa-server"></i></div>
                    </div>
                </div>
                
                <div class="col-md-1 d-flex align-items-center justify-content-center mb-3">
                    <div class="bgp-arrow">
                        <i class="fas fa-arrow-right"></i>
                    </div>
                </div>
                
                <div class="col-md-${neighborEntries.length > 1 ? '5' : '3'} mb-3">
                    <div class="row">
                        ${displayedPeers.map(([neighborIp, neighborConfig], index) => `
                            <div class="col-${neighborEntries.length > 1 ? (neighborEntries.length > 2 ? '4' : '6') : '12'} mb-3">
                                <div class="bgp-node peer-as">
                                    <div class="node-title">BGP Peer</div>
                                    <div class="node-value">AS ${neighborConfig['remote-as'] || 'Unknown'}</div>
                                    <div class="small">${neighborIp}</div>
                                    <div class="node-icon"><i class="fas fa-network-wired"></i></div>
                                </div>
                            </div>
                        `).join('')}
                        
                        ${hasMorePeers ? `
                            <div class="col-4 mb-3">
                                <div class="bgp-node peer-as">
                                    <div class="node-title">Additional Peers</div>
                                    <div class="node-value">+${additionalPeersCount}</div>
                                    <div class="small">Other BGP neighbors</div>
                                    <div class="node-icon"><i class="fas fa-ellipsis-h"></i></div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="col-md-1 d-flex align-items-center justify-content-center mb-3">
                    <div class="bgp-arrow">
                        <i class="fas fa-arrow-right"></i>
                    </div>
                </div>
                
                <div class="col-md-3 mb-3">
                    <div class="bgp-node internet">
                        <div class="node-title">Internet</div>
                        <div class="node-value">Global BGP</div>
                        <div class="node-icon"><i class="fas fa-globe"></i></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="bgp-propagation-description">
            <p>Routes are exchanged between BGP peers using the standard BGP protocol mechanisms.</p>
            <p class="small text-muted">AS ${systemAs} advertises ${Object.keys(networks).length} networks to ${Object.keys(neighbors).length} peer${Object.keys(neighbors).length > 1 ? 's' : ''}.</p>
        </div>
    `;
    
    visualizationCard.appendChild(visualizationContainer);
    bgpConfigContainer.appendChild(visualizationCard);
    
    // If there are multiple peers, add a peers list section
    if (neighborEntries.length > 1) {
        // Create a detailed peers list card for more than 3 peers
        const detailedPeersCard = document.createElement('div');
        detailedPeersCard.className = 'bgp-peers-card mb-4';
        
        // Peers list header
        const peersListHeader = document.createElement('h4');
        peersListHeader.textContent = 'All BGP Peers';
        detailedPeersCard.appendChild(peersListHeader);
        
        // Create peers list
        const peersList = document.createElement('div');
        peersList.className = 'row g-3';
        
        neighborEntries.forEach(([neighborIp, neighborConfig]) => {
            const peerCard = document.createElement('div');
            peerCard.className = 'col-md-6 col-lg-4';
            peerCard.innerHTML = `
                <div class="card h-100">
                    <div class="card-header">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-project-diagram me-2"></i>
                            AS ${neighborConfig['remote-as'] || 'Unknown'}
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="info-item">
                            <span class="info-label">Neighbor IP</span>
                            <span class="info-value">${neighborIp}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Update Source</span>
                            <span class="info-value">${neighborConfig['update-source'] || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Multihop</span>
                            <span class="info-value">${neighborConfig['ebgp-multihop'] || 'N/A'}</span>
                        </div>
                        ${neighborConfig['description'] ? `
                        <div class="info-item">
                            <span class="info-label">Description</span>
                            <span class="info-value">${neighborConfig['description']}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
            peersList.appendChild(peerCard);
        });
        
        detailedPeersCard.appendChild(peersList);
        
        // Add it after the visualization card
        bgpConfigContainer.appendChild(detailedPeersCard);
    }
}

// Initialize DNS service tab
function initDnsService(forceRefresh = false) {
    console.log("Initializing DNS Service...");
    const dnsStatusElement = document.getElementById('dns-status');
    
    if (!dnsStatusElement) {
        console.error("DNS status element not found");
        return;
    }
    
    loadConfigData('', forceRefresh).then(result => {
        // For debugging purposes
        console.log("Full config data for DNS:", result);
        
        // Log the DNS service configuration specifically
        if (result.data && result.data.service && result.data.service.dns) {
            configLogger.logConfiguration({dns: result.data.service.dns}, 'DNS_SERVICE');
        }
        
        // Check if DNS service data exists
        const dnsService = result.data.service && result.data.service.dns;
        
        if (!dnsService || Object.keys(dnsService).length === 0) {
            dnsStatusElement.innerHTML = `
                <div class="p-4">
                    <div class="alert alert-warning mb-0">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        DNS service is not configured
                    </div>
                </div>
            `;
            return;
        }
        
        // Render DNS configuration
        let html = `
            <div class="network-list">
                <div class="network-item">
                    <div class="network-item-header">
                        <h6>
                            <i class="fas fa-globe"></i> DNS Service Configuration
                        </h6>
                        <span class="badge bg-success">Active</span>
                    </div>
                    <div class="network-item-body">
        `;
        
        // Add nameservers if available
        if (dnsService.nameserver) {
            html += `
                <div class="mb-3">
                    <h6 class="mb-2">Nameservers</h6>
                    <div class="row">
            `;
            
            const nameservers = Array.isArray(dnsService.nameserver) 
                ? dnsService.nameserver 
                : [dnsService.nameserver];
                
            nameservers.forEach(ns => {
                html += `
                    <div class="col-md-4 mb-2">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-server me-2 text-primary"></i>
                            <span class="subnet-badge">${ns}</span>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Add forwarding configuration if available
        if (dnsService.forwarding) {
            html += `
                <div class="mb-3">
                    <h6 class="mb-2">Forwarding</h6>
                    <div class="d-flex align-items-center mb-2">
                        <span class="me-2">Status:</span>
                        <span class="badge bg-success">Enabled</span>
                    </div>
            `;
            
            if (dnsService.forwarding.cache_size) {
                html += `
                    <div class="d-flex align-items-center mb-2">
                        <span class="me-2">Cache Size:</span>
                        <span class="subnet-badge">${dnsService.forwarding.cache_size}</span>
                    </div>
                `;
            }
            
            if (dnsService.forwarding["allow-from"]) {
                html += `
                    <div class="d-flex align-items-center mb-2">
                        <span class="me-2">Allow From:</span>
                        <span class="subnet-badge">${dnsService.forwarding["allow-from"]}</span>
                    </div>
                `;
            }
            
            if (dnsService.forwarding.listen_address || dnsService.forwarding["listen-address"]) {
                const listenAddressKey = dnsService.forwarding.listen_address ? 'listen_address' : 'listen-address';
                
                html += `
                    <div class="mb-2">
                        <div class="mb-1">Listen Addresses:</div>
                        <div class="row">
                `;
                
                const listenAddresses = Array.isArray(dnsService.forwarding[listenAddressKey]) 
                    ? dnsService.forwarding[listenAddressKey] 
                    : [dnsService.forwarding[listenAddressKey]];
                    
                listenAddresses.forEach(addr => {
                    html += `
                        <div class="col-md-4 mb-2">
                            <span class="subnet-badge">${addr}</span>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }
            
            html += `</div>`;
        }
        
        // Close the network item divs
        html += `
                    </div>
                </div>
            </div>
        `;
        
        dnsStatusElement.innerHTML = html;
        
        // Initialize search functionality
        const dnsSearch = document.getElementById('dnsSearch');
        if (dnsSearch) {
            dnsSearch.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase();
                // Implement search logic for DNS entries
                console.log("Searching DNS entries:", searchTerm);
            });
        }
    }).catch(error => {
        console.error("Error fetching DNS configuration:", error);
        dnsStatusElement.innerHTML = `
            <div class="p-4">
                <div class="alert alert-danger mb-0">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Error loading DNS service: ${error.message}
                </div>
            </div>
        `;
    });
}