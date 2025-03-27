/**
 * VPN Dashboard JavaScript
 * Handles VPN configuration display including WireGuard, OpenVPN, and IPsec
 */

// Set up interval for data refresh
let vpnDashboardRefreshInterval = null;
const REFRESH_INTERVAL = 60000; // 1 minute

document.addEventListener('DOMContentLoaded', function() {
    initVpnDashboard();
});

/**
 * Initialize the VPN dashboard
 */
async function initVpnDashboard() {
    try {
        // Check if we're on the VPN dedicated page
        const isVpnPage = document.getElementById('vpnLoadingIndicator') !== null;
        
        if (isVpnPage) {
            // Show loading indicator
            document.getElementById('vpnLoadingIndicator').classList.remove('d-none');
            document.getElementById('vpnContent').classList.add('d-none');
            document.getElementById('vpnErrorAlert').classList.add('d-none');
            
            // Set up refresh button
            setupRefreshButton();
            
            // Add hash change listener to handle navigation within the page
            window.addEventListener('hashchange', handleHashChange);
        }
        
        // Load configuration data - use the main loadConfigData function if available
        const loadConfig = typeof window.loadConfigData === 'function' ? 
                          window.loadConfigData : 
                          function() { console.error('loadConfigData not available'); return { success: false }; };
        
        const config = await loadConfig();
        
        if (config && config.success) {
            // Update dashboard with VPN data
            if (isVpnPage) {
                updateVpnDashboard(config.data);
                
                // Hide loading indicator and show content
                document.getElementById('vpnLoadingIndicator').classList.add('d-none');
                document.getElementById('vpnContent').classList.remove('d-none');
                
                // Set up auto-refresh
                setupAutoRefresh(loadConfig);
                
                // Show last refresh time
                updateLastRefreshTime();
                
                // Check for hash navigation after content is loaded
                setTimeout(() => {
                    if (window.location.hash) {
                        handleHashChange();
                    }
                }, 500);
            }
        } else {
            throw new Error('Failed to load configuration data');
        }
    } catch (error) {
        console.error('VPN Dashboard initialization error:', error);
        
        // Show error message only if on VPN page
        if (document.getElementById('vpnLoadingIndicator')) {
            document.getElementById('vpnLoadingIndicator').classList.add('d-none');
            document.getElementById('vpnErrorAlert').classList.remove('d-none');
        }
    }
}

/**
 * Set up the VPN dashboard refresh button
 */
function setupRefreshButton() {
    // Add a refresh button to the page
    const refreshButtonContainer = document.getElementById('vpn-refresh-button');
    
    if (refreshButtonContainer) {
        // Clear existing content
        refreshButtonContainer.innerHTML = '';
        
        // Create refresh button
        const refreshButton = document.createElement('button');
        refreshButton.className = 'btn btn-outline-primary';
        refreshButton.id = 'refresh-vpn-data';
        refreshButton.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh Data';
        
        // Create last refresh time display
        const lastRefreshSpan = document.createElement('span');
        lastRefreshSpan.className = 'text-muted ms-2 small';
        lastRefreshSpan.id = 'last-refresh-time';
        
        refreshButtonContainer.appendChild(refreshButton);
        refreshButtonContainer.appendChild(lastRefreshSpan);
        
        // Add click handler
        refreshButton.addEventListener('click', function() {
            this.disabled = true;
            this.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refreshing...';
            
            // Reset the auto-refresh
            if (vpnDashboardRefreshInterval) {
                clearInterval(vpnDashboardRefreshInterval);
                vpnDashboardRefreshInterval = null;
            }
            
            // Reload dashboard
            initVpnDashboard().finally(() => {
                this.disabled = false;
                this.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh Data';
            });
        });
    }
}

/**
 * Set up auto-refresh for the VPN dashboard
 */
function setupAutoRefresh(loadConfig) {
    // Clear any existing interval
    if (vpnDashboardRefreshInterval) {
        clearInterval(vpnDashboardRefreshInterval);
    }
    
    // Set up new interval
    vpnDashboardRefreshInterval = setInterval(async () => {
        try {
            const config = await loadConfig();
            
            if (config && config.success) {
                // Update dashboard with new data
                updateVpnDashboard(config.data);
                updateLastRefreshTime();
                console.log('VPN dashboard data refreshed');
            }
        } catch (error) {
            console.error('Error refreshing VPN data:', error);
        }
    }, REFRESH_INTERVAL);
}

/**
 * Update the last refresh time display
 */
function updateLastRefreshTime() {
    const lastRefreshElement = document.getElementById('last-refresh-time');
    
    if (lastRefreshElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        lastRefreshElement.textContent = `Last updated: ${timeString}`;
    }
}

/**
 * Update the VPN dashboard with configuration data
 */
function updateVpnDashboard(data) {
    // Parse WireGuard data
    const wireguardInterfaces = getWireguardInterfaces(data);
    
    // Update counters
    updateVpnCounters(data, wireguardInterfaces);
    
    // Populate WireGuard interfaces and peers
    populateWireguardInterfaces(wireguardInterfaces);
    populateWireguardPeers(wireguardInterfaces);
    
    // Populate VPN connections overview
    populateVpnConnectionsOverview(wireguardInterfaces);
}

/**
 * Get WireGuard interfaces from configuration data
 */
function getWireguardInterfaces(data) {
    // First try VyOS v1.4 style path: data.interfaces.wireguard
    if (data.interfaces && data.interfaces.wireguard) {
        return data.interfaces.wireguard;
    }
    
    // Then try VyOS v1.3 style path: data.wireguard.interface
    if (data.wireguard && data.wireguard.interface) {
        return data.wireguard.interface;
    }
    
    // Finally try direct path for API specifics: data.data.interfaces.wireguard
    if (data.data && data.data.interfaces && data.data.interfaces.wireguard) {
        return data.data.interfaces.wireguard;
    }
    
    // If nothing found, return empty object
    console.error('No WireGuard interfaces found in configuration data');
    console.log('Data structure:', data);
    return {};
}

/**
 * Update all VPN-related counters
 */
function updateVpnCounters(data, wireguardInterfaces) {
    // Count WireGuard interfaces
    const wgInterfaceCount = Object.keys(wireguardInterfaces).length;
    
    // Count WireGuard peers
    let peerCount = 0;
    for (const wgInterface in wireguardInterfaces) {
        if (wireguardInterfaces[wgInterface].peer) {
            peerCount += Object.keys(wireguardInterfaces[wgInterface].peer).length;
        }
    }
    
    // Count VPN route tables
    let routeTableCount = 0;
    if (data.protocols && data.protocols.static && data.protocols.static.table) {
        routeTableCount = Object.keys(data.protocols.static.table).length;
    }
    
    // Update counter displays
    document.getElementById('wireguardCount').textContent = wgInterfaceCount;
    document.getElementById('openvpnCount').textContent = '0'; // Not implemented yet
    document.getElementById('ipsecCount').textContent = '0';   // Not implemented yet
    
    // Update interface and peer counts in the WireGuard tab
    document.getElementById('wireguard-interfaces-count').textContent = wgInterfaceCount;
    document.getElementById('wireguard-peers-count').textContent = peerCount;
}

/**
 * Populate the WireGuard interfaces container
 */
function populateWireguardInterfaces(wireguardInterfaces) {
    const container = document.getElementById('wireguard-interfaces-container');
    
    // Clear loading indicator
    container.innerHTML = '';
    
    if (Object.keys(wireguardInterfaces).length === 0) {
        container.innerHTML = '<div class="text-center py-3"><p>No WireGuard interfaces configured</p></div>';
        return;
    }
    
    // Create interface cards
    for (const interfaceName in wireguardInterfaces) {
        const interfaceData = wireguardInterfaces[interfaceName];
        const peerCount = interfaceData.peer ? Object.keys(interfaceData.peer).length : 0;
        
        const card = document.createElement('div');
        card.className = 'wireguard-interface-card mb-4 border rounded overflow-hidden';
        
        // Create header
        const cardHeader = document.createElement('div');
        cardHeader.className = 'd-flex justify-content-between align-items-center p-3 bg-light';
        
        const titleDiv = document.createElement('div');
        const title = document.createElement('h4');
        title.className = 'h5 mb-0';
        title.innerHTML = `<i class="bi bi-hdd-network me-2"></i>${interfaceName}`;
        titleDiv.appendChild(title);
        
        const badgeDiv = document.createElement('div');
        
        // Add a badge for link status
        const statusBadge = document.createElement('span');
        statusBadge.className = 'badge bg-success';
        statusBadge.textContent = 'Active';
        badgeDiv.appendChild(statusBadge);
        
        cardHeader.appendChild(titleDiv);
        cardHeader.appendChild(badgeDiv);
        
        // Create main card body
        const cardBody = document.createElement('div');
        cardBody.className = 'p-3';
        
        // Create interface info table
        const infoTable = document.createElement('div');
        infoTable.className = 'row';
        
        // Left column - Basic info
        const leftCol = document.createElement('div');
        leftCol.className = 'col-md-6';
        
        const basicInfo = document.createElement('h5');
        basicInfo.className = 'border-bottom pb-2 mb-3';
        basicInfo.textContent = 'Interface Information';
        leftCol.appendChild(basicInfo);
        
        const basicInfoList = document.createElement('ul');
        basicInfoList.className = 'list-unstyled mb-3';
        
        // Interface details
        [
            { label: 'Interface Name', value: interfaceName },
            { label: 'Peer Count', value: peerCount.toString() },
            { label: 'MSS Adjustment', value: (interfaceData.ip && interfaceData.ip['adjust-mss']) ? 
                                           interfaceData.ip['adjust-mss'] : 'None' },
            { label: 'MTU', value: interfaceData.mtu || 'Default' },
        ].forEach(item => {
            const li = document.createElement('li');
            li.className = 'mb-2';
            li.innerHTML = `<strong>${item.label}:</strong> ${item.value}`;
            basicInfoList.appendChild(li);
        });
        
        leftCol.appendChild(basicInfoList);
        
        // Right column - Security info
        const rightCol = document.createElement('div');
        rightCol.className = 'col-md-6';
        
        const securityInfo = document.createElement('h5');
        securityInfo.className = 'border-bottom pb-2 mb-3';
        securityInfo.textContent = 'Security Information';
        rightCol.appendChild(securityInfo);
        
        // Private key section with secure display
        if (interfaceData['private-key']) {
            const keySection = document.createElement('div');
            keySection.className = 'mb-3';
            
            const keyLabel = document.createElement('label');
            keyLabel.className = 'form-label fw-bold';
            keyLabel.textContent = 'Private Key';
            
            // Create a masked key display with toggle
            const keyInputGroup = document.createElement('div');
            keyInputGroup.className = 'input-group mb-2';
            
            const keyInput = document.createElement('input');
            keyInput.type = 'password';
            keyInput.className = 'form-control form-control-sm';
            keyInput.value = interfaceData['private-key'];
            keyInput.readOnly = true;
            
            // Toggle visibility button
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'btn btn-outline-secondary btn-sm';
            toggleBtn.innerHTML = '<i class="bi bi-eye"></i>';
            toggleBtn.title = 'Show/hide private key';
            toggleBtn.onclick = function() {
                if (keyInput.type === 'password') {
                    keyInput.type = 'text';
                    this.innerHTML = '<i class="bi bi-eye-slash"></i>';
                } else {
                    keyInput.type = 'password';
                    this.innerHTML = '<i class="bi bi-eye"></i>';
                }
            };
            
            // Copy button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'btn btn-outline-secondary btn-sm';
            copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
            copyBtn.title = 'Copy private key';
            copyBtn.onclick = function() {
                navigator.clipboard.writeText(keyInput.value);
                this.innerHTML = '<i class="bi bi-check"></i>';
                setTimeout(() => {
                    this.innerHTML = '<i class="bi bi-clipboard"></i>';
                }, 2000);
            };
            
            keyInputGroup.appendChild(keyInput);
            keyInputGroup.appendChild(toggleBtn);
            keyInputGroup.appendChild(copyBtn);
            
            const securityNote = document.createElement('small');
            securityNote.className = 'text-muted d-block';
            securityNote.textContent = 'Keep your private key secure. Never share it with anyone.';
            
            keySection.appendChild(keyLabel);
            keySection.appendChild(keyInputGroup);
            keySection.appendChild(securityNote);
            rightCol.appendChild(keySection);
        }
        
        // Add columns to table
        infoTable.appendChild(leftCol);
        infoTable.appendChild(rightCol);
        cardBody.appendChild(infoTable);
        
        // Peer summary section
        if (peerCount > 0) {
            const peerSection = document.createElement('div');
            peerSection.className = 'mt-3 pt-3 border-top';
            
            const peerHeader = document.createElement('h5');
            peerHeader.className = 'd-flex justify-content-between align-items-center mb-3';
            peerHeader.innerHTML = `
                <span>Connected Peers <span class="badge bg-primary ms-2">${peerCount}</span></span>
                <button class="btn btn-sm btn-outline-primary" id="expand-peers-${interfaceName}">
                    <i class="bi bi-chevron-down"></i> Show details
                </button>
            `;
            peerSection.appendChild(peerHeader);
            
            // Create collapsible peer details
            const peerDetails = document.createElement('div');
            peerDetails.id = `peer-details-${interfaceName}`;
            peerDetails.className = 'peer-details d-none';
            
            // Add peers as a list
            const peerList = document.createElement('div');
            peerList.className = 'list-group mb-3';
            
            if (interfaceData.peer) {
                for (const peerName in interfaceData.peer) {
                    const peerData = interfaceData.peer[peerName];
                    
                    const peerItem = document.createElement('div');
                    peerItem.className = 'list-group-item';
                    
                    // Peer header
                    const peerItemHeader = document.createElement('div');
                    peerItemHeader.className = 'd-flex justify-content-between align-items-center';
                    
                    const peerNameSpan = document.createElement('h6');
                    peerNameSpan.className = 'mb-0';
                    peerNameSpan.textContent = peerName;
                    
                    // Check if this is a full tunnel configuration
                    let isFullTunnel = false;
                    // Normalize allowed IPs
                    let allowedIps = [];
                    if (peerData['allowed-ips']) {
                        // Handle both string and array formats
                        if (Array.isArray(peerData['allowed-ips'])) {
                            allowedIps = peerData['allowed-ips'];
                        } else if (typeof peerData['allowed-ips'] === 'string') {
                            // Split by comma if it contains commas, otherwise treat as single value
                            if (peerData['allowed-ips'].includes(',')) {
                                allowedIps = peerData['allowed-ips'].split(',').map(ip => ip.trim());
                            } else {
                                allowedIps = [peerData['allowed-ips']];
                            }
                        }
                    }
                    
                    // Check if any allowed IPs include default routes
                    if (allowedIps.includes('0.0.0.0/0') || allowedIps.includes('::/0')) {
                        isFullTunnel = true;
                    }
                    
                    const peerTypeBadge = document.createElement('span');
                    peerTypeBadge.className = isFullTunnel ? 'badge bg-warning text-dark' : 'badge bg-info';
                    peerTypeBadge.textContent = isFullTunnel ? 'Full Tunnel' : 'Split Tunnel';
                    
                    peerItemHeader.appendChild(peerNameSpan);
                    peerItemHeader.appendChild(peerTypeBadge);
                    peerItem.appendChild(peerItemHeader);
                    
                    // Peer details
                    const peerDetailsDiv = document.createElement('div');
                    peerDetailsDiv.className = 'mt-2';
                    
                    // Endpoint info
                    if (peerData.address) {
                        const endpointDiv = document.createElement('div');
                        endpointDiv.className = 'small';
                        endpointDiv.innerHTML = `<strong>Endpoint:</strong> ${peerData.address}${peerData.port ? ':' + peerData.port : ''}`;
                        peerDetailsDiv.appendChild(endpointDiv);
                    }
                    
                    // Public key info (shortened)
                    if (peerData['public-key']) {
                        const publicKeyDiv = document.createElement('div');
                        publicKeyDiv.className = 'small';
                        publicKeyDiv.innerHTML = `<strong>Public Key:</strong> ${peerData['public-key'].substring(0, 16)}...${peerData['public-key'].substring(peerData['public-key'].length - 16)}`;
                        peerDetailsDiv.appendChild(publicKeyDiv);
                    }
                    
                    // Allowed IPs
                    if (allowedIps && allowedIps.length > 0) {
                        const allowedIpsDiv = document.createElement('div');
                        allowedIpsDiv.className = 'small';
                        
                        const allowedIpsLabel = document.createElement('strong');
                        allowedIpsLabel.textContent = 'Allowed IPs: ';
                        allowedIpsDiv.appendChild(allowedIpsLabel);
                        
                        // Create a span for each IP with appropriate formatting
                        allowedIps.forEach((ip, idx) => {
                            const ipSpan = document.createElement('span');
                            // Special styling for default routes
                            if (ip === '0.0.0.0/0') {
                                ipSpan.className = 'badge bg-warning text-dark me-1';
                                ipSpan.title = 'All IPv4 Traffic';
                            } else if (ip === '::/0') {
                                ipSpan.className = 'badge bg-warning text-dark me-1';
                                ipSpan.title = 'All IPv6 Traffic';
                            } else {
                                ipSpan.className = 'badge bg-light text-dark me-1';
                            }
                            ipSpan.textContent = ip;
                            allowedIpsDiv.appendChild(ipSpan);
                            
                            // Add comma between items (except last)
                            if (idx < allowedIps.length - 1) {
                                allowedIpsDiv.appendChild(document.createTextNode(' '));
                            }
                        });
                        
                        peerDetailsDiv.appendChild(allowedIpsDiv);
                    }
                    
                    // Keepalive
                    if (peerData['persistent-keepalive']) {
                        const keepaliveDiv = document.createElement('div');
                        keepaliveDiv.className = 'small';
                        keepaliveDiv.innerHTML = `<strong>Keepalive:</strong> ${peerData['persistent-keepalive']} seconds`;
                        peerDetailsDiv.appendChild(keepaliveDiv);
                    }
                    
                    peerItem.appendChild(peerDetailsDiv);
                    peerList.appendChild(peerItem);
                }
            }
            
            peerDetails.appendChild(peerList);
            peerSection.appendChild(peerDetails);
            cardBody.appendChild(peerSection);
            
            // Set up toggle behavior for the peer details
            setTimeout(() => {
                const expandBtn = document.getElementById(`expand-peers-${interfaceName}`);
                const detailsDiv = document.getElementById(`peer-details-${interfaceName}`);
                
                if (expandBtn && detailsDiv) {
                    expandBtn.addEventListener('click', function() {
                        if (detailsDiv.classList.contains('d-none')) {
                            detailsDiv.classList.remove('d-none');
                            this.innerHTML = '<i class="bi bi-chevron-up"></i> Hide details';
                        } else {
                            detailsDiv.classList.add('d-none');
                            this.innerHTML = '<i class="bi bi-chevron-down"></i> Show details';
                        }
                    });
                }
            }, 0);
        }
        
        card.appendChild(cardHeader);
        card.appendChild(cardBody);
        container.appendChild(card);
    }
}

