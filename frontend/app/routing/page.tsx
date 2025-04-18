"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Route, Plus, ExternalLink, Network, Router, Activity, RefreshCw, Share2, Workflow } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area"

interface NextHop {
  ip: string;
  interface: string;
  active: boolean;
  directly_connected: boolean;
}

interface Route {
  destination: string;
  prefix_length: number;
  protocol: string;
  vrf: string;
  selected: boolean;
  installed: boolean;
  distance: number;
  metric: number;
  uptime: string;
  nexthops: NextHop[];
}

interface RoutingTable {
  success: boolean;
  routes_by_vrf: {
    [vrf: string]: Route[];
  };
  error: string | null;
  count: number;
  timestamp: string;
}

// Define types for configuration objects
interface RouteConfig {
  interface?: Record<string, any>;
  'next-hop'?: Record<string, { distance?: number }>;
  distance?: number;
}

interface TableConfig {
  route?: Record<string, RouteConfig>;
  route6?: Record<string, RouteConfig>;
}

interface PolicyRuleConfig {
  protocol?: string;
  source?: {
    group?: {
      'network-group'?: string;
    };
  };
  destination?: {
    group?: {
      'port-group'?: string;
    };
  };
  set?: {
    table?: string;
  };
  interface?: string;
}

interface StaticRoute {
  destination: string;
  interface: string | null;
  via: string | null;
  distance: number;
  table: string;
  ipv6?: boolean;
}

// BGP specific interfaces
interface BgpNeighbor {
  address: string;
  remoteAs: string;
  ebgpMultihop?: string;
  updateSource?: string;
}

interface BgpPeerGroup {
  name: string;
  addressFamilies: string[];
}

interface BgpConfig {
  systemAs?: string;
  routerId?: string;
  neighbors: BgpNeighbor[];
  peerGroups: BgpPeerGroup[];
  networks: string[];
}

// OSPF specific interfaces
interface OspfArea {
  areaId: string;
  networks: string[];
}

interface OspfConfig {
  routerId?: string;
  areas: OspfArea[];
}

// RIP specific interfaces
interface RipConfig {
  networks: string[];
  redistributeConnected: boolean;
}

// PIM specific interfaces
interface PimConfig {
  interfaces: string[];
  rendezvousPoints: { address: string; group: string }[];
}

// Policy Route Map interfaces
interface RouteMapRule {
  id: string;
  action: string;
  match: {
    rpki?: string;
    [key: string]: any;
  };
  set: {
    localPreference?: string;
    [key: string]: any;
  };
}

interface RouteMapConfig {
  rule?: Record<string, {
    action?: string;
    match?: {
      rpki?: string;
      [key: string]: any;
    };
    set?: {
      localPreference?: string;
      [key: string]: any;
    };
  }>;
  [key: string]: any;
}

