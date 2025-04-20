"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { 
  Loader2, Network, Shield, Server, AlertCircle, Home, 
  Router, ArrowLeftRight, Computer, Smartphone, Database,
  ArrowDownUp, Route, Share2, Globe, Key, Wifi, ArrowDownToLine, ArrowUpFromLine
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { executeSavingMethod } from "../utils"

export default function DashboardPage() {
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [config, setConfig] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  
  const fetchConfig = async () => {
    executeSavingMethod();
    setIsLoadingConfig(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/config`);
      
      // Check if response is OK (status in the range 200-299)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `Server error: ${response.status} ${response.statusText}`
        }));
        
        console.error("Error response:", errorData);
        
        toast({
          variant: "destructive",
          title: "Error connecting to VyOS router",
          description: errorData.error || `Server returned ${response.status} ${response.statusText}`
        });
        
        setIsConnected(false);
        setIsLoadingConfig(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.success === true && data.data) {
        setConfig(data.data);
        setIsConnected(true);
        toast({
          title: "Configuration loaded",
          description: "Successfully loaded VyOS configuration"
        });
      } else {
        console.error("API error:", data);
        toast({
          variant: "destructive",
          title: "Error loading VyOS configuration",
          description: data.error || "Could not load VyOS configuration"
        });
        setIsConnected(false);
      }
    } catch (error) {
      console.error("Error fetching configuration:", error);
      toast({
        variant: "destructive",
        title: "Connection error",
        description: "Could not connect to the API server. Please check that the backend is running."
      });
      setIsConnected(false);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Calculate summary stats
  const getSummaryStats = () => {
    if (!config) return { 
      interfaces: 0, 
      firewallRules: 0, 
      services: 0,
      natRules: 0,
      firewallGroups: 0,
      staticRoutes: 0,
      dynamicRoutingProtocols: 0,
      containers: 0
    };
    
    // Count total interfaces
    const interfaceCount = Object.keys(config.interfaces || {}).reduce((acc, key) => {
      return acc + (typeof config.interfaces[key] === 'object' ? 
        Object.keys(config.interfaces[key]).length : 0);
    }, 0);
    
    // Count firewall rules
    const firewallRules = (config.firewall?.ipv4?.input?.filter?.rule 
      ? Object.keys(config.firewall.ipv4.input.filter.rule).length : 0)
      + (config.firewall?.ipv4?.output?.filter?.rule 
      ? Object.keys(config.firewall.ipv4.output.filter.rule || {}).length : 0)
      + (config.firewall?.ipv4?.forward?.filter?.rule 
      ? Object.keys(config.firewall.ipv4.forward.filter.rule || {}).length : 0)
      + (config.firewall?.ipv6?.input?.filter?.rule 
      ? Object.keys(config.firewall.ipv6.input.filter.rule || {}).length : 0)
      + (config.firewall?.ipv6?.output?.filter?.rule 
      ? Object.keys(config.firewall.ipv6.output.filter.rule || {}).length : 0)
      + (config.firewall?.ipv6?.forward?.filter?.rule 
      ? Object.keys(config.firewall.ipv6.forward.filter.rule || {}).length : 0);
    
    // Count services
    const serviceCount = Object.keys(config.service || {}).length;
       
    // Count containers
    const containerCount = Object.keys(config.container || {}).length;
    
    // Count NAT rules
    const sourceNatRules = config.nat?.source?.rule ? Object.keys(config.nat.source.rule).length : 0;
    const destNatRules = config.nat?.destination?.rule ? Object.keys(config.nat.destination.rule).length : 0;
    const natRules = sourceNatRules + destNatRules;
    
    // Count firewall groups
    const addressGroups = config.firewall?.group?.['address-group'] ? Object.keys(config.firewall.group['address-group']).length : 0;
    const networkGroups = config.firewall?.group?.['network-group'] ? Object.keys(config.firewall.group['network-group']).length : 0;
    const portGroups = config.firewall?.group?.['port-group'] ? Object.keys(config.firewall.group['port-group']).length : 0;
    const interfaceGroups = config.firewall?.group?.['interface-group'] ? Object.keys(config.firewall.group['interface-group']).length : 0;
    const ipv6NetworkGroups = config.firewall?.group?.['ipv6-network-group'] ? Object.keys(config.firewall.group['ipv6-network-group']).length : 0;
    const firewallGroups = addressGroups + networkGroups + portGroups + interfaceGroups + ipv6NetworkGroups;
    
    // Count static routes
    const staticRoutes = config.protocols?.static?.route ? Object.keys(config.protocols.static.route).length : 0;
    
    // Count dynamic routing protocols in use
    const dynamicRoutingProtocols = 
      (config.protocols?.bgp ? 1 : 0) + 
      (config.protocols?.ospf ? 1 : 0) + 
      (config.protocols?.rip ? 1 : 0) + 
      (config.protocols?.pim ? 1 : 0);
    
    return {
      interfaces: interfaceCount,
      firewallRules,
      services: serviceCount,
      containers: containerCount,
      natRules,
      firewallGroups,
      staticRoutes,
      dynamicRoutingProtocols
    };
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading VyOS configuration...</p>
        </div>
      </div>
    );
  }

  const stats = getSummaryStats();

  // Add navigation function
  const navigateToTab = (tab: string, e: React.MouseEvent) => {
    e.preventDefault();
    
    // Special case for firewall/groups
    if (tab === "firewall/groups") {
      window.history.pushState(null, '', `#firewall`);
      // Store the sub-section in sessionStorage to be picked up by the firewall page
      sessionStorage.setItem('firewallActiveTab', 'groups');
    } else {
      window.history.pushState(null, '', `#${tab}`);
    }
    
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  return (
    <div className="container p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 hidden md:block text-cyan-400">Dashboard</h1>
      
      {/* Connection status alert if disconnected */}
      {!isConnected && (
        <Alert variant="destructive" className="mb-6 bg-red-900 border-red-800 text-red-100">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Not connected to VyOS router. Some features may be unavailable.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg hover:shadow-cyan-900/20">
          <CardHeader className="pb-2 border-b border-slate-700">
            <CardTitle className="text-cyan-400">Interfaces</CardTitle>
            <CardDescription className="text-slate-400">Network connections</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-4xl font-bold text-white">{stats.interfaces}</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              variant="ghost" 
              className="w-full text-xs gap-1 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
              onClick={(e) => navigateToTab("interfaces", e)}
            >
              <Network className="h-3 w-3" />
              Manage interfaces
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg hover:shadow-amber-900/20">
          <CardHeader className="pb-2 border-b border-slate-700">
            <CardTitle className="text-amber-400">Firewall</CardTitle>
            <CardDescription className="text-slate-400">Security rules</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-4xl font-bold text-white">{stats.firewallRules}</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              variant="ghost" 
              className="w-full text-xs gap-1 text-amber-400 hover:text-amber-300 hover:bg-slate-800"
              onClick={(e) => navigateToTab("firewall", e)}
            >
              <Shield className="h-3 w-3" />
              Manage rules
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg hover:shadow-green-900/20">
          <CardHeader className="pb-2 border-b border-slate-700">
            <CardTitle className="text-green-400">Services</CardTitle>
            <CardDescription className="text-slate-400">Running services</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-4xl font-bold text-white">{stats.services}</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              variant="ghost" 
              className="w-full text-xs gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800"
              onClick={(e) => navigateToTab("services", e)}
            >
              <Server className="h-3 w-3" />
              Manage services
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg hover:shadow-amber-900/20">
          <CardHeader className="pb-2 border-b border-slate-700">
            <CardTitle className="text-purple-400">Containers</CardTitle>
            <CardDescription className="text-slate-400">Available containers and images</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-4xl font-bold text-white">{stats.containers}</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              variant="ghost" 
              className="w-full text-xs gap-1 text-purple-400 hover:text-purple-300 hover:bg-slate-800"
              onClick={(e) => navigateToTab("containers", e)}
            >
              <Shield className="h-3 w-3" />
              Manage containers
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4 mb-6">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg hover:shadow-purple-900/20">
          <CardHeader className="pb-2 border-b border-slate-700">
            <CardTitle className="text-purple-400">Routing</CardTitle>
            <CardDescription className="text-slate-400">
              Static & Dynamic Routing
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-slate-300">Static Routes</span>
              </div>
              <Badge className="bg-purple-800">{stats.staticRoutes}</Badge>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-slate-300">Dynamic Protocols</span>
              </div>
              <Badge className="bg-purple-800">{stats.dynamicRoutingProtocols}</Badge>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              variant="ghost" 
              className="w-full text-xs gap-1 text-purple-400 hover:text-purple-300 hover:bg-slate-800"
              onClick={(e) => navigateToTab("routing", e)}
            >
              <Route className="h-3 w-3" />
              Manage routing
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg hover:shadow-blue-900/20">
          <CardHeader className="pb-2 border-b border-slate-700">
            <CardTitle className="text-blue-400">NAT</CardTitle>
            <CardDescription className="text-slate-400">
              Network Address Translation
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownUp className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-slate-300">Source NAT</span>
              </div>
              <Badge className="bg-blue-800">{config.nat?.source?.rule ? Object.keys(config.nat.source.rule).length : 0}</Badge>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <ArrowDownUp className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-slate-300">Destination NAT</span>
              </div>
              <Badge className="bg-blue-800">{config.nat?.destination?.rule ? Object.keys(config.nat.destination.rule).length : 0}</Badge>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              variant="ghost" 
              className="w-full text-xs gap-1 text-blue-400 hover:text-blue-300 hover:bg-slate-800"
              onClick={(e) => navigateToTab("nat", e)}
            >
              <ArrowLeftRight className="h-3 w-3" />
              Manage NAT Rules
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg hover:shadow-amber-900/20">
          <CardHeader className="pb-2 border-b border-slate-700">
            <CardTitle className="text-amber-400">Firewall Groups</CardTitle>
            <CardDescription className="text-slate-400">
              Address and Network Groups
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Computer className="h-4 w-4 text-amber-400" />
                <span className="text-sm text-slate-300">Address Groups</span>
              </div>
              <Badge className="bg-amber-800">{config.firewall?.group?.['address-group'] ? Object.keys(config.firewall.group['address-group']).length : 0}</Badge>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-amber-400" />
                <span className="text-sm text-slate-300">Network Groups</span>
              </div>
              <Badge className="bg-amber-800">{config.firewall?.group?.['network-group'] ? Object.keys(config.firewall.group['network-group']).length : 0}</Badge>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-amber-400" />
                <span className="text-sm text-slate-300">Port Groups</span>
              </div>
              <Badge className="bg-amber-800">{config.firewall?.group?.['port-group'] ? Object.keys(config.firewall.group['port-group']).length : 0}</Badge>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              variant="ghost" 
              className="w-full text-xs gap-1 text-orange-400 hover:text-orange-300 hover:bg-slate-800"
              onClick={(e) => navigateToTab("firewall/groups", e)}
            >
              <Database className="h-3 w-3" />
              Manage Groups
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg hover:shadow-teal-900/20">
          <CardHeader className="pb-2 border-b border-slate-700">
            <CardTitle className="text-teal-400">VPN Services</CardTitle>
            <CardDescription className="text-slate-400">
              Secure Tunnels
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-teal-400" />
                <span className="text-sm text-slate-300">WireGuard</span>
              </div>
              <Badge className="bg-teal-800">{config.interfaces?.wireguard ? Object.keys(config.interfaces.wireguard).length : 0}</Badge>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-teal-400" />
                <span className="text-sm text-slate-300">WireGuard Peers</span>
              </div>
              <Badge className="bg-teal-800">
                {Object.values(config.interfaces?.wireguard || {}).reduce((total: number, wg: any) => 
                  total + (wg.peer ? Object.keys(wg.peer).length : 0), 0)
                }
              </Badge>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              variant="ghost" 
              className="w-full text-xs gap-1 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
              onClick={(e) => navigateToTab("vpn", e)}
            >
              <Globe className="h-3 w-3" />
              Manage VPN
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-1 bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-purple-400">System Information</CardTitle>
            <CardDescription className="text-slate-400">Router details and status</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {config?.system ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                  <span className="text-slate-400">Hostname</span>
                  <span className="font-medium text-white">{config.system['host-name'] || 'Not configured'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                  <span className="text-slate-400">Config Revisions</span>
                  <span className="font-medium text-white">{config.system['config-management']?.['commit-revisions'] || 'Default'}</span>
                </div>
                {config.system.login?.user && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-700">
                    <span className="text-slate-400">Users</span>
                    <span className="font-medium text-white">{Object.keys(config.system.login.user).length}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-400">System information not available</p>
            )}
          </CardContent>
        </Card>
        
        <Card className="md:col-span-1 bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-amber-400">Firewall Overview</CardTitle>
            <CardDescription className="text-slate-400">Security rules</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {config?.firewall ? (
              <div className="space-y-3">
                {/* Address Groups */}
                {config.firewall.group && config.firewall.group['address-group'] && (
                  <div className="flex items-start gap-2 p-2 rounded bg-slate-800">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5"></div>
                    <div>
                      <p className="text-sm text-white">Address Groups</p>
                      <p className="text-xs text-slate-400">
                        {Object.keys(config.firewall.group['address-group']).length} configured
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Network Groups */}
                {config.firewall.group && config.firewall.group['network-group'] && (
                  <div className="flex items-start gap-2 p-2 rounded bg-slate-800">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5"></div>
                    <div>
                      <p className="text-sm text-white">Network Groups</p>
                      <p className="text-xs text-slate-400">
                        {Object.keys(config.firewall.group['network-group']).length} configured
                      </p>
                    </div>
                  </div>
                )}
                
                {/* IPv4 Rules */}
                {config.firewall.ipv4 && (
                  <div className="flex items-start gap-2 p-2 rounded bg-slate-800">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
                    <div>
                      <p className="text-sm text-white">IPv4 Rules</p>
                      <p className="text-xs text-slate-400">
                        {(config.firewall.ipv4.forward?.filter?.rule ? Object.keys(config.firewall.ipv4.forward.filter.rule).length : 0) +
                         (config.firewall.ipv4.input?.filter?.rule ? Object.keys(config.firewall.ipv4.input.filter.rule).length : 0) +
                         (config.firewall.ipv4.output?.filter?.rule ? Object.keys(config.firewall.ipv4.output.filter.rule).length : 0)} total rules
                      </p>
                    </div>
                  </div>
                )}
                
                {/* IPv6 Rules */}
                {config.firewall.ipv6 && (
                  <div className="flex items-start gap-2 p-2 rounded bg-slate-800">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                    <div>
                      <p className="text-sm text-white">IPv6 Rules</p>
                      <p className="text-xs text-slate-400">
                        {(config.firewall.ipv6.forward?.filter?.rule ? Object.keys(config.firewall.ipv6.forward.filter.rule).length : 0) +
                         (config.firewall.ipv6.input?.filter?.rule ? Object.keys(config.firewall.ipv6.input.filter.rule).length : 0) +
                         (config.firewall.ipv6.output?.filter?.rule ? Object.keys(config.firewall.ipv6.output.filter.rule).length : 0)} total rules
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-400">No firewall rules configured</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}