/**
 * Check peer health status
 * @param {Object} peer The peer data object
 * @return {Object} Health status information
 */
function checkPeerHealth(peer) {
    const result = {
        status: 'unknown',      // 'healthy', 'warning', 'error', 'unknown'
        statusText: 'Unknown',
        issues: [],
        lastHandshake: null,
        transferRx: 0,
        transferTx: 0,
        isActive: false
    };
    
    // Check if peer has handshake time
    if (peer['latest-handshake']) {
        result.lastHandshake = peer['latest-handshake'];
        
        // Parse handshake time (could be timestamp or formatted time)
        let handshakeTime;
        if (typeof peer['latest-handshake'] === 'number') {
            handshakeTime = new Date(peer['latest-handshake'] * 1000);
        } else {
            try {
                handshakeTime = new Date(peer['latest-handshake']);
            } catch (e) {
                handshakeTime = null;
            }
        }
        
        if (handshakeTime) {
            const now = new Date();
            const timeDiff = (now - handshakeTime) / 1000; // in seconds
            
            // Set status based on last handshake time
            if (timeDiff < 180) { // Less than 3 minutes
                result.status = 'healthy';
                result.statusText = 'Healthy';
                result.isActive = true;
            } else if (timeDiff < 600) { // Less than 10 minutes
                result.status = 'warning';
                result.statusText = 'Warning';
                result.issues.push(`Last handshake ${Math.floor(timeDiff / 60)} minutes ago`);
                result.isActive = true;
            } else {
                result.status = 'error';
                result.statusText = 'Disconnected';
                
                // Format the time difference for display
                if (timeDiff < 3600) {
                    result.issues.push(`No handshake in ${Math.floor(timeDiff / 60)} minutes`);
                } else if (timeDiff < 86400) {
                    result.issues.push(`No handshake in ${Math.floor(timeDiff / 3600)} hours`);
                } else {
                    result.issues.push(`No handshake in ${Math.floor(timeDiff / 86400)} days`);
                }
                
                result.isActive = false;
            }
        }
    } else {
        result.status = 'error';
        result.statusText = 'Not Connected';
        result.issues.push('No handshake recorded');
        result.isActive = false;
    }
    
    // Check transfer stats if available
    if (peer['transfer-rx']) {
        result.transferRx = peer['transfer-rx'];
    }
    
    if (peer['transfer-tx']) {
        result.transferTx = peer['transfer-tx'];
    }
    
    // Check for keepalive settings
    if (!peer['persistent-keepalive'] && result.status !== 'healthy') {
        result.issues.push('No persistent keepalive configured');
    }
    
    return result;
}

/**
 * Format data transfer size
 * @param {number} bytes Size in bytes
 * @return {string} Formatted size string
 */