export default function RoutingPage() {
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(true)
  const [config, setConfig] = useState<any>(null)
  const [routingTable, setRoutingTable] = useState<RoutingTable | null>(null)
  const [activeTab, setActiveTab] = useState("current")
  const [activeDynamicTab, setActiveDynamicTab] = useState("bgp")
  const [newRouteDialogOpen, setNewRouteDialogOpen] = useState(false)
  const [newRouteData, setNewRouteData] = useState({
    destination: '',
    nextHop: '',
    interface: '',
    distance: '1',
    table: 'main'
  })
  const [isAddingRoute, setIsAddingRoute] = useState(false)
  const [selectedVrf, setSelectedVrf] = useState<string>("default")

  const fetchConfig = async () => {
    setIsLoadingConfig(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/config`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success === true && data.data) {
        setConfig(data.data);
      } else {
        throw new Error(data.error || "Failed to load configuration");
      }
    } catch (error) {
      console.error("Error fetching configuration:", error);
      toast({
        variant: "destructive",
        title: "Error loading configuration",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const fetchRoutingTable = async () => {
    setIsLoadingRoutes(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/routingtable`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success === true) {
        setRoutingTable(data);
      } else {
        throw new Error(data.error || "Failed to load routing table");
      }
    } catch (error) {
      console.error("Error fetching routing table:", error);
      toast({
        variant: "destructive",
        title: "Error loading routing table",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  const addRoute = async () => {
    if (!newRouteData.destination) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Destination network is required"
      });
      return;
    }

    if (!newRouteData.nextHop && !newRouteData.interface) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Either next-hop IP or interface is required"
      });
      return;
    }

    setIsAddingRoute(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      let basePath = '';

      if (newRouteData.table === 'main') {
        if (newRouteData.nextHop) {
          basePath = `protocols/static/route/${encodeURIComponent(newRouteData.destination)}/next-hop/${encodeURIComponent(newRouteData.nextHop)}`;
        } else {
          basePath = `protocols/static/route/${encodeURIComponent(newRouteData.destination)}/interface/${encodeURIComponent(newRouteData.interface)}`;
        }
      } else {
        if (newRouteData.nextHop) {
          basePath = `protocols/static/table/${encodeURIComponent(newRouteData.table)}/route/${encodeURIComponent(newRouteData.destination)}/next-hop/${encodeURIComponent(newRouteData.nextHop)}`;
        } else {
          basePath = `protocols/static/table/${encodeURIComponent(newRouteData.table)}/route/${encodeURIComponent(newRouteData.destination)}/interface/${encodeURIComponent(newRouteData.interface)}`;
        }
      }

      // Create the route
      const createResponse = await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(basePath)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create route: ${createResponse.statusText}`);
      }

      // Set distance if not default
      if (newRouteData.distance !== '1') {
        const distancePath = `${basePath}/distance`;
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(distancePath)}?value=${encodeURIComponent(newRouteData.distance)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }

      toast({
        title: "Route Added",
        description: `Successfully added route to ${newRouteData.destination}`
      });

      setNewRouteDialogOpen(false);
      await Promise.all([fetchConfig(), fetchRoutingTable()]);
    } catch (error) {
      console.error("Error adding route:", error);
      toast({
        variant: "destructive",
        title: "Failed to add route",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsAddingRoute(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchConfig(), fetchRoutingTable()]);

    // Periodically refresh routing table
    const intervalId = setInterval(() => {
      fetchRoutingTable();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  if (isLoadingConfig || isLoadingRoutes) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading routing information...</p>
        </div>
      </div>
    );
  }

  // Get static routes from config
  const getStaticRoutes = (): StaticRoute[] => {
    const routes: StaticRoute[] = [];
    
    // Main table static routes
    if (config?.protocols?.static?.route) {
      for (const [network, routeConfig] of Object.entries(config.protocols.static.route as Record<string, RouteConfig>)) {
        if (routeConfig.interface) {
          for (const interface_ of Object.keys(routeConfig.interface)) {
            routes.push({
              destination: network,
              interface: interface_,
              via: null,
              distance: routeConfig.distance || 1,
              table: 'main'
            });
          }
        }
        if (routeConfig['next-hop']) {
          for (const nextHop of Object.keys(routeConfig['next-hop'])) {
            routes.push({
              destination: network,
              interface: null,
              via: nextHop,
              distance: routeConfig['next-hop'][nextHop]?.distance || 1,
              table: 'main'
            });
          }
        }
      }
    }
    
    // Custom routing tables
    if (config?.protocols?.static?.table) {
      for (const [tableId, tableConfig] of Object.entries(config.protocols.static.table as Record<string, TableConfig>)) {
        if (tableConfig.route) {
          for (const [network, routeConfig] of Object.entries(tableConfig.route)) {
            if (routeConfig.interface) {
              for (const interface_ of Object.keys(routeConfig.interface)) {
                routes.push({
                  destination: network,
                  interface: interface_,
                  via: null,
                  distance: routeConfig.distance || 1,
                  table: tableId
                });
              }
            }
            if (routeConfig['next-hop']) {
              for (const nextHop of Object.keys(routeConfig['next-hop'])) {
                routes.push({
                  destination: network,
                  interface: null,
                  via: nextHop,
                  distance: routeConfig['next-hop'][nextHop]?.distance || 1,
                  table: tableId
                });
              }
            }
          }
        }

        // IPv6 routes
        if (tableConfig.route6) {
          for (const [network, routeConfig] of Object.entries(tableConfig.route6)) {
            if (routeConfig.interface) {
              for (const interface_ of Object.keys(routeConfig.interface)) {
                routes.push({
                  destination: network,
                  interface: interface_,
                  via: null,
                  distance: routeConfig.distance || 1,
                  table: tableId,
                  ipv6: true
                });
              }
            }
            if (routeConfig['next-hop']) {
              for (const nextHop of Object.keys(routeConfig['next-hop'])) {
                routes.push({
                  destination: network,
                  interface: null,
                  via: nextHop,
                  distance: routeConfig['next-hop'][nextHop]?.distance || 1,
                  table: tableId,
                  ipv6: true
                });
              }
            }
          }
        }
      }
    }
    
    return routes;
  };

  // Get interfaces for dropdown
  const getInterfaces = (): string[] => {
    const interfaces: string[] = [];
    
    if (config?.interfaces) {
      for (const [type, ifList] of Object.entries(config.interfaces as Record<string, Record<string, any>>)) {
        for (const ifName of Object.keys(ifList)) {
          interfaces.push(ifName);
        }
      }
    }
    
    return interfaces.sort();
  };

  // Get policy-based routing rules
  const getPbrRules = () => {
    const rules: { name: string; id: string; config: PolicyRuleConfig }[] = [];
    
    if (config?.policy?.route) {
      for (const [name, policyConfig] of Object.entries(config.policy.route as Record<string, { rule?: Record<string, PolicyRuleConfig> }>)) {
        if (policyConfig.rule) {
          for (const [ruleId, ruleConfig] of Object.entries(policyConfig.rule)) {
            rules.push({
              name,
              id: ruleId,
              config: ruleConfig
            });
          }
        }
      }
    }
    
    return rules;
  };

  // Get BGP configuration
  const getBgpConfig = (): BgpConfig => {
    if (!config?.protocols?.bgp) {
      return {
        neighbors: [],
        peerGroups: [],
        networks: []
      };
    }

    const bgp = config.protocols.bgp;
    const result: BgpConfig = {
      systemAs: bgp['system-as'],
      routerId: bgp.parameters?.['router-id'],
      neighbors: [],
      peerGroups: [],
      networks: []
    };

    // Get neighbors
    if (bgp.neighbor) {
      result.neighbors = Object.entries(bgp.neighbor).map(([address, data]: [string, any]) => ({
        address,
        remoteAs: data['remote-as'],
        ebgpMultihop: data['ebgp-multihop'],
        updateSource: data['update-source']
      }));
    }

    // Get peer groups
    if (bgp['peer-group']) {
      result.peerGroups = Object.entries(bgp['peer-group']).map(([name, data]: [string, any]) => {
        const addressFamilies = [];
        if (data['address-family']) {
          if (data['address-family']['ipv4-unicast']) {
            addressFamilies.push('ipv4-unicast');
          }
          if (data['address-family']['ipv6-unicast']) {
            addressFamilies.push('ipv6-unicast');
          }
        }
        return {
          name,
          addressFamilies
        };
      });
    }

    // Get networks
    if (bgp['address-family']?.['ipv4-unicast']?.network) {
      result.networks = Object.keys(bgp['address-family']['ipv4-unicast'].network);
    }

    return result;
  };

  // Get OSPF configuration
  const getOspfConfig = (): OspfConfig => {
    if (!config?.protocols?.ospf) {
      return {
        areas: []
      };
    }

    const ospf = config.protocols.ospf;
    const result: OspfConfig = {
      routerId: ospf.parameters?.['router-id'],
      areas: []
    };

    // Get areas
    if (ospf.area) {
      result.areas = Object.entries(ospf.area).map(([areaId, data]: [string, any]) => {
        const networks = Array.isArray(data.network) ? data.network : data.network ? [data.network] : [];
        return {
          areaId,
          networks
        };
      });
    }

    return result;
  };

  // Get RIP configuration
  const getRipConfig = (): RipConfig => {
    if (!config?.protocols?.rip) {
      return {
        networks: [],
        redistributeConnected: false
      };
    }

    const rip = config.protocols.rip;
    return {
      networks: Array.isArray(rip.network) ? rip.network : rip.network ? [rip.network] : [],
      redistributeConnected: !!rip.redistribute?.connected
    };
  };

  // Get PIM configuration
  const getPimConfig = (): PimConfig => {
    if (!config?.protocols?.pim) {
      return {
        interfaces: [],
        rendezvousPoints: []
      };
    }

    const pim = config.protocols.pim;
    const result: PimConfig = {
      interfaces: [],
      rendezvousPoints: []
    };

    // Get interfaces
    if (pim.interface) {
      result.interfaces = Object.keys(pim.interface);
    }

    // Get RP addresses
    if (pim.rp?.address) {
      result.rendezvousPoints = Object.entries(pim.rp.address).map(([address, data]: [string, any]) => ({
        address,
        group: data.group
      }));
    }

    return result;
  };

  // Get route maps
  const getRouteMaps = () => {
    const routeMaps: { name: string; rules: RouteMapRule[] }[] = [];
    
    if (config?.policy?.['route-map']) {
      for (const [name, routeMapConfig] of Object.entries(config.policy['route-map']) as [string, RouteMapConfig][]) {
        const rules: RouteMapRule[] = [];
        
        if (routeMapConfig.rule) {
          for (const [id, ruleConfig] of Object.entries(routeMapConfig.rule)) {
            rules.push({
              id,
              action: ruleConfig.action || 'permit',
              match: ruleConfig.match || {},
              set: ruleConfig.set || {}
            });
          }
        }
        
        routeMaps.push({
          name,
          rules
        });
      }
    }
    
    return routeMaps;
  };

  // Prepare data
  const staticRoutes = getStaticRoutes();
  const pbrRules = getPbrRules();
  const interfaces = getInterfaces();
  const bgpConfig = getBgpConfig();
  const ospfConfig = getOspfConfig();
  const ripConfig = getRipConfig();
  const pimConfig = getPimConfig();
  const routeMaps = getRouteMaps();

  const getVrfs = (): string[] => {
    if (!routingTable?.routes_by_vrf) return ["default"];
    return Object.keys(routingTable.routes_by_vrf).sort();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">Routing</h1>
          <p className="text-slate-400">Manage routing configuration and view active routes</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchRoutingTable}
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            disabled={isLoadingRoutes}
          >
            {isLoadingRoutes ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button 
            className="bg-cyan-600 hover:bg-cyan-700" 
            onClick={() => setNewRouteDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Route
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="current">
            <Router className="h-4 w-4 mr-2" />
            Current Routes
          </TabsTrigger>
          <TabsTrigger value="static">
            <Route className="h-4 w-4 mr-2" />
            Static Routes
          </TabsTrigger>
          <TabsTrigger value="dynamic">
            <Activity className="h-4 w-4 mr-2" />
            Dynamic Routing
          </TabsTrigger>
          <TabsTrigger value="pbr">
            <Network className="h-4 w-4 mr-2" />
            Policy Routing
          </TabsTrigger>
          <TabsTrigger value="maps">
            <Workflow className="h-4 w-4 mr-2" />
            Route Maps
          </TabsTrigger>
        </TabsList>
        
        {/* Current Routes Tab */}
        <TabsContent value="current">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-cyan-400">Current Routing Table</CardTitle>
              <CardDescription className="text-slate-400">
                Active routes in the system as of {new Date(routingTable?.timestamp || Date.now()).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="bg-slate-800 border border-slate-700 rounded-md p-4">
                  <div className="flex flex-wrap gap-2">
                    {getVrfs().map((vrf) => (
                      <Button
                        key={vrf}
                        variant={selectedVrf === vrf ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedVrf(vrf)}
                        className={`${
                          selectedVrf === vrf 
                            ? "bg-cyan-600 hover:bg-cyan-700 text-white" 
                            : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        } whitespace-nowrap`}
                      >
                        {vrf === "default" ? "Default VRF" : `VRF: ${vrf}`}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <Table>
                <TableHeader className="bg-slate-900">
                  <TableRow>
                    <TableHead className="w-[180px] text-cyan-400">Destination</TableHead>
                    <TableHead className="w-[120px] text-cyan-400">Protocol</TableHead>
                    <TableHead className="w-[120px] text-cyan-400">Next Hop</TableHead>
                    <TableHead className="w-[100px] text-cyan-400">Interface</TableHead>
                    <TableHead className="w-[80px] text-cyan-400">Distance</TableHead>
                    <TableHead className="w-[80px] text-cyan-400">Metric</TableHead>
                    <TableHead className="w-[80px] text-cyan-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routingTable?.routes_by_vrf[selectedVrf]?.map((route, index) => (
                    <TableRow key={index} className="hover:bg-slate-700/50">
                      <TableCell className="font-mono">
                        {route.destination.includes('/') ? route.destination : `${route.destination}/${route.prefix_length}`}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${
                          route.protocol === 'static' ? 'bg-blue-600' : 
                          route.protocol === 'connected' ? 'bg-green-600' : 
                          route.protocol === 'ospf' ? 'bg-purple-600' : 
                          route.protocol === 'kernel' ? 'bg-amber-600' :
                          route.protocol === 'local' ? 'bg-cyan-600' :
                          'bg-slate-600'
                        }`}>
                          {route.protocol}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {route.nexthops.map((nh, i) => 
                          nh.ip !== 'directly connected' ? (
                            <div key={i}>{nh.ip}</div>
                          ) : null
                        )}
                      </TableCell>
                      <TableCell>
                        {Array.from(new Set(route.nexthops.map(nh => nh.interface))).map((iface, i) => (
                          <Badge key={i} variant="outline" className="border-slate-600 text-slate-300">
                            {iface}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell>{route.distance}</TableCell>
                      <TableCell>{route.metric}</TableCell>
                      <TableCell>
                        {route.selected ? (
                          <Badge className="bg-green-600">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="border-red-800 text-red-400">Inactive</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(!routingTable?.routes_by_vrf[selectedVrf] || routingTable.routes_by_vrf[selectedVrf].length === 0) && (
                <div className="text-center py-8">
                  <Route className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-300 mb-2">No Routes Found</h3>
                  <p className="text-slate-400 mb-4">There are no active routes in the {selectedVrf === "default" ? "default" : selectedVrf} VRF.</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t border-slate-700 p-4">
              <div className="text-xs text-slate-400">
                Total routes in {selectedVrf === "default" ? "default" : selectedVrf} VRF: {routingTable?.routes_by_vrf[selectedVrf]?.length || 0}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchRoutingTable()}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Static Routes Tab */}
        <TabsContent value="static">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-cyan-400">Static Routes</CardTitle>
              <CardDescription className="text-slate-400">
                Configured static routes in VyOS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-slate-900">
                  <TableRow>
                    <TableHead className="w-[180px] text-cyan-400">Destination</TableHead>
                    <TableHead className="w-[120px] text-cyan-400">Via</TableHead>
                    <TableHead className="w-[120px] text-cyan-400">Interface</TableHead>
                    <TableHead className="w-[80px] text-cyan-400">Distance</TableHead>
                    <TableHead className="w-[100px] text-cyan-400">Table</TableHead>
                    <TableHead className="w-[100px] text-cyan-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staticRoutes.map((route, index) => (
                    <TableRow key={index} className="hover:bg-slate-700/50">
                      <TableCell className="font-mono">
                        {route.destination}
                        {route.ipv6 && <Badge className="ml-2 bg-purple-700">IPv6</Badge>}
                      </TableCell>
                      <TableCell className="font-mono">
                        {route.via || '-'}
                      </TableCell>
                      <TableCell>
                        {route.interface ? (
                          <Badge variant="outline" className="border-slate-600 text-slate-300">
                            {route.interface}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{route.distance}</TableCell>
                      <TableCell>
                        <Badge className={`${route.table === 'main' ? 'bg-blue-600' : 'bg-amber-600'}`}>
                          {route.table}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700">
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/30">
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(!staticRoutes || staticRoutes.length === 0) && (
                <div className="text-center py-8">
                  <Route className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-300 mb-2">No Static Routes Defined</h3>
                  <p className="text-slate-400 mb-4">Add static routes to create persistent paths for network traffic.</p>
                  <Button 
                    className="bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => setNewRouteDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Static Route
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Dynamic Routing Tab */}
        <TabsContent value="dynamic">
          <Tabs defaultValue={activeDynamicTab} onValueChange={setActiveDynamicTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="bgp">
                <Network className="h-4 w-4 mr-2" />
                BGP
              </TabsTrigger>
              <TabsTrigger value="ospf">
                <Share2 className="h-4 w-4 mr-2" />
                OSPF
              </TabsTrigger>
              <TabsTrigger value="rip">
                <Route className="h-4 w-4 mr-2" />
                RIP
              </TabsTrigger>
              <TabsTrigger value="pim">
                <Activity className="h-4 w-4 mr-2" />
                PIM
              </TabsTrigger>
            </TabsList>
            
            {/* BGP Tab */}
            <TabsContent value="bgp">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Border Gateway Protocol (BGP)</CardTitle>
                  <CardDescription className="text-slate-400">
                    BGP routing configuration for external routing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-slate-300">System Information</h3>
                        <div className="bg-slate-900 p-4 rounded-md">
                          <div className="grid grid-cols-2 gap-y-2 text-sm">
                            <div className="text-slate-400">Local AS</div>
                            <div className="text-white font-medium">{bgpConfig.systemAs || "Not configured"}</div>
                            <div className="text-slate-400">Router ID</div>
                            <div className="text-white font-medium">{bgpConfig.routerId || "Not configured"}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-slate-300">Networks</h3>
                        <div className="bg-slate-900 p-4 rounded-md">
                          {bgpConfig.networks.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {bgpConfig.networks.map((network, idx) => (
                                <Badge key={idx} className="bg-blue-600">{network}</Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-400 text-sm">No networks configured for advertisement</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="neighbors" className="border-slate-700">
                        <AccordionTrigger className="text-cyan-400 hover:text-cyan-300">
                          BGP Neighbors
                        </AccordionTrigger>
                        <AccordionContent>
                          {bgpConfig.neighbors.length > 0 ? (
                            <Table>
                              <TableHeader className="bg-slate-900">
                                <TableRow>
                                  <TableHead className="text-cyan-400">Neighbor IP</TableHead>
                                  <TableHead className="text-cyan-400">Remote AS</TableHead>
                                  <TableHead className="text-cyan-400">EBGP Multihop</TableHead>
                                  <TableHead className="text-cyan-400">Update Source</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {bgpConfig.neighbors.map((neighbor, idx) => (
                                  <TableRow key={idx} className="hover:bg-slate-700/50">
                                    <TableCell className="font-mono">{neighbor.address}</TableCell>
                                    <TableCell>
                                      <Badge className="bg-blue-600">{neighbor.remoteAs}</Badge>
                                    </TableCell>
                                    <TableCell>{neighbor.ebgpMultihop || "-"}</TableCell>
                                    <TableCell>{neighbor.updateSource || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-slate-400">No BGP neighbors configured</p>
                              <Button className="mt-2 bg-cyan-600 hover:bg-cyan-700">
                                <Plus className="h-4 w-4 mr-2" />
                                Add BGP Neighbor
                              </Button>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="peer-groups" className="border-slate-700">
                        <AccordionTrigger className="text-cyan-400 hover:text-cyan-300">
                          Peer Groups
                        </AccordionTrigger>
                        <AccordionContent>
                          {bgpConfig.peerGroups.length > 0 ? (
                            <Table>
                              <TableHeader className="bg-slate-900">
                                <TableRow>
                                  <TableHead className="text-cyan-400">Group Name</TableHead>
                                  <TableHead className="text-cyan-400">Address Families</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {bgpConfig.peerGroups.map((group, idx) => (
                                  <TableRow key={idx} className="hover:bg-slate-700/50">
                                    <TableCell className="font-medium">{group.name}</TableCell>
                                    <TableCell>
                                      <div className="flex flex-wrap gap-1">
                                        {group.addressFamilies.map((family, i) => (
                                          <Badge key={i} className="bg-purple-600">{family}</Badge>
                                        ))}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-slate-400">No peer groups configured</p>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t border-slate-700 p-4">
                  <Button className="bg-cyan-600 hover:bg-cyan-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Configure BGP
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* OSPF Tab */}
            <TabsContent value="ospf">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Open Shortest Path First (OSPF)</CardTitle>
                  <CardDescription className="text-slate-400">
                    Link-state routing protocol for internal routing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-slate-300">Router ID</h3>
                      <div className="bg-slate-900 p-4 rounded-md">
                        <p className="text-white font-medium">{ospfConfig.routerId || "Not configured"}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-slate-300">OSPF Areas</h3>
                      {ospfConfig.areas.length > 0 ? (
                        <div className="space-y-4">
                          {ospfConfig.areas.map((area, idx) => (
                            <div key={idx} className="bg-slate-900 p-4 rounded-md">
                              <h4 className="text-sm font-medium text-cyan-400 mb-2">Area {area.areaId}</h4>
                              <div className="space-y-2">
                                <div className="text-xs text-slate-400">Networks</div>
                                <div className="flex flex-wrap gap-2">
                                  {area.networks.map((network, i) => (
                                    <Badge key={i} className="bg-blue-600">{network}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-900 p-6 rounded-md text-center">
                          <p className="text-slate-400 mb-4">No OSPF areas configured</p>
                          <Button className="bg-cyan-600 hover:bg-cyan-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Configure OSPF
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* RIP Tab */}
            <TabsContent value="rip">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Routing Information Protocol (RIP)</CardTitle>
                  <CardDescription className="text-slate-400">
                    Distance-vector routing protocol for small networks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-slate-300">RIP Networks</h3>
                      <div className="bg-slate-900 p-4 rounded-md">
                        {ripConfig.networks.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {ripConfig.networks.map((network, idx) => (
                              <Badge key={idx} className="bg-blue-600">{network}</Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400">No networks configured for RIP</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-slate-300">Redistribution</h3>
                      <div className="bg-slate-900 p-4 rounded-md">
                        <div className="flex items-center">
                          <span className="text-slate-400 mr-2">Redistribute Connected:</span>
                          <Badge className={ripConfig.redistributeConnected ? "bg-green-600" : "bg-slate-600"}>
                            {ripConfig.redistributeConnected ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t border-slate-700 p-4">
                  <Button className="bg-cyan-600 hover:bg-cyan-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Configure RIP
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* PIM Tab */}
            <TabsContent value="pim">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Protocol Independent Multicast (PIM)</CardTitle>
                  <CardDescription className="text-slate-400">
                    Multicast routing protocol for IP networks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-slate-300">PIM Interfaces</h3>
                      <div className="bg-slate-900 p-4 rounded-md">
                        {pimConfig.interfaces.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {pimConfig.interfaces.map((iface, idx) => (
                              <Badge key={idx} variant="outline" className="border-slate-600 text-slate-300">
                                {iface}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400">No interfaces configured for PIM</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-slate-300">Rendezvous Points</h3>
                      <div className="bg-slate-900 p-4 rounded-md">
                        {pimConfig.rendezvousPoints.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-cyan-400">RP Address</TableHead>
                                <TableHead className="text-cyan-400">Multicast Group</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pimConfig.rendezvousPoints.map((rp, idx) => (
                                <TableRow key={idx} className="hover:bg-slate-700/50">
                                  <TableCell className="font-mono">{rp.address}</TableCell>
                                  <TableCell>
                                    <Badge className="bg-blue-600">{rp.group}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-slate-400">No rendezvous points configured</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t border-slate-700 p-4">
                  <Button className="bg-cyan-600 hover:bg-cyan-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Configure PIM
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
        
        {/* Policy-Based Routing Tab */}
        <TabsContent value="pbr">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-cyan-400">Policy-Based Routing</CardTitle>
              <CardDescription className="text-slate-400">
                Custom routing policies based on traffic characteristics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-slate-900">
                  <TableRow>
                    <TableHead className="w-[100px] text-cyan-400">Policy Name</TableHead>
                    <TableHead className="w-[80px] text-cyan-400">Rule ID</TableHead>
                    <TableHead className="w-[140px] text-cyan-400">Match Conditions</TableHead>
                    <TableHead className="w-[120px] text-cyan-400">Route Table</TableHead>
                    <TableHead className="w-[100px] text-cyan-400">Interface</TableHead>
                    <TableHead className="w-[100px] text-cyan-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pbrRules.map((rule, index) => (
                    <TableRow key={index} className="hover:bg-slate-700/50">
                      <TableCell className="font-medium">
                        {rule.name}
                      </TableCell>
                      <TableCell>
                        {rule.id}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {rule.config.protocol && (
                            <Badge variant="outline" className="border-cyan-700 text-cyan-400">
                              {rule.config.protocol}
                            </Badge>
                          )}
                          {rule.config.source?.group?.['network-group'] && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-400">from</span>
                              <Badge variant="outline" className="border-purple-700 text-purple-400">
                                {rule.config.source.group['network-group']}
                              </Badge>
                            </div>
                          )}
                          {rule.config.destination?.group?.['port-group'] && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-400">ports</span>
                              <Badge variant="outline" className="border-amber-700 text-amber-400">
                                {rule.config.destination.group['port-group']}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {rule.config.set?.table && (
                          <Badge className="bg-blue-600">{rule.config.set.table}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {rule.config.interface && (
                          <Badge variant="outline" className="border-slate-600 text-slate-300">
                            {rule.config.interface}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700">
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/30">
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(!pbrRules || pbrRules.length === 0) && (
                <div className="text-center py-8">
                  <Network className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-300 mb-2">No Policy Routes Defined</h3>
                  <p className="text-slate-400 mb-4">Policy-based routing allows custom routing decisions based on traffic characteristics.</p>
                  <Button className="bg-cyan-600 hover:bg-cyan-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Policy Route
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Route Maps Tab */}
        <TabsContent value="maps">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-cyan-400">Route Maps</CardTitle>
              <CardDescription className="text-slate-400">
                Route maps for policy-based routing and route filtering
              </CardDescription>
            </CardHeader>
            <CardContent>
              {routeMaps.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {routeMaps.map((routeMap, idx) => (
                    <AccordionItem key={idx} value={`route-map-${idx}`} className="border-slate-700">
                      <AccordionTrigger className="text-cyan-400 hover:text-cyan-300">
                        Route Map: {routeMap.name}
                      </AccordionTrigger>
                      <AccordionContent>
                        <Table>
                          <TableHeader className="bg-slate-900">
                            <TableRow>
                              <TableHead className="text-cyan-400">Rule</TableHead>
                              <TableHead className="text-cyan-400">Action</TableHead>
                              <TableHead className="text-cyan-400">Match Conditions</TableHead>
                              <TableHead className="text-cyan-400">Set Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {routeMap.rules.map((rule, i) => (
                              <TableRow key={i} className="hover:bg-slate-700/50">
                                <TableCell>{rule.id}</TableCell>
                                <TableCell>
                                  <Badge className={rule.action === 'permit' ? 'bg-green-600' : 'bg-red-600'}>
                                    {rule.action}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    {Object.entries(rule.match || {}).map(([key, value], j) => {
                                      // Format the value into a readable string
                                      let displayValue = value;
                                      if (typeof value === 'object' && value !== null) {
                                        // Handle nested objects by getting all key-value pairs
                                        const formatNestedObject = (obj: any, parentKey?: string): string => {
                                          const entries = Object.entries(obj);
                                          if (entries.length === 0) return '';
                                          
                                          const [k, v] = entries[0];
                                          if (typeof v === 'object' && v !== null) {
                                            return formatNestedObject(v, k);
                                          }
                                          return `${parentKey ? `${parentKey} ` : ''}${k} ${v}`;
                                        };
                                        displayValue = formatNestedObject(value);
                                      }
                                      return (
                                        <div key={j} className="flex items-center gap-1">
                                          <span className="text-xs text-muted-foreground">{key}:</span>
                                          <Badge variant="secondary">
                                            {String(displayValue)}
                                          </Badge>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    {Object.entries(rule.set || {}).map(([key, value], j) => {
                                      // Format the value into a readable string
                                      let displayValue = value;
                                      if (typeof value === 'object' && value !== null) {
                                        // Handle nested objects by getting all key-value pairs
                                        const formatNestedObject = (obj: any, parentKey?: string): string => {
                                          const entries = Object.entries(obj);
                                          if (entries.length === 0) return '';
                                          
                                          const [k, v] = entries[0];
                                          if (typeof v === 'object' && v !== null) {
                                            return formatNestedObject(v, k);
                                          }
                                          return `${parentKey ? `${parentKey} ` : ''}${k} ${v}`;
                                        };
                                        displayValue = formatNestedObject(value);
                                      }
                                      return (
                                        <div key={j} className="flex items-center gap-1">
                                          <span className="text-xs text-muted-foreground">{key}:</span>
                                          <Badge variant="outline">
                                            {String(displayValue)}
                                          </Badge>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-8">
                  <Workflow className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-300 mb-2">No Route Maps Defined</h3>
                  <p className="text-slate-400 mb-4">Route maps allow you to modify and filter routes based on various criteria.</p>
                  <Button className="bg-cyan-600 hover:bg-cyan-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Route Map
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Route Dialog */}
      <Dialog open={newRouteDialogOpen} onOpenChange={setNewRouteDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Add Static Route</DialogTitle>
            <DialogDescription className="text-slate-400">
              Define a new static route for network traffic
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="destination" className="text-slate-300">Destination</Label>
              <Input
                id="destination"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={newRouteData.destination}
                onChange={(e) => setNewRouteData({...newRouteData, destination: e.target.value})}
                placeholder="e.g. 192.168.1.0/24 or 10.0.0.0/8"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="next-hop" className="text-slate-300">Next Hop IP</Label>
              <Input
                id="next-hop"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={newRouteData.nextHop}
                onChange={(e) => setNewRouteData({...newRouteData, nextHop: e.target.value})}
                placeholder="e.g. 192.168.1.1"
                disabled={!!newRouteData.interface}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interface" className="text-slate-300">OR Interface</Label>
              <div className="col-span-3">
                <Select 
                  value={newRouteData.interface} 
                  onValueChange={(value) => setNewRouteData({...newRouteData, interface: value})}
                  disabled={!!newRouteData.nextHop}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select interface" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="none">None</SelectItem>
                    {interfaces.map(iface => (
                      <SelectItem key={iface} value={iface}>{iface}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="distance" className="text-slate-300">Admin Distance</Label>
              <Input
                id="distance"
                type="number"
                min="1"
                max="255"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={newRouteData.distance}
                onChange={(e) => setNewRouteData({...newRouteData, distance: e.target.value})}
                placeholder="1-255 (lower is preferred)"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="table" className="text-slate-300">Routing Table</Label>
              <div className="col-span-3">
                <Select 
                  value={newRouteData.table} 
                  onValueChange={(value) => setNewRouteData({...newRouteData, table: value})}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select routing table" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white max-h-[200px]">
                    <SelectItem value="main">Main table</SelectItem>
                    {config?.protocols?.static?.table && Object.keys(config.protocols.static.table).map(tableId => (
                      <SelectItem key={tableId} value={tableId}>Table {tableId}</SelectItem>
                    ))}
                    <SelectItem value="new">Create new table...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setNewRouteDialogOpen(false)}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={addRoute} 
              className="bg-cyan-600 hover:bg-cyan-700"
              disabled={isAddingRoute}
            >
              {isAddingRoute ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Add Route
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
