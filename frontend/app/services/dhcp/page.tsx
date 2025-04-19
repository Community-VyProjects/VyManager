"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, RefreshCw, Clock, Database, Network, Plus, Server } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { executeSavingMethod } from "../../utils"

interface DHCPLease {
  ip_address: string
  mac_address: string
  state: string
  lease_start: string
  lease_end: string
  remaining: string
  pool: string
  hostname: string
  origin: string
}

interface SubnetVisualizationProps {
  leases: DHCPLease[]
  subnet: string
  totalIPs: number
}

// Component to visualize IP usage in a subnet
const SubnetVisualization = ({ leases, subnet, totalIPs }: SubnetVisualizationProps) => {
  // Calculate base IP and extract subnet details
  const [baseIP, mask] = subnet.split('/');
  const baseIPParts = baseIP.split('.').map(part => parseInt(part));
  const maskBits = parseInt(mask);
  
  // Calculate usable IPs (excluding network and broadcast addresses)
  const usableIPs = totalIPs - 2;
  const usedIPs = leases.length;
  const availableIPs = usableIPs - usedIPs;
  const usagePercentage = Math.round((usedIPs / usableIPs) * 100);
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(0);
  const ipsPerPage = 50;
  const totalPages = Math.ceil(usableIPs / ipsPerPage);
  
  // Function to check if an IP is in the subnet
  const isIPInSubnet = (ip: string): boolean => {
    const ipParts = ip.split('.').map(part => parseInt(part));
    // Simple check - just compare the first two octets for Class C
    // This is a simplification - in a real app we'd do proper subnet math
    return ipParts[0] === baseIPParts[0] && ipParts[1] === baseIPParts[1];
  };
  
  // Get all IPs in use from the leases that are in this subnet
  const usedIPAddresses = leases
    .filter(lease => isIPInSubnet(lease.ip_address))
    .map(lease => lease.ip_address);
  
  // Function to generate the actual IP address from the base subnet and offset
  const getIPAddressFromOffset = (offset: number): string => {
    // Skip network address (offset 0) and broadcast address (last address)
    // Real implementation would use proper subnet math
    const lastOctetBase = baseIPParts[3];
    const newLastOctet = (lastOctetBase + offset + 1) % 256; // +1 to skip network address
    return `${baseIPParts[0]}.${baseIPParts[1]}.${baseIPParts[2]}.${newLastOctet}`;
  };
  
  // Function to check if IP is used based on address
  const isIPUsed = (ipAddress: string): boolean => {
    return usedIPAddresses.includes(ipAddress);
  };
  
  // Function to determine IP status (simplified - in reality we'd also check for reserved IPs)
  const getIPStatus = (ipAddress: string): 'used' | 'reserved' | 'available' => {
    if (isIPUsed(ipAddress)) return 'used';
    
    // Example of how we might detect reserved IPs - in a real app this would come from the API
    // This is simplified for demonstration - assuming some specific IPs are reserved
    const lastOctet = parseInt(ipAddress.split('.')[3]);
    if (lastOctet <= 10 || lastOctet >= 245) return 'reserved';
    
    return 'available';
  };
  
  // Generate the range of IPs to display for the current page
  const startIndex = currentPage * ipsPerPage;
  const endIndex = Math.min(startIndex + ipsPerPage, usableIPs);
  
  // Handle page changes
  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };
  
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };
  
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-cyan-400 flex items-center gap-2">
          <Network className="h-5 w-5" />
          Subnet Usage: {subnet}
        </CardTitle>
        <CardDescription className="text-slate-400">
          {usedIPs} of {usableIPs} IPs in use ({usagePercentage}% utilization)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Subnet utilization bar */}
          <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-cyan-600 h-full" 
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-sm">
            <div>
              <span className="text-cyan-400 font-medium">{usedIPs}</span>
              <span className="text-slate-400 ml-1">Used</span>
            </div>
            <div>
              <span className="text-amber-400 font-medium">{availableIPs}</span>
              <span className="text-slate-400 ml-1">Available</span>
            </div>
            <div>
              <span className="text-slate-300 font-medium">{usableIPs}</span>
              <span className="text-slate-400 ml-1">Total Usable</span>
            </div>
          </div>
          
          {/* IP Address grid visualization */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">IP Address Map</h3>
              <div className="flex items-center space-x-2 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-cyan-900 mr-1"></div>
                  <span className="text-slate-400">Used</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-amber-800 mr-1"></div>
                  <span className="text-slate-400">Reserved</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-slate-700 mr-1"></div>
                  <span className="text-slate-400">Available</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: endIndex - startIndex }).map((_, i) => {
                const ipIndex = startIndex + i;
                const ipAddress = getIPAddressFromOffset(ipIndex);
                const status = getIPStatus(ipAddress);
                const lastOctet = ipAddress.split('.')[3];
                
                return (
                  <div 
                    key={i} 
                    className={`h-8 rounded flex items-center justify-center text-xs font-mono 
                      ${status === 'used' ? 'bg-cyan-900 text-cyan-200' : 
                        status === 'reserved' ? 'bg-amber-800 text-amber-200' : 
                        'bg-slate-700 text-slate-400'}`}
                    title={`${ipAddress} (${status})`}
                  >
                    {lastOctet}
                  </div>
                );
              })}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={goToPreviousPage}
                  disabled={currentPage === 0}
                  className="bg-slate-700 text-slate-200 hover:bg-slate-600"
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-400">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages - 1}
                  className="bg-slate-700 text-slate-200 hover:bg-slate-600"
                >
                  Next
                </Button>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-2">Showing IPs {startIndex + 1} to {endIndex} (excluding network and broadcast addresses)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DhcpPage() {
  const [leases, setLeases] = useState<Record<string, DHCPLease[]>>({});
  const [dhcpConfig, setDhcpConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("leases");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [serviceStatus, setServiceStatus] = useState({ active: false });
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  const fetchData = async () => {
    executeSavingMethod();
    setIsRefreshing(true);
    try {
      // Fetch DHCP leases
      const leaseResponse = await fetch(`${apiUrl}/api/dhcp/leases`);
      
      if (!leaseResponse.ok) {
        throw new Error(`API error: ${leaseResponse.status}`);
      }
      
      const leaseData = await leaseResponse.json();
      
      if (leaseData.success) {
        setLeases(leaseData.leases);
      } else {
        throw new Error(leaseData.error || 'Failed to load DHCP leases');
      }
      
      // Fetch VyOS configuration
      const configResponse = await fetch(`${apiUrl}/api/config`);
      
      if (!configResponse.ok) {
        throw new Error(`Config API error: ${configResponse.status}`);
      }
      
      const configData = await configResponse.json();
      
      if (configData.success) {
        const dhcpServerConfig = configData.data.service?.['dhcp-server'] || null;
        setDhcpConfig(dhcpServerConfig);
        
        // If DHCP server config exists, consider the service active
        setServiceStatus({ active: !!dhcpServerConfig });
      } else {
        throw new Error(configData.error || 'Failed to load VyOS configuration');
      }
      
      // Try to fetch DHCP service status
      try {
        const statusResponse = await fetch(`${apiUrl}/api/service/status/dhcp`);
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.success) {
            setServiceStatus(statusData.data);
          }
        }
        // Silently fail - we'll use config-based detection as fallback
      } catch (statusError) {
        console.log("Could not get DHCP service status, using config-based detection");
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        variant: "destructive",
        title: "Error loading DHCP data",
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Initial data loading
  useEffect(() => {
    fetchData();
  }, []);
  
  // Total leases count across all pools
  const totalLeases = Object.values(leases).reduce((count, poolLeases) => count + poolLeases.length, 0);
  
  // Helper to format date/time
  const formatDateTime = (dateTimeStr: string) => {
    try {
      const [date, time] = dateTimeStr.split(' ');
      return `${date} ${time}`;
    } catch (error) {
      return dateTimeStr;
    }
  };
  
  // Parse DHCP configuration from VyOS config
  const getDhcpNetworks = () => {
    if (!dhcpConfig || !dhcpConfig['shared-network-name']) {
      return [];
    }
    
    const networks = [];
    
    for (const [networkName, networkConfig] of Object.entries<any>(dhcpConfig['shared-network-name'])) {
      if (networkConfig.subnet) {
        for (const [subnet, subnetConfig] of Object.entries<any>(networkConfig.subnet)) {
          // Calculate total IPs based on subnet mask
          const [_, mask] = subnet.split('/');
          const totalIPs = Math.pow(2, 32 - parseInt(mask));
          
          // Get range details
          let rangeStart = '';
          let rangeStop = '';
          
          if (subnetConfig.range && subnetConfig.range['0']) {
            rangeStart = subnetConfig.range['0'].start || '';
            rangeStop = subnetConfig.range['0'].stop || '';
          }
          
          networks.push({
            name: networkName,
            subnet,
            totalIPs,
            defaultRouter: subnetConfig['default-router'] || '',
            domainName: subnetConfig['domain-name'] || '',
            nameServer: subnetConfig['name-server'] || '',
            rangeStart,
            rangeStop
          });
        }
      }
    }
    
    return networks;
  };
  
  // Get pool-specific subnet information
  const getPoolSubnet = (poolName: string) => {
    const networks = getDhcpNetworks();
    const networkConfig = networks.find(network => network.name === poolName);
    
    if (networkConfig) {
      return {
        subnet: networkConfig.subnet,
        totalIPs: networkConfig.totalIPs,
        rangeStart: networkConfig.rangeStart,
        rangeStop: networkConfig.rangeStop
      };
    }
    
    // Fallback for now
    return { subnet: '0.0.0.0/0', totalIPs: 0, rangeStart: '', rangeStop: '' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading DHCP configuration...</p>
        </div>
      </div>
    );
  }

  const dhcpNetworks = getDhcpNetworks();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">DHCP Server</h1>
          <p className="text-slate-400">Manage DHCP services and view active leases</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            onClick={fetchData}
            disabled={isRefreshing}
          >
            {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">
        <Card className="bg-slate-800 border-slate-700 xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-cyan-400">Active DHCP Leases</CardTitle>
            <CardDescription className="text-slate-400">
              {totalLeases} active leases across all pools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start mb-4">
                <TabsTrigger value="leases" className="flex-1">
                  <Database className="h-4 w-4 mr-2" />
                  Active Leases
                </TabsTrigger>
                <TabsTrigger value="pools" className="flex-1">
                  <Network className="h-4 w-4 mr-2" />
                  DHCP Pools
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="leases" className="space-y-4">
                {Object.entries(leases).length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p>No active DHCP leases found</p>
                  </div>
                ) : (
                  Object.entries(leases).map(([poolName, poolLeases]) => (
                    <div key={poolName} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-medium">
                          {poolName} Pool
                          <Badge className="ml-2 bg-cyan-700">{poolLeases.length} Leases</Badge>
                        </h3>
                      </div>
                      
                      <Table>
                        <TableHeader className="bg-slate-900">
                          <TableRow>
                            <TableHead className="text-cyan-400">IP Address</TableHead>
                            <TableHead className="text-cyan-400">Hostname</TableHead>
                            <TableHead className="text-cyan-400">MAC Address</TableHead>
                            <TableHead className="text-cyan-400">Lease End</TableHead>
                            <TableHead className="text-cyan-400">Remaining</TableHead>
                            <TableHead className="text-cyan-400">State</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {poolLeases.map((lease, idx) => (
                            <TableRow key={idx} className="hover:bg-slate-700/50">
                              <TableCell className="font-medium text-slate-200">{lease.ip_address}</TableCell>
                              <TableCell className="text-slate-300">{lease.hostname || 'Unknown'}</TableCell>
                              <TableCell className="font-mono text-xs text-slate-300">{lease.mac_address}</TableCell>
                              <TableCell className="text-slate-300">{formatDateTime(lease.lease_end)}</TableCell>
                              <TableCell className="text-slate-300">{lease.remaining}</TableCell>
                              <TableCell>
                                <Badge 
                                  className={`${
                                    lease.state === 'active' 
                                      ? 'bg-green-700 hover:bg-green-800' 
                                      : 'bg-amber-700 hover:bg-amber-800'
                                  }`}
                                >
                                  {lease.state}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="pools" className="space-y-4">
                {dhcpNetworks.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p>No DHCP pools configured</p>
                  </div>
                ) : (
                  dhcpNetworks.map((network, idx) => (
                    <Card key={idx} className="bg-slate-900 border-slate-700">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-cyan-400">{network.name} Network</CardTitle>
                        <CardDescription className="text-slate-400">
                          Subnet: {network.subnet}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-slate-300 mb-2">Network Settings</h4>
                            <dl className="space-y-2">
                              <div className="flex justify-between">
                                <dt className="text-sm text-slate-400">Default Router</dt>
                                <dd className="text-sm font-medium text-slate-200">{network.defaultRouter || 'Not set'}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-sm text-slate-400">Domain Name</dt>
                                <dd className="text-sm font-medium text-slate-200">{network.domainName || 'Not set'}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-sm text-slate-400">Name Server</dt>
                                <dd className="text-sm font-medium text-slate-200">{network.nameServer || 'Not set'}</dd>
                              </div>
                            </dl>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-slate-300 mb-2">IP Range</h4>
                            <dl className="space-y-2">
                              <div className="flex justify-between">
                                <dt className="text-sm text-slate-400">Start IP</dt>
                                <dd className="text-sm font-medium text-slate-200">{network.rangeStart}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-sm text-slate-400">End IP</dt>
                                <dd className="text-sm font-medium text-slate-200">{network.rangeStop}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-sm text-slate-400">Available IPs</dt>
                                <dd className="text-sm font-medium text-slate-200">
                                  {network.rangeStart && network.rangeStop ? 
                                    calculateIPRange(network.rangeStart, network.rangeStop) : 
                                    'Unknown'}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                <Server className="h-5 w-5" />
                Service Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md bg-slate-900 p-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Status</span>
                    <Badge className={serviceStatus.active ? "bg-green-700" : "bg-red-700"}>
                      {serviceStatus.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Pools Configured</span>
                    <span className="text-white font-medium">{dhcpNetworks.length}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Active Leases</span>
                    <span className="text-white font-medium">{totalLeases}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Lease Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Total Active Leases</span>
                    <span className="text-white font-medium">{totalLeases}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">DHCP Pools</span>
                    <span className="text-white font-medium">{dhcpNetworks.length}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Total Configured IPs</span>
                    <span className="text-white font-medium">
                      {dhcpNetworks.reduce((total, network) => 
                        total + (network.rangeStart && network.rangeStop ? 
                          calculateIPRange(network.rangeStart, network.rangeStop) : 0), 0)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Button 
            className="w-full bg-cyan-600 hover:bg-cyan-700"
            disabled={true}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add DHCP Pool
          </Button>
        </div>
      </div>
      
      {/* Subnet visualizations */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Subnet Utilization</h2>
        {Object.entries(leases).map(([poolName, poolLeases]) => {
          const { subnet, totalIPs, rangeStart, rangeStop } = getPoolSubnet(poolName);
          const matchingNetwork = dhcpNetworks.find(n => n.name === poolName);
          
          // Skip if we don't have a valid subnet
          if (subnet === '0.0.0.0/0' || !matchingNetwork) return null;
          
          return (
            <EnhancedSubnetVisualization 
              key={poolName}
              leases={poolLeases}
              subnet={subnet}
              totalIPs={totalIPs}
              rangeStart={rangeStart}
              rangeStop={rangeStop}
              defaultRouter={matchingNetwork.defaultRouter}
            />
          );
        })}
      </div>
    </div>
  );
}

// Helper function to calculate number of IPs in a range
function calculateIPRange(startIP: string, endIP: string): number {
  // Convert IP to numeric value
  function ipToNumber(ip: string): number {
    return ip.split('.')
      .reduce((sum, octet, index) => sum + (parseInt(octet) * Math.pow(256, 3 - index)), 0);
  }
  
  const start = ipToNumber(startIP);
  const end = ipToNumber(endIP);
  
  return end - start + 1;
}

// Enhanced subnet visualization component that supports range information
interface EnhancedSubnetVisualizationProps extends SubnetVisualizationProps {
  rangeStart: string;
  rangeStop: string;
  defaultRouter: string;
}

const EnhancedSubnetVisualization = ({ 
  leases, 
  subnet, 
  totalIPs, 
  rangeStart,
  rangeStop,
  defaultRouter
}: EnhancedSubnetVisualizationProps) => {
  // Calculate base IP and extract subnet details
  const [baseIP, mask] = subnet.split('/');
  const baseIPParts = baseIP.split('.').map(part => parseInt(part));
  const maskBits = parseInt(mask);
  
  // Calculate usable IPs (excluding network and broadcast addresses)
  const usableIPs = totalIPs - 2;
  const usedIPs = leases.length;
  const availableIPs = usableIPs - usedIPs;
  const usagePercentage = Math.round((usedIPs / usableIPs) * 100);
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(0);
  const ipsPerPage = 50;
  const totalPages = Math.ceil(usableIPs / ipsPerPage);
  
  // Function to check if an IP is in the subnet
  const isIPInSubnet = (ip: string): boolean => {
    const ipParts = ip.split('.').map(part => parseInt(part));
    
    // Simple check for class C networks (we'd need more complex logic for other networks)
    return ipParts[0] === baseIPParts[0] && 
           ipParts[1] === baseIPParts[1] && 
           ipParts[2] === baseIPParts[2];
  };
  
  // Get all IPs in use from the leases that are in this subnet
  const usedIPAddresses = leases
    .filter(lease => isIPInSubnet(lease.ip_address))
    .map(lease => lease.ip_address);
  
  // Convert IP range to numbers for comparison
  function ipToNumber(ip: string): number {
    return ip.split('.')
      .reduce((sum, octet, index) => sum + (parseInt(octet) * Math.pow(256, 3 - index)), 0);
  }
  
  const rangeStartNum = rangeStart ? ipToNumber(rangeStart) : 0;
  const rangeStopNum = rangeStop ? ipToNumber(rangeStop) : 0;
  const defaultRouterNum = defaultRouter ? ipToNumber(defaultRouter) : 0;
  
  // Function to generate the actual IP address for a subnet position
  const getIPAddressForPosition = (position: number): string => {
    // Network address is at position 0
    // Broadcast address is at position totalIPs - 1
    
    // Calculate actual IP (assuming class C for simplicity)
    const octet = baseIPParts[3] + position;
    return `${baseIPParts[0]}.${baseIPParts[1]}.${baseIPParts[2]}.${octet}`;
  };
  
  // Function to check if IP is used based on address
  const isIPUsed = (ipAddress: string): boolean => {
    return usedIPAddresses.includes(ipAddress);
  };
  
  // Function to determine IP status 
  const getIPStatus = (ipAddress: string, ipNum: number): 'used' | 'reserved' | 'router' | 'out-of-range' | 'available' => {
    // Check if this is the default router
    if (ipAddress === defaultRouter) return 'router';
    
    // Check if this IP is used by a client
    if (isIPUsed(ipAddress)) return 'used';
    
    // Check if this IP is outside the DHCP range
    if (rangeStartNum && rangeStopNum) {
      if (ipNum < rangeStartNum || ipNum > rangeStopNum) {
        return 'out-of-range';
      }
    }
    
    // Reserved IPs (this is a simplified approach - in reality would come from config)
    const lastOctet = parseInt(ipAddress.split('.')[3]);
    if (lastOctet <= 10 && ipAddress !== defaultRouter) return 'reserved';
    
    return 'available';
  };
  
  // Generate the range of IPs to display for the current page
  const startIndex = currentPage * ipsPerPage;
  // Adjust for network address (position 0)
  const startPosition = startIndex + 1; // Skip network address
  const endPosition = Math.min(startPosition + ipsPerPage, totalIPs - 1); // Skip broadcast address
  
  // Handle page changes
  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };
  
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };
  
  // Get status color class
  const getStatusColorClass = (status: string): string => {
    switch (status) {
      case 'used': return 'bg-cyan-900 text-cyan-200';
      case 'reserved': return 'bg-amber-800 text-amber-200';
      case 'router': return 'bg-purple-800 text-purple-200';
      case 'out-of-range': return 'bg-slate-600 text-slate-300';
      default: return 'bg-slate-700 text-slate-400';
    }
  };
  
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-cyan-400 flex items-center gap-2">
          <Network className="h-5 w-5" />
          Subnet Usage: {subnet}
        </CardTitle>
        <CardDescription className="text-slate-400">
          {usedIPs} of {usableIPs} IPs in use ({usagePercentage}% utilization)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Network details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-900 p-3 rounded">
            <div>
              <span className="text-xs text-slate-400 block">Router</span>
              <span className="text-sm font-medium text-white">{defaultRouter || 'Not Set'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">DHCP Range</span>
              <span className="text-sm font-medium text-white">
                {rangeStart && rangeStop ? `${rangeStart} - ${rangeStop}` : 'Not Set'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Assigned</span>
              <span className="text-sm font-medium text-white">{usedIPs} IPs</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Available</span>
              <span className="text-sm font-medium text-white">{availableIPs} IPs</span>
            </div>
          </div>
          
          {/* Subnet utilization bar */}
          <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-cyan-600 h-full" 
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
          
          {/* IP Address grid visualization */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">IP Address Map</h3>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-cyan-900 mr-1"></div>
                  <span className="text-slate-400">Used</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-amber-800 mr-1"></div>
                  <span className="text-slate-400">Reserved</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-800 mr-1"></div>
                  <span className="text-slate-400">Router</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-slate-600 mr-1"></div>
                  <span className="text-slate-400">Out of Range</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-slate-700 mr-1"></div>
                  <span className="text-slate-400">Available</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: endPosition - startPosition + 1 }).map((_, i) => {
                const position = startPosition + i;
                const ipAddress = getIPAddressForPosition(position);
                const ipNum = ipToNumber(ipAddress);
                const status = getIPStatus(ipAddress, ipNum);
                const lastOctet = ipAddress.split('.')[3];
                
                return (
                  <div 
                    key={i} 
                    className={`h-8 rounded flex items-center justify-center text-xs font-mono ${getStatusColorClass(status)}`}
                    title={`${ipAddress} (${status})`}
                  >
                    {lastOctet}
                  </div>
                );
              })}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={goToPreviousPage}
                  disabled={currentPage === 0}
                  className="bg-slate-700 text-slate-200 hover:bg-slate-600"
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-400">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages - 1}
                  className="bg-slate-700 text-slate-200 hover:bg-slate-600"
                >
                  Next
                </Button>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-2">
              Showing IPs {startPosition} to {endPosition} (excluding network and broadcast addresses)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 