function formatDataTransfer(bytes) {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Populate the WireGuard peers table
 */
function populateWireguardPeers(wireguardInterfaces) {
    const tableBody = document.getElementById('wireguard-peers-table-body');
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    let hasPeers = false;
    
    for (const interfaceName in wireguardInterfaces) {
        const interfaceData = wireguardInterfaces[interfaceName];
        
        if (interfaceData.peer) {
            for (const peerName in interfaceData.peer) {
                hasPeers = true;
                const peerData = interfaceData.peer[peerName];
                
                // Check peer health status
                const health = checkPeerHealth(peerData);
                
                const row = document.createElement('tr');
                
                // Add ID for easy targeting and hash navigation
                const peerSlug = peerName.replace(/[^a-zA-Z0-9]/g, '-');
                row.id = `peer-${peerSlug}`;
                
                // Highlight the row if it matches the URL hash
                const currentHash = window.location.hash.substring(1);
                if (currentHash && currentHash === `peer-${peerSlug}`) {
                    row.classList.add('highlight-row');
                    
                    // Scroll to this row (with a slight delay to ensure DOM is ready)
                    setTimeout(() => {
                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                }
                
                // Interface
                const interfaceCell = document.createElement('td');
                interfaceCell.textContent = interfaceName;
                row.appendChild(interfaceCell);
                
                // Status column (new)
                const statusCell = document.createElement('td');
                const statusBadge = document.createElement('span');
                
                // Set badge color based on health status
                switch (health.status) {
                    case 'healthy':
                        statusBadge.className = 'badge bg-success';
                        statusBadge.innerHTML = '<i class="bi bi-check-circle me-1"></i>Connected';
                        break;
                    case 'warning':
                        statusBadge.className = 'badge bg-warning text-dark';
                        statusBadge.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>Warning';
                        break;
                    case 'error':
                        statusBadge.className = 'badge bg-danger';
                        statusBadge.innerHTML = '<i class="bi bi-x-circle me-1"></i>Disconnected';
                        break;
                    default:
                        statusBadge.className = 'badge bg-secondary';
                        statusBadge.innerHTML = '<i class="bi bi-question-circle me-1"></i>Unknown';
                }
                
                // Add tooltip with issues if any
                if (health.issues.length > 0) {
                    statusBadge.title = health.issues.join('\n');
                }
                
                statusCell.appendChild(statusBadge);
                
                // Add last handshake time if available
                if (health.lastHandshake) {
                    const handshakeDiv = document.createElement('div');
                    handshakeDiv.className = 'small text-muted mt-1';
                    
                    // Format the handshake time
                    let handshakeText;
                    try {
                        let handshakeTime;
                        if (typeof health.lastHandshake === 'number') {
                            handshakeTime = new Date(health.lastHandshake * 1000);
                        } else {
                            handshakeTime = new Date(health.lastHandshake);
                        }
                        
                        // Format as "X minutes/hours ago" if less than 24 hours, otherwise show date
                        const now = new Date();
                        const timeDiff = (now - handshakeTime) / 1000; // in seconds
                        
                        if (timeDiff < 60) {
                            handshakeText = `${Math.floor(timeDiff)} seconds ago`;
                        } else if (timeDiff < 3600) {
                            handshakeText = `${Math.floor(timeDiff / 60)} minutes ago`;
                        } else if (timeDiff < 86400) {
                            handshakeText = `${Math.floor(timeDiff / 3600)} hours ago`;
                        } else {
                            handshakeText = handshakeTime.toLocaleDateString();
                        }
                    } catch (e) {
                        handshakeText = health.lastHandshake;
                    }
                    
                    handshakeDiv.textContent = `Last handshake: ${handshakeText}`;
                    statusCell.appendChild(handshakeDiv);
                }
                
                row.appendChild(statusCell);
                
                // Peer Name
                const peerNameCell = document.createElement('td');
                peerNameCell.textContent = peerName;
                row.appendChild(peerNameCell);
                
                // Public Key
                const publicKeyCell = document.createElement('td');
                if (peerData['public-key']) {
                    const keySpan = document.createElement('span');
                    keySpan.className = 'small';
                    keySpan.textContent = peerData['public-key'].substring(0, 10) + '...' + 
                                         peerData['public-key'].substring(peerData['public-key'].length - 10);
                    
                    // Add a copy button
                    const copyButton = document.createElement('button');
                    copyButton.className = 'btn btn-sm btn-outline-secondary ms-2';
                    copyButton.innerHTML = '<i class="bi bi-clipboard"></i>';
                    copyButton.title = 'Copy full key';
                    copyButton.dataset.fullKey = peerData['public-key'];
                    copyButton.onclick = function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                            const keyText = this.dataset.fullKey;
                            navigator.clipboard.writeText(keyText)
                                .then(() => {
                                    this.innerHTML = '<i class="bi bi-check"></i>';
                                    setTimeout(() => {
                                        this.innerHTML = '<i class="bi bi-clipboard"></i>';
                                    }, 2000);
                                })
                                .catch(err => {
                                    console.error('Could not copy text: ', err);
                                    alert('Failed to copy key. Your browser may not support clipboard operations.');
                                });
                        } catch (error) {
                            console.error('Copy operation failed:', error);
                        }
                        return false;
                    };
                    
                    keySpan.title = peerData['public-key'];
                    publicKeyCell.appendChild(keySpan);
                    publicKeyCell.appendChild(copyButton);
                } else {
                    publicKeyCell.textContent = 'N/A';
                }
                row.appendChild(publicKeyCell);
                
                // Endpoint
                const endpointCell = document.createElement('td');
                if (peerData.address && peerData.port) {
                    endpointCell.textContent = `${peerData.address}:${peerData.port}`;
                } else if (peerData.address) {
                    endpointCell.textContent = peerData.address;
                } else {
                    endpointCell.textContent = 'N/A';
                }
                row.appendChild(endpointCell);
                
                // Transfer Stats (new)
                const transferCell = document.createElement('td');
                
                if (health.transferRx > 0 || health.transferTx > 0) {
                    const transferDiv = document.createElement('div');
                    transferDiv.className = 'small';
                    
                    const rxSpan = document.createElement('div');
                    rxSpan.innerHTML = `<i class="bi bi-arrow-down text-success"></i> ${formatDataTransfer(health.transferRx)}`;
                    
                    const txSpan = document.createElement('div');
                    txSpan.innerHTML = `<i class="bi bi-arrow-up text-primary"></i> ${formatDataTransfer(health.transferTx)}`;
                    
                    transferDiv.appendChild(rxSpan);
                    transferDiv.appendChild(txSpan);
                    transferCell.appendChild(transferDiv);
                } else {
                    transferCell.textContent = 'No data';
                }
                
                row.appendChild(transferCell);
                
                // Allowed IPs
                const allowedIpsCell = document.createElement('td');
                
                // Normalize allowed IPs to array format
                let allowedIps = [];
                if (peerData['allowed-ips']) {
                    // Handle both string and array formats
                    if (Array.isArray(peerData['allowed-ips'])) {
                        allowedIps = peerData['allowed-ips'];
                    } else if (typeof peerData['allowed-ips'] === 'string') {
                        // Split by comma if it contains commas, otherwise treat as single value
                        if (peerData['allowed-ips'].includes(',')) {
                            allowedIps = peerData['allowed-ips'].split(',').map(ip => ip.trim());
                        } else {
                            allowedIps = [peerData['allowed-ips']];
                        }
                    }
                }
                
                if (allowedIps.length > 0) {
                    const ipsList = document.createElement('ul');
                    ipsList.className = 'mb-0 ps-3';
                    
                    allowedIps.forEach(ip => {
                        const li = document.createElement('li');
                        li.textContent = ip;
                        
                        // Highlight special routes
                        if (ip === '0.0.0.0/0') {
                            li.innerHTML += ' <span class="badge bg-warning text-dark">All IPv4 Traffic</span>';
                        } else if (ip === '::/0') {
                            li.innerHTML += ' <span class="badge bg-warning text-dark">All IPv6 Traffic</span>';
                        }
                        
                        ipsList.appendChild(li);
                    });
                    
                    allowedIpsCell.appendChild(ipsList);
                } else {
                    allowedIpsCell.textContent = 'N/A';
                }
                row.appendChild(allowedIpsCell);
                
                // Options
                const optionsCell = document.createElement('td');
                const optionsList = document.createElement('ul');
                optionsList.className = 'mb-0 ps-3';
                
                if (peerData['persistent-keepalive']) {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>Keepalive:</strong> ${peerData['persistent-keepalive']}s`;
                    optionsList.appendChild(li);
                }
                
                // Add any additional options that might be useful
                if (interfaceData.ip && interfaceData.ip['adjust-mss']) {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>MSS Adjust:</strong> ${interfaceData.ip['adjust-mss']}`;
                    optionsList.appendChild(li);
                }
                
                if (interfaceData.mtu) {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>MTU:</strong> ${interfaceData.mtu}`;
                    optionsList.appendChild(li);
                }
                
                if (optionsList.children.length > 0) {
                    optionsCell.appendChild(optionsList);
                } else {
                    optionsCell.textContent = 'None';
                }
                row.appendChild(optionsCell);
                
                // Actions cell (new)
                const actionsCell = document.createElement('td');
                const detailsButton = document.createElement('button');
                detailsButton.className = 'btn btn-sm btn-outline-primary';
                detailsButton.innerHTML = '<i class="bi bi-info-circle"></i> Details';
                detailsButton.dataset.interfaceName = interfaceName;
                detailsButton.dataset.peerName = peerName;
                detailsButton.onclick = function() {
                    showPeerDetailsModal(this.dataset.interfaceName, this.dataset.peerName, peerData);
                };
                actionsCell.appendChild(detailsButton);
                row.appendChild(actionsCell);
                
                tableBody.appendChild(row);
            }
        }
    }
    
    if (!hasPeers) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 9; // Updated column count to include Actions column
        emptyCell.className = 'text-center';
        emptyCell.textContent = 'No WireGuard peers configured';
        emptyRow.appendChild(emptyCell);
        tableBody.appendChild(emptyRow);
    }
}

/**
 * Populate the VPN connections overview
 */
function populateVpnConnectionsOverview(wireguardInterfaces) {
    const container = document.getElementById('vpn-connections-overview');
    
    // Clear existing content
    container.innerHTML = '';
    
    // Check if there are any VPN connections
    if (Object.keys(wireguardInterfaces).length === 0) {
        container.innerHTML = '<div class="text-center py-3"><p>No active VPN connections</p></div>';
        return;
    }
    
    // Add summary information first
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'alert alert-info mb-3';
    
    // Count total interfaces and peers
    const interfaceCount = Object.keys(wireguardInterfaces).length;
    let peerCount = 0;
    let fullTunnelCount = 0;
    
    for (const interfaceName in wireguardInterfaces) {
        const interfaceData = wireguardInterfaces[interfaceName];
        if (interfaceData.peer) {
            const peers = Object.keys(interfaceData.peer).length;
            peerCount += peers;
            
            // Count peers with full tunnel (0.0.0.0/0 or ::/0)
            for (const peerName in interfaceData.peer) {
                const peerData = interfaceData.peer[peerName];
                if (peerData['allowed-ips'] && Array.isArray(peerData['allowed-ips'])) {
                    if (peerData['allowed-ips'].includes('0.0.0.0/0') || peerData['allowed-ips'].includes('::/0')) {
                        fullTunnelCount++;
                    }
                }
            }
        }
    }
    
    summaryDiv.innerHTML = `
        <h4>WireGuard Summary</h4>
        <div><strong>Interfaces:</strong> ${interfaceCount}</div>
        <div><strong>Total Peers:</strong> ${peerCount}</div>
        <div><strong>Full Tunnel Connections:</strong> ${fullTunnelCount}</div>
    `;
    
    container.appendChild(summaryDiv);
    
    // Create connection cards for WireGuard
    const connectionCards = document.createElement('div');
    connectionCards.className = 'row g-2';
    
    for (const interfaceName in wireguardInterfaces) {
        const interfaceData = wireguardInterfaces[interfaceName];
        
        if (interfaceData.peer) {
            for (const peerName in interfaceData.peer) {
                const peerData = interfaceData.peer[peerName];
                
                const colDiv = document.createElement('div');
                colDiv.className = 'col-md-6 col-xl-4';
                
                const card = document.createElement('div');
                card.className = 'connection-card p-3 border rounded';
                
                // Determine if this is a full tunnel
                let isFullTunnel = false;
                let allowedIps = [];

                if (peerData['allowed-ips']) {
                    // Handle both string and array formats
                    if (Array.isArray(peerData['allowed-ips'])) {
                        allowedIps = peerData['allowed-ips'];
                    } else if (typeof peerData['allowed-ips'] === 'string') {
                        // Split by comma if it contains commas, otherwise treat as single value
                        if (peerData['allowed-ips'].includes(',')) {
                            allowedIps = peerData['allowed-ips'].split(',').map(ip => ip.trim());
                        } else {
                            allowedIps = [peerData['allowed-ips']];
                        }
                    }
                    
                    // Check if this is a full tunnel (contains 0.0.0.0/0 or ::/0)
                    if (allowedIps.includes('0.0.0.0/0') || allowedIps.includes('::/0')) {
                        isFullTunnel = true;
                    }
                }
                
                // Connection header
                const header = document.createElement('div');
                header.className = 'd-flex justify-content-between align-items-center mb-2';
                
                const titleDiv = document.createElement('div');
                const title = document.createElement('h5');
                title.className = 'mb-0';
                title.innerHTML = `<i class="bi bi-shield-lock me-2"></i>${peerName}`;
                
                const subtitle = document.createElement('div');
                subtitle.className = 'text-muted small';
                subtitle.innerHTML = `WireGuard on <strong>${interfaceName}</strong>`;
                
                titleDiv.appendChild(title);
                titleDiv.appendChild(subtitle);
                
                const statusBadge = document.createElement('span');
                statusBadge.className = isFullTunnel ? 'badge bg-warning text-dark' : 'badge bg-success';
                statusBadge.textContent = isFullTunnel ? 'Full Tunnel' : 'Connected';
                
                header.appendChild(titleDiv);
                header.appendChild(statusBadge);
                
                // Connection details
                const details = document.createElement('div');
                details.className = 'connection-details small mt-3';
                
                // Create a table for better layout
                const table = document.createElement('table');
                table.className = 'table table-sm small mb-0';
                
                const tbody = document.createElement('tbody');
                
                // Endpoint
                if (peerData.address) {
                    const row = document.createElement('tr');
                    const th = document.createElement('th');
                    th.className = 'text-nowrap';
                    th.textContent = 'Endpoint:';
                    row.appendChild(th);
                    
                    const td = document.createElement('td');
                    td.textContent = peerData.port ? `${peerData.address}:${peerData.port}` : peerData.address;
                    row.appendChild(td);
                    
                    tbody.appendChild(row);
                }
                
                // Allowed IPs
                if (peerData['allowed-ips'] && Array.isArray(peerData['allowed-ips'])) {
                    const row = document.createElement('tr');
                    const th = document.createElement('th');
                    th.className = 'text-nowrap';
                    th.textContent = 'Allowed IPs:';
                    row.appendChild(th);
                    
                    const td = document.createElement('td');
                    const ipList = document.createElement('ul');
                    ipList.className = 'mb-0 ps-3';
                    
                    peerData['allowed-ips'].forEach(ip => {
                        const li = document.createElement('li');
                        li.textContent = ip;
                        ipList.appendChild(li);
                    });
                    
                    td.appendChild(ipList);
                    row.appendChild(td);
                    
                    tbody.appendChild(row);
                }
                
                // Keepalive
                if (peerData['persistent-keepalive']) {
                    const row = document.createElement('tr');
                    const th = document.createElement('th');
                    th.className = 'text-nowrap';
                    th.textContent = 'Keepalive:';
                    row.appendChild(th);
                    
                    const td = document.createElement('td');
                    td.textContent = `${peerData['persistent-keepalive']} seconds`;
                    row.appendChild(td);
                    
                    tbody.appendChild(row);
                }
                
                // Public Key (shortened)
                if (peerData['public-key']) {
                    const row = document.createElement('tr');
                    const th = document.createElement('th');
                    th.className = 'text-nowrap';
                    th.textContent = 'Public Key:';
                    row.appendChild(th);
                    
                    const td = document.createElement('td');
                    td.title = peerData['public-key'];
                    td.textContent = `${peerData['public-key'].substring(0, 16)}...${peerData['public-key'].substring(peerData['public-key'].length - 16)}`;
                    row.appendChild(td);
                    
                    tbody.appendChild(row);
                }
                
                table.appendChild(tbody);
                details.appendChild(table);
                
                // Add connection info
                const connectionInfo = document.createElement('div');
                connectionInfo.className = 'mt-2 d-flex justify-content-between align-items-center';
                
                // Add traffic info
                const trafficInfo = document.createElement('div');
                trafficInfo.className = 'traffic-info small';
                
                // Add tunnel type indicator
                const tunnelType = document.createElement('span');
                tunnelType.className = isFullTunnel ? 'badge bg-warning text-dark' : 'badge bg-info';
                tunnelType.innerHTML = isFullTunnel ? 
                    '<i class="bi bi-globe2"></i> All traffic routed through VPN' : 
                    '<i class="bi bi-diagram-3"></i> Split tunnel';
                
                trafficInfo.appendChild(tunnelType);
                connectionInfo.appendChild(trafficInfo);
                
                // Add actions button
                const actionsButton = document.createElement('button');
                actionsButton.className = 'btn btn-sm btn-outline-primary peer-details-btn';
                actionsButton.innerHTML = '<i class="bi bi-gear"></i> Details';
                actionsButton.dataset.interfaceName = interfaceName;
                actionsButton.dataset.peerName = peerName;
                actionsButton.onclick = function() {
                    showPeerDetailsModal(this.dataset.interfaceName, this.dataset.peerName, peerData);
                };
                connectionInfo.appendChild(actionsButton);
                
                details.appendChild(connectionInfo);
                
                card.appendChild(header);
                card.appendChild(details);
                colDiv.appendChild(card);
                connectionCards.appendChild(colDiv);
            }
        }
    }
    
    container.appendChild(connectionCards);
    
    // Add a CSS rule for the highlighted row
    const style = document.createElement('style');
    style.textContent = `
        .highlight-row {
            animation: highlight-animation 2.5s ease-in-out;
            position: relative;
            z-index: 10;
        }
        @keyframes highlight-animation {
            0% { background-color: rgba(13, 110, 253, 0.5); box-shadow: 0 0 15px rgba(13, 110, 253, 0.7); }
            50% { background-color: rgba(13, 110, 253, 0.7); box-shadow: 0 0 20px rgba(13, 110, 253, 0.9); }
            100% { background-color: transparent; box-shadow: none; }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Handle hash changes to navigate to specific peers
 */
function handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (hash && hash.startsWith('peer-')) {
        // Remove highlight from all rows
        document.querySelectorAll('#wireguard-peers-table-body tr.highlight-row').forEach(row => {
            row.classList.remove('highlight-row');
        });
        
        // Find the target peer row
        const targetRow = document.getElementById(hash);
        if (targetRow) {
            // Add highlight and scroll to it
            targetRow.classList.add('highlight-row');
            targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Remove the highlight after a delay
            setTimeout(() => {
                targetRow.classList.remove('highlight-row');
            }, 2000);
        }
    }
}

/**
 * Helper function to safely update element text content if element exists
 */
function updateElementIfExists(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

/**
 * Initialize dashboard VPN integration
 * This function is called from the main dashboard page
 */
function initDashboardVpnIntegration() {
    console.log('Initializing dashboard VPN integration');
    
    // Check if main dashboard elements exist
    if (!document.getElementById('wireguard-tunnel-count') && 
        !document.getElementById('wireguard-peer-count')) {
        console.log('Main dashboard VPN elements not found, skipping integration');
        return;
    }
    
    // Default all counters to 0
    updateElementIfExists('wireguard-tunnel-count', '0');
    updateElementIfExists('wireguard-peer-count', '0');
    updateElementIfExists('vpn-route-count', '0');
    
    // Determine how to load configuration data
    let loadConfig;
    
    if (typeof window.loadConfigData === 'function') {
        loadConfig = window.loadConfigData;
    } else if (typeof loadConfigData === 'function') {
        loadConfig = loadConfigData;
    } else {
        console.error('loadConfigData function not available for VPN dashboard integration');
        return;
    }
    
    console.log('Loading configuration data for VPN dashboard integration');
    
    // Load the configuration data
    loadConfig()
        .then(result => {
            console.log('VPN dashboard integration: Configuration data loaded');
            
            // Extract data considering different structures
            const data = result.data ? result.data : result;
            
            // Get WireGuard interfaces
            const wireguardInterfaces = getWireguardInterfaces(data);
            
            // Count WireGuard interfaces
            const wgInterfaceCount = Object.keys(wireguardInterfaces).length;
            
            // Count WireGuard peers
            let peerCount = 0;
            for (const interfaceName in wireguardInterfaces) {
                const wgInterface = wireguardInterfaces[interfaceName];
                if (wgInterface.peer) {
                    peerCount += Object.keys(wgInterface.peer).length;
                }
            }
            
            // Count VPN route tables - try multiple possible data structures
            let routeTableCount = 0;
            
            // Try VyOS v1.4 style path
            if (data.protocols && data.protocols.static && data.protocols.static.table) {
                routeTableCount = Object.keys(data.protocols.static.table).length;
            } 
            // Try VyOS v1.3 style
            else if (data.routing && data.routing.table) {
                routeTableCount = Object.keys(data.routing.table).length;
            }
            // Try data.data path
            else if (data.data && data.data.protocols && data.data.protocols.static && data.data.protocols.static.table) {
                routeTableCount = Object.keys(data.data.protocols.static.table).length;
            }
            
            // Update dashboard counters
            updateElementIfExists('wireguard-tunnel-count', wgInterfaceCount);
            updateElementIfExists('wireguard-peer-count', peerCount);
            updateElementIfExists('vpn-route-count', routeTableCount);
            updateElementIfExists('dashboard-wireguard-interface-count', wgInterfaceCount);
            
            // Populate dashboard WireGuard interfaces if the element exists
            if (document.getElementById('dashboard-wireguard-interfaces')) {
                populateDashboardWireguardInterfaces(wireguardInterfaces);
            }
            
            // Populate VPN routing tables if the element exists
            if (document.getElementById('vpn-routing-table-body')) {
                populateVpnRoutingTables(data);
            }
            
            console.log('VPN dashboard integration complete');
        })
        .catch(error => {
            console.error('Error in VPN dashboard integration:', error);
        });
}

/**
 * Populate WireGuard interfaces for the main dashboard
 */
function populateDashboardWireguardInterfaces(wireguardInterfaces) {
    const container = document.getElementById('dashboard-wireguard-interfaces');
    
    // Clear existing content
    container.innerHTML = '';
    
    if (Object.keys(wireguardInterfaces).length === 0) {
        container.innerHTML = '<div class="text-center py-3"><p>No WireGuard interfaces configured</p></div>';
        return;
    }
    
    // Create a simple table for the interfaces
    const table = document.createElement('table');
    table.className = 'table table-hover';
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    ['Interface', 'Peers', 'MSS Adjustment', 'Status'].forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    
    for (const interfaceName in wireguardInterfaces) {
        const interfaceData = wireguardInterfaces[interfaceName];
        const peerCount = interfaceData.peer ? Object.keys(interfaceData.peer).length : 0;
        
        const row = document.createElement('tr');
        
        // Interface name
        const nameCell = document.createElement('td');
        nameCell.textContent = interfaceName;
        row.appendChild(nameCell);
        
        // Peer count
        const peerCell = document.createElement('td');
        peerCell.textContent = peerCount;
        row.appendChild(peerCell);
        
        // MSS Adjustment
        const mssCell = document.createElement('td');
        if (interfaceData.ip && interfaceData.ip['adjust-mss']) {
            mssCell.textContent = interfaceData.ip['adjust-mss'];
        } else {
            mssCell.textContent = 'None';
        }
        row.appendChild(mssCell);
        
        // Status
        const statusCell = document.createElement('td');
        const statusBadge = document.createElement('span');
        statusBadge.className = 'badge bg-success';
        statusBadge.textContent = 'Active';
        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);
        
        tbody.appendChild(row);
    }
    
    table.appendChild(tbody);
    container.appendChild(table);
}

/**
 * Populate VPN routing tables
 */
function populateVpnRoutingTables(data) {
    const tableBody = document.getElementById('vpn-routing-table-body');
    
    if (!tableBody) {
        console.warn('VPN routing table body element not found');
        return;
    }
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Try to find routing tables from different data structure paths
    let staticTables = null;
    
    // VyOS v1.4 style
    if (data.protocols && data.protocols.static && data.protocols.static.table) {
        staticTables = data.protocols.static.table;
    } 
    // VyOS v1.3 style
    else if (data.routing && data.routing.table) {
        staticTables = data.routing.table;
    } 
    // data.data path
    else if (data.data && data.data.protocols && data.data.protocols.static && data.data.protocols.static.table) {
        staticTables = data.data.protocols.static.table;
    }
    
    // If no route tables were found
    if (!staticTables || Object.keys(staticTables).length === 0) {
        console.log('No VPN routing tables found in the data structure');
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 4;
        emptyCell.className = 'text-center';
        emptyCell.textContent = 'No VPN routing tables configured';
        emptyRow.appendChild(emptyCell);
        tableBody.appendChild(emptyRow);
        return;
    }

    console.log(`Found ${Object.keys(staticTables).length} routing tables`);
    
    const tables = staticTables;
    const routeTables = [];
    
    // Find policies from different data structure paths
    let policyRoute = null;
    
    // VyOS v1.4 style
    if (data.policy && data.policy.route) {
        policyRoute = data.policy.route;
    } 
    // data.data path
    else if (data.data && data.data.policy && data.data.policy.route) {
        policyRoute = data.data.policy.route;
    }
    
    // First check policy routes to understand the purpose of each table
    const policyRoutes = {};
    if (policyRoute) {
        for (const policyName in policyRoute) {
            const policy = policyRoute[policyName];
            
            if (policy.rule) {
                for (const ruleId in policy.rule) {
                    const rule = policy.rule[ruleId];
                    
                    if (rule.set && rule.set.table) {
                        const tableId = rule.set.table;
                        
                        if (!policyRoutes[tableId]) {
                            policyRoutes[tableId] = [];
                        }
                        
                        // Add the policy information
                        policyRoutes[tableId].push({
                            policyName: policyName,
                            ruleId: ruleId,
                            sourceGroup: rule.source?.group?.['network-group'] || null,
                            destinationGroup: rule.destination?.group?.['network-group'] || null,
                            interface: policy.interface || null
                        });
                    }
                }
            }
        }
    }
    
    // Get WireGuard interfaces using the robust getter function
    const wireguardInterfaces = getWireguardInterfaces(data);
    const wireguardInterfaceNames = Object.keys(wireguardInterfaces);
    
    // Process each table
    for (const tableName in tables) {
        const tableData = tables[tableName];
        let routeCount = 0;
        let vpnInterface = '';
        const routeDetails = [];
        
        // Count IPv4 routes
        if (tableData.route) {
            routeCount += Object.keys(tableData.route).length;
            
            // Check for VPN interface and collect route details
            for (const route in tableData.route) {
                const routeData = tableData.route[route];
                
                if (routeData.interface) {
                    for (const interfaceName in routeData.interface) {
                        // Check if this is a wireguard interface
                        if (wireguardInterfaceNames.includes(interfaceName) || interfaceName.startsWith('wg')) {
                            vpnInterface = interfaceName;
                            
                            // Add route details
                            routeDetails.push({
                                destination: route,
                                type: 'IPv4',
                                interface: interfaceName,
                                nextHop: routeData['next-hop'] ? Object.keys(routeData['next-hop'])[0] : null
                            });
                        }
                    }
                } else if (routeData['next-hop']) {
                    // If no interface but has next-hop
                    const nextHop = Object.keys(routeData['next-hop'])[0];
                    routeDetails.push({
                        destination: route,
                        type: 'IPv4',
                        interface: '',
                        nextHop: nextHop
                    });
                }
            }
        }
        
        // Count IPv6 routes
        if (tableData.route6) {
            routeCount += Object.keys(tableData.route6).length;
            
            // Check for VPN interface if not found yet and collect route details
            for (const route in tableData.route6) {
                const routeData = tableData.route6[route];
                
                if (routeData.interface) {
                    for (const interfaceName in routeData.interface) {
                        // Check if this is a wireguard interface
                        if ((wireguardInterfaceNames.includes(interfaceName) || interfaceName.startsWith('wg')) && !vpnInterface) {
                            vpnInterface = interfaceName;
                        }
                        
                        // Add route details
                        routeDetails.push({
                            destination: route,
                            type: 'IPv6',
                            interface: interfaceName,
                            nextHop: routeData['next-hop'] ? Object.keys(routeData['next-hop'])[0] : null
                        });
                    }
                } else if (routeData['next-hop']) {
                    // If no interface but has next-hop
                    const nextHop = Object.keys(routeData['next-hop'])[0];
                    routeDetails.push({
                        destination: route,
                        type: 'IPv6',
                        interface: '',
                        nextHop: nextHop
                    });
                }
            }
        }
        
        // Only include tables that have a VPN interface
        if (vpnInterface || routeDetails.some(r => wireguardInterfaceNames.includes(r.interface) || r.interface.startsWith('wg'))) {
            // Get policies that use this table
            const policies = policyRoutes[tableName] || [];
            
            // Generate a better description based on all collected data
            let description = '';
            
            if (policies.length > 0) {
                const policy = policies[0]; // Use the first policy for the description
                
                if (policy.sourceGroup) {
                    description = `Traffic from ${policy.sourceGroup} network group`;
                } else if (policy.interface) {
                    description = `Traffic from ${policy.interface} interface`;
                } else {
                    description = `Policy route: ${policy.policyName}`;
                }
            } else {
                description = vpnInterface ? `Traffic via ${vpnInterface}` : 'Custom routing table';
            }
            
            // Check if this table routes all traffic to VPN
            let routesAllTraffic = false;
            for (const route of routeDetails) {
                if ((route.destination === '0.0.0.0/0' || route.destination === '::/0') && 
                    route.interface && (wireguardInterfaceNames.includes(route.interface) || route.interface.startsWith('wg'))) {
                    routesAllTraffic = true;
                    break;
                }
            }
            
            routeTables.push({
                name: tableName,
                routeCount,
                vpnInterface,
                description,
                policies,
                routeDetails,
                routesAllTraffic
            });
        }
    }
    
    // If no route tables were found or none are VPN-related
    if (routeTables.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 4;
        emptyCell.className = 'text-center';
        emptyCell.textContent = 'No VPN routing tables configured';
        emptyRow.appendChild(emptyCell);
        tableBody.appendChild(emptyRow);
        return;
    }
    
    console.log(`Found ${routeTables.length} VPN routing tables`);
    
    // Create rows for each route table
    for (const table of routeTables) {
        const row = document.createElement('tr');
        
        // Table name
        const nameCell = document.createElement('td');
        nameCell.textContent = table.name;
        
        // Add a badge if this routes all traffic
        if (table.routesAllTraffic) {
            const badge = document.createElement('span');
            badge.className = 'badge bg-warning text-dark ms-2';
            badge.innerHTML = '<i class="bi bi-globe"></i> Full Tunnel';
            nameCell.appendChild(badge);
        }
        
        row.appendChild(nameCell);
        
        // Route count
        const countCell = document.createElement('td');
        
        // Create a button to toggle route details
        const countBtn = document.createElement('button');
        countBtn.className = 'btn btn-sm btn-outline-primary';
        countBtn.textContent = `${table.routeCount} routes`;
        
        // Create details div (initially hidden)
        const detailsId = `route-details-${table.name}`;
        const detailsDiv = document.createElement('div');
        detailsDiv.id = detailsId;
        detailsDiv.className = 'route-details mt-2 d-none';
        
        // Add route details to the div
        if (table.routeDetails.length > 0) {
            const detailsList = document.createElement('ul');
            detailsList.className = 'mb-0 ps-3 small';
            
            for (const route of table.routeDetails) {
                const li = document.createElement('li');
                let routeText = `${route.destination}`;
                
                if (route.interface) {
                    routeText += ` via ${route.interface}`;
                }
                
                if (route.nextHop) {
                    routeText += ` → ${route.nextHop}`;
                }
                
                // Highlight special routes
                if (route.destination === '0.0.0.0/0') {
                    routeText += ' (Default IPv4 route)';
                } else if (route.destination === '::/0') {
                    routeText += ' (Default IPv6 route)';
                }
                
                li.textContent = routeText;
                detailsList.appendChild(li);
            }
            
            detailsDiv.appendChild(detailsList);
        } else {
            detailsDiv.textContent = 'No detailed route information available';
        }
        
        // Set up toggle behavior
        countBtn.onclick = function() {
            const detailsElement = document.getElementById(detailsId);
            if (detailsElement.classList.contains('d-none')) {
                detailsElement.classList.remove('d-none');
                this.textContent = `Hide ${table.routeCount} routes`;
            } else {
                detailsElement.classList.add('d-none');
                this.textContent = `${table.routeCount} routes`;
            }
        };
        
        countCell.appendChild(countBtn);
        countCell.appendChild(detailsDiv);
        row.appendChild(countCell);
        
        // Interface
        const interfaceCell = document.createElement('td');
        if (table.vpnInterface) {
            interfaceCell.innerHTML = `<span class="badge bg-primary">${table.vpnInterface}</span>`;
        } else {
            interfaceCell.textContent = 'None';
        }
        row.appendChild(interfaceCell);
        
        // Description
        const descCell = document.createElement('td');
        descCell.textContent = table.description;
        
        // Add policy details if available
        if (table.policies.length > 0) {
            const policySpan = document.createElement('span');
            policySpan.className = 'badge bg-info ms-2';
            policySpan.textContent = `Policy: ${table.policies[0].policyName}`;
            descCell.appendChild(policySpan);
            
            // Add tooltip with more details if there are multiple policies
            if (table.policies.length > 1) {
                const moreSpan = document.createElement('span');
                moreSpan.className = 'badge bg-secondary ms-1';
                moreSpan.textContent = `+${table.policies.length - 1} more`;
                moreSpan.title = `Additional policies: ${table.policies.slice(1).map(p => p.policyName).join(', ')}`;
                descCell.appendChild(moreSpan);
            }
        }
        
        row.appendChild(descCell);
        
        tableBody.appendChild(row);
    }
}

/**
 * Show a modal with detailed information about a peer
 */
function showPeerDetailsModal(interfaceName, peerName, peerData) {
    // Create modal elements if they don't exist
    let modal = document.getElementById('peerDetailsModal');
    
    if (!modal) {
        // Create the modal
        modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'peerDetailsModal';
        modal.tabIndex = '-1';
        modal.setAttribute('aria-labelledby', 'peerDetailsModalLabel');
        modal.setAttribute('aria-hidden', 'true');
        
        // Create modal HTML structure
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="peerDetailsModalLabel">Peer Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" id="peerDetailsModalBody">
                        <!-- Content will be inserted here -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modal);
    }
    
    // Get the modal body
    const modalBody = document.getElementById('peerDetailsModalBody');
    modalBody.innerHTML = '';
    
    // Check if we have peer data
    if (!peerData) {
        modalBody.innerHTML = '<div class="alert alert-danger">Error: Peer data not available</div>';
        return;
    }
    
    // Set the modal title
    document.getElementById('peerDetailsModalLabel').textContent = `Peer Details: ${peerName}`;
    
    // Create content sections
    const basicInfoSection = document.createElement('div');
    basicInfoSection.className = 'mb-4';
    
    // Basic info header
    const basicInfoHeader = document.createElement('h5');
    basicInfoHeader.className = 'border-bottom pb-2 mb-3';
    basicInfoHeader.innerHTML = `<i class="bi bi-info-circle me-2"></i>Basic Information`;
    basicInfoSection.appendChild(basicInfoHeader);
    
    // Create info table
    const infoTable = document.createElement('table');
    infoTable.className = 'table';
    
    const tbody = document.createElement('tbody');
    
    // Add rows for basic info
    const infoRows = [
        { label: 'Peer Name', value: peerName },
        { label: 'Interface', value: interfaceName },
        { label: 'Public Key', value: peerData['public-key'] || 'N/A', copy: true },
        { label: 'Endpoint', value: peerData.address ? 
            (peerData.port ? `${peerData.address}:${peerData.port}` : peerData.address) : 'N/A' }
    ];
    
    // Add each row to the table
    infoRows.forEach(row => {
        const tr = document.createElement('tr');
        
        const th = document.createElement('th');
        th.style.width = '200px';
        th.textContent = row.label;
        tr.appendChild(th);
        
        const td = document.createElement('td');
        
        // If copyable, create a special field with copy button
        if (row.copy && row.value !== 'N/A') {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'input-group';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control';
            input.value = row.value;
            input.readOnly = true;
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'btn btn-outline-secondary';
            copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
            copyBtn.onclick = function() {
                navigator.clipboard.writeText(input.value)
                    .then(() => {
                        this.innerHTML = '<i class="bi bi-check"></i>';
                        setTimeout(() => {
                            this.innerHTML = '<i class="bi bi-clipboard"></i>';
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Could not copy text: ', err);
                        alert('Failed to copy');
                    });
            };
            
            inputGroup.appendChild(input);
            inputGroup.appendChild(copyBtn);
            td.appendChild(inputGroup);
        } else {
            td.textContent = row.value;
        }
        
        tr.appendChild(td);
        tbody.appendChild(tr);
    });
    
    infoTable.appendChild(tbody);
    basicInfoSection.appendChild(infoTable);
    modalBody.appendChild(basicInfoSection);
    
    // Create allowed IPs section
    const allowedIpsSection = document.createElement('div');
    allowedIpsSection.className = 'mb-4';
    
    // Allowed IPs header
    const allowedIpsHeader = document.createElement('h5');
    allowedIpsHeader.className = 'border-bottom pb-2 mb-3';
    allowedIpsHeader.innerHTML = `<i class="bi bi-diagram-3 me-2"></i>Allowed IP Addresses`;
    allowedIpsSection.appendChild(allowedIpsHeader);
    
    // Normalize allowed IPs to array format
    let allowedIps = [];
    if (peerData['allowed-ips']) {
        // Handle both string and array formats
        if (Array.isArray(peerData['allowed-ips'])) {
            allowedIps = peerData['allowed-ips'];
        } else if (typeof peerData['allowed-ips'] === 'string') {
            // Split by comma if it contains commas, otherwise treat as single value
            if (peerData['allowed-ips'].includes(',')) {
                allowedIps = peerData['allowed-ips'].split(',').map(ip => ip.trim());
            } else {
                allowedIps = [peerData['allowed-ips']];
            }
        }
    }
    
    // Add allowed IPs list
    if (allowedIps.length > 0) {
        const ipListGroup = document.createElement('div');
        ipListGroup.className = 'list-group';
        
        allowedIps.forEach(ip => {
            const ipItem = document.createElement('div');
            ipItem.className = 'list-group-item';
            
            // Special styling for default routes
            if (ip === '0.0.0.0/0' || ip === '::/0') {
                ipItem.classList.add('list-group-item-warning');
                
                // Add a small badge
                const badge = document.createElement('span');
                badge.className = 'badge bg-warning text-dark float-end';
                badge.textContent = ip === '0.0.0.0/0' ? 'All IPv4 Traffic' : 'All IPv6 Traffic';
                
                ipItem.textContent = ip + ' ';
                ipItem.appendChild(badge);
            } else {
                ipItem.textContent = ip;
            }
            
            ipListGroup.appendChild(ipItem);
        });
        
        allowedIpsSection.appendChild(ipListGroup);
    } else {
        const noIps = document.createElement('p');
        noIps.className = 'text-muted';
        noIps.textContent = 'No allowed IPs configured';
        allowedIpsSection.appendChild(noIps);
    }
    
    modalBody.appendChild(allowedIpsSection);
    
    // Create options section
    const optionsSection = document.createElement('div');
    optionsSection.className = 'mb-4';
    
    // Options header
    const optionsHeader = document.createElement('h5');
    optionsHeader.className = 'border-bottom pb-2 mb-3';
    optionsHeader.innerHTML = `<i class="bi bi-gear me-2"></i>Tunnel Options`;
    optionsSection.appendChild(optionsHeader);
    
    // Create options list
    const optionList = document.createElement('ul');
    optionList.className = 'list-group';
    
    // Keepalive
    const keepaliveItem = document.createElement('li');
    keepaliveItem.className = 'list-group-item d-flex justify-content-between align-items-center';
    keepaliveItem.innerHTML = `<span><strong>Persistent Keepalive:</strong></span>`;
    
    const keepaliveValue = document.createElement('span');
    keepaliveValue.textContent = peerData['persistent-keepalive'] ? 
        `${peerData['persistent-keepalive']} seconds` : 'Not configured';
    keepaliveItem.appendChild(keepaliveValue);
    optionList.appendChild(keepaliveItem);
    
    // MTU (from interface)
    const mtuItem = document.createElement('li');
    mtuItem.className = 'list-group-item d-flex justify-content-between align-items-center';
    mtuItem.innerHTML = `<span><strong>MTU:</strong></span>`;
    mtuItem.appendChild(document.createTextNode(peerData.mtu || 'Default'));
    optionList.appendChild(mtuItem);
    
    optionsSection.appendChild(optionList);
    modalBody.appendChild(optionsSection);
    
    // Initialize the Bootstrap modal
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

// Export functions for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initDashboardVpnIntegration
    };
} 