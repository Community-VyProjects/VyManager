"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Network, AlertCircle, Plus } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function InterfacesPage() {
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [config, setConfig] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [routingTable, setRoutingTable] = useState<any>(null)
  const [isLoadingRouting, setIsLoadingRouting] = useState(false)
  
  // Interface editing state
  const [editInterfaceDialogOpen, setEditInterfaceDialogOpen] = useState(false)
  const [selectedInterface, setSelectedInterface] = useState<any>(null)
  const [interfaceFormData, setInterfaceFormData] = useState<any>({})
  const [isUpdatingInterface, setIsUpdatingInterface] = useState(false)
  
  // New interface dialog state
  const [newInterfaceDialogOpen, setNewInterfaceDialogOpen] = useState(false)
  const [newInterfaceData, setNewInterfaceData] = useState({
    type: 'ethernet',
    name: '',
    description: '',
    address: '',
    disabled: false
  })

  const fetchConfig = async () => {
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
        
        // After loading config, also fetch routing table
        fetchRoutingTable();
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
  
  const fetchRoutingTable = async () => {
    setIsLoadingRouting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/routingtable`);
      
      if (!response.ok) {
        console.error("Error fetching routing table:", response.statusText);
        setIsLoadingRouting(false);
        return;
      }
      
      const data = await response.json();
      if (data.success === true && data.routes) {
        setRoutingTable(data);
      }
    } catch (error) {
      console.error("Error fetching routing table:", error);
    } finally {
      setIsLoadingRouting(false);
    }
  };

  // Function to get interface network info from routing table
  const getInterfaceNetworkInfo = (interfaceName: string) => {
    if (!routingTable || !routingTable.routes) return null;
    
    const routes = routingTable.routes.filter((route: any) => 
      route.nexthops && route.nexthops.some((hop: any) => 
        hop.interface === interfaceName && hop.directly_connected
      )
    );
    
    return routes.length > 0 ? routes : null;
  };
  
  // Function to check if an interface has DHCP
  const isDhcpInterface = (interfaceDetails: any) => {
    return interfaceDetails.address === "dhcp";
  };
  
  // Function to open the edit interface dialog
  const openEditInterfaceDialog = (type: string, name: string, details: any) => {
    setSelectedInterface({ type, name, details });
    setInterfaceFormData({
      description: details.description || '',
      address: Array.isArray(details.address) ? details.address[0] : details.address || '',
      mtu: details.mtu || '',
      disabled: !!details.disable
    });
    setEditInterfaceDialogOpen(true);
  };
  
  // Function to open new interface dialog
  const openNewInterfaceDialog = () => {
    setNewInterfaceData({
      type: 'ethernet',
      name: '',
      description: '',
      address: '',
      disabled: false
    });
    setNewInterfaceDialogOpen(true);
  };
  
  // Function to create new interface
  const createNewInterface = async () => {
    if (!newInterfaceData.name || !newInterfaceData.type) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Interface type and name are required"
      });
      return;
    }
    
    setIsUpdatingInterface(true);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const basePath = `interfaces/${newInterfaceData.type}/${newInterfaceData.name}`;
      
      // Create the interface
      const createResponse = await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(basePath)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });
      
      if (!createResponse.ok) {
        throw new Error(`Failed to create interface: ${createResponse.statusText}`);
      }
      
      // Set description if provided
      if (newInterfaceData.description) {
        const descPath = `${basePath}/description`;
        const response = await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(descPath)}?value=${encodeURIComponent(newInterfaceData.description)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to set description: ${response.statusText}`);
        }
      }
      
      // Set address if provided
      if (newInterfaceData.address) {
        const addrPath = `${basePath}/address`;
        const response = await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(addrPath)}?value=${encodeURIComponent(newInterfaceData.address)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to set address: ${response.statusText}`);
        }
      }
      
      // Set disable state if true
      if (newInterfaceData.disabled) {
        const disablePath = `${basePath}/disable`;
        const response = await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(disablePath)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to set disable state: ${response.statusText}`);
        }
      }
      
      toast({
        title: "Interface Created",
        description: `Successfully created interface ${newInterfaceData.name}`
      });
      
      setNewInterfaceDialogOpen(false);
      await fetchConfig(); // Refresh configuration
      
    } catch (error) {
      console.error("Error creating interface:", error);
      toast({
        variant: "destructive",
        title: "Failed to create interface",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsUpdatingInterface(false);
    }
  };
  
  // Function to update interface configuration
  const updateInterface = async () => {
    if (!selectedInterface) return;
    
    setIsUpdatingInterface(true);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const basePath = `interfaces/${selectedInterface.type}/${selectedInterface.name}`;
      
      // Update description
      if (interfaceFormData.description !== selectedInterface.details.description) {
        const descPath = `${basePath}/description`;
        const encodedPath = encodeURIComponent(descPath);
        
        const response = await fetch(`${apiUrl}/api/configure/set/${encodedPath}?value=${encodeURIComponent(interfaceFormData.description)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update description: ${response.statusText}`);
        }
      }
      
      // Update MTU if changed
      if (interfaceFormData.mtu !== selectedInterface.details.mtu && interfaceFormData.mtu) {
        const mtuPath = `${basePath}/mtu`;
        const encodedPath = encodeURIComponent(mtuPath);
        
        const response = await fetch(`${apiUrl}/api/configure/set/${encodedPath}?value=${encodeURIComponent(interfaceFormData.mtu)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update MTU: ${response.statusText}`);
        }
      }
      
      // Update address if changed
      if (interfaceFormData.address !== (Array.isArray(selectedInterface.details.address) ? 
          selectedInterface.details.address[0] : selectedInterface.details.address)) {
        // First delete existing address if any
        if (selectedInterface.details.address) {
          const addrPath = `${basePath}/address`;
          const encodedDelPath = encodeURIComponent(addrPath);
          
          await fetch(`${apiUrl}/api/configure/delete/${encodedDelPath}`, {
            method: 'POST',
            headers: {
              'accept': 'application/json'
            }
          });
        }
        
        // Then set new address if provided
        if (interfaceFormData.address) {
          const addrPath = `${basePath}/address`;
          const encodedPath = encodeURIComponent(addrPath);
          
          const response = await fetch(`${apiUrl}/api/configure/set/${encodedPath}?value=${encodeURIComponent(interfaceFormData.address)}`, {
            method: 'POST',
            headers: {
              'accept': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to update address: ${response.statusText}`);
          }
        }
      }
      
      // Update disable state if changed
      const currentlyDisabled = !!selectedInterface.details.disable;
      if (interfaceFormData.disabled !== currentlyDisabled) {
        const disablePath = `${basePath}/disable`;
        const encodedPath = encodeURIComponent(disablePath);
        
        if (interfaceFormData.disabled) {
          // Set disable
          const response = await fetch(`${apiUrl}/api/configure/set/${encodedPath}`, {
            method: 'POST',
            headers: {
              'accept': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to disable interface: ${response.statusText}`);
          }
        } else {
          // Delete disable
          const response = await fetch(`${apiUrl}/api/configure/delete/${encodedPath}`, {
            method: 'POST',
            headers: {
              'accept': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to enable interface: ${response.statusText}`);
          }
        }
      }
      
      toast({
        title: "Interface updated",
        description: `Successfully updated ${selectedInterface.name}`,
      });
      
      // Reload configuration
      await fetchConfig();
      setEditInterfaceDialogOpen(false);
      
    } catch (error) {
      console.error("Error updating interface:", error);
      toast({
        variant: "destructive",
        title: "Failed to update interface",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsUpdatingInterface(false);
    }
  };

  // Check if there's a pending action from the dashboard
  useEffect(() => {
    // Timeout to ensure this runs after component is fully mounted
    const timer = setTimeout(() => {
      const pendingAction = typeof window !== 'undefined' ? sessionStorage.getItem('pendingAction') : null;
      if (pendingAction === 'new') {
        openNewInterfaceDialog();
        // Clear the pending action
        sessionStorage.removeItem('pendingAction');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, []);

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading VyOS configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-6 hidden md:block text-cyan-400">Interfaces</h1>
          <p className="text-slate-400">Manage your network connectivity and interface settings</p>
        </div>
        <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={openNewInterfaceDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Interface
        </Button>
      </div>
      
      <div className="grid gap-6">
        {config?.interfaces ? (
          <>
            {Object.entries(config.interfaces).flatMap(([type, interfaces]) => {
              if (typeof interfaces === 'object' && interfaces !== null) {
                return Object.entries(interfaces).map(([name, details]: [string, any]) => {
                  const networkInfo = getInterfaceNetworkInfo(name);
                  const isDhcp = isDhcpInterface(details);
                  
                  return (
                  <Card key={`${type}-${name}`} className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 overflow-hidden shadow-lg hover:shadow-cyan-900/10 transition-all duration-200">
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full md:w-64 bg-slate-800 p-6 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-1 text-xs rounded-full bg-slate-700 text-slate-300">{type}</span>
                            {!details.disable ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-green-900/40 text-green-400">Enabled</span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-red-900/40 text-red-400">Disabled</span>
                            )}
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
                          {details.description && (
                            <p className="text-sm text-slate-400 mb-4">{details.description}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center mt-4">
                          <div className={`w-2 h-2 rounded-full ${!details.disable ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                          <span className="text-xs font-medium text-slate-400">
                            {type === 'ethernet' && details['hw-id'] ? `MAC: ${details['hw-id']}` : ''}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex-1 p-6 border-t md:border-t-0 md:border-l border-slate-700">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="text-sm font-medium text-slate-400 mb-2">IP Addresses</h4>
                            {details.address ? (
                              <div className="space-y-2">
                                {Array.isArray(details.address) ? (
                                  details.address.map((addr: string, i: number) => (
                                    <div key={i} className="px-3 py-2 bg-slate-800 rounded-md text-white text-sm">
                                      {addr}
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-3 py-2 bg-slate-800 rounded-md text-white text-sm">
                                    {isDhcp ? (
                                      <div className="flex items-center justify-between">
                                        <span>{details.address}</span>
                                        <span className="px-1.5 py-0.5 text-xs bg-blue-900/40 text-blue-300 rounded">DHCP</span>
                                      </div>
                                    ) : (
                                      details.address
                                    )}
                                  </div>
                                )}
                                
                                {networkInfo && (
                                  <div className="mt-2">
                                    <h4 className="text-sm font-medium text-slate-400 mb-2">Network Details</h4>
                                    <div className="space-y-2">
                                      {networkInfo.map((route: any, index: number) => (
                                        <div key={index} className="px-3 py-2 bg-slate-800 rounded-md text-white text-sm">
                                          <div className="flex justify-between items-center">
                                            <span className="text-cyan-400">{route.destination}</span>
                                            <span className="px-1.5 py-0.5 text-xs bg-slate-700 text-slate-300 rounded">
                                              {route.protocol}
                                            </span>
                                          </div>
                                          <div className="mt-1 text-xs text-slate-400">
                                            Uptime: {route.uptime}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="px-3 py-2 bg-slate-800 rounded-md text-slate-400 text-sm">No IP address assigned</div>
                            )}
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-slate-400 mb-2">Configuration</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between px-3 py-2 bg-slate-800 rounded-md">
                                <span className="text-slate-400 text-sm">MTU</span>
                                <span className="text-white text-sm">{details.mtu || 'Default'}</span>
                              </div>
                              
                              {isDhcp && (
                                <div className="flex justify-between px-3 py-2 bg-slate-800 rounded-md">
                                  <span className="text-slate-400 text-sm">Address Method</span>
                                  <span className="text-white text-sm">DHCP</span>
                                </div>
                              )}
                              
                              {type === 'wireguard' && (
                                <>
                                  <div className="flex justify-between px-3 py-2 bg-slate-800 rounded-md">
                                    <span className="text-slate-400 text-sm">Port</span>
                                    <span className="text-white text-sm">{details.port || 'Default'}</span>
                                  </div>
                                  <div className="flex justify-between px-3 py-2 bg-slate-800 rounded-md">
                                    <span className="text-slate-400 text-sm">Peers</span>
                                    <span className="text-white text-sm">{details.peer ? Object.keys(details.peer).length : 0}</span>
                                  </div>
                                </>
                              )}
                              
                              {networkInfo && (
                                <div className="flex justify-between px-3 py-2 bg-slate-800 rounded-md">
                                  <span className="text-slate-400 text-sm">Connected Networks</span>
                                  <span className="text-white text-sm">{networkInfo.length}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full md:w-auto p-6 flex md:flex-col justify-end items-center gap-2 bg-slate-800 border-t md:border-t-0 md:border-l border-slate-700">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-slate-400 hover:text-white hover:bg-slate-700"
                          onClick={() => openEditInterfaceDialog(type, name, details)}
                        >
                          <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700">
                          <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                          </svg>
                          Details
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-900/30">
                          <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                  );
                });
              }
              return [];
            })}
            
            <Card 
              className="bg-slate-800/50 border-slate-700 border-dashed p-6 text-center hover:bg-slate-800/80 transition-colors cursor-pointer"
              onClick={openNewInterfaceDialog}
            >
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-cyan-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Add a new interface</h3>
                <p className="text-sm text-slate-400">Configure a new network interface for your VyOS router</p>
              </div>
            </Card>
          </>
        ) : (
          <Card className="bg-slate-800 border-slate-700 p-8 text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                <Network className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Interfaces Available</h3>
              <p className="text-sm text-slate-400 mb-6">No network interfaces have been configured on this router.</p>
              <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={openNewInterfaceDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Interface
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Edit Interface Dialog */}
      <Dialog open={editInterfaceDialogOpen} onOpenChange={setEditInterfaceDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Edit Interface: {selectedInterface?.name}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update the configuration for {selectedInterface?.type} interface {selectedInterface?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-slate-300">Description</Label>
              <Input
                id="description"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={interfaceFormData.description || ''}
                onChange={(e) => setInterfaceFormData({...interfaceFormData, description: e.target.value})}
                placeholder="Interface description"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-slate-300">IP Address</Label>
              <Input
                id="address"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={interfaceFormData.address || ''}
                onChange={(e) => setInterfaceFormData({...interfaceFormData, address: e.target.value})}
                placeholder="e.g. 192.168.1.1/24 or dhcp"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mtu" className="text-slate-300">MTU</Label>
              <Input
                id="mtu"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                type="number"
                value={interfaceFormData.mtu || ''}
                onChange={(e) => setInterfaceFormData({...interfaceFormData, mtu: e.target.value})}
                placeholder="Default: 1500"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="disabled" className="text-slate-300">Disabled</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="disabled"
                  checked={interfaceFormData.disabled || false}
                  onCheckedChange={(checked) => setInterfaceFormData({...interfaceFormData, disabled: checked})}
                />
                <Label htmlFor="disabled" className="text-slate-300">
                  {interfaceFormData.disabled ? "Interface is disabled" : "Interface is enabled"}
                </Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditInterfaceDialogOpen(false)}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={updateInterface} 
              className="bg-cyan-600 hover:bg-cyan-700"
              disabled={isUpdatingInterface}
            >
              {isUpdatingInterface ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Interface Dialog */}
      <Dialog open={newInterfaceDialogOpen} onOpenChange={setNewInterfaceDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Create New Interface</DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure a new network interface for your VyOS router
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interface-type" className="text-slate-300">Type</Label>
              <div className="col-span-3">
                <Select 
                  value={newInterfaceData.type} 
                  onValueChange={(value) => setNewInterfaceData({...newInterfaceData, type: value})}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="ethernet">Ethernet</SelectItem>
                    <SelectItem value="loopback">Loopback</SelectItem>
                    <SelectItem value="dummy">Dummy</SelectItem>
                    <SelectItem value="bridge">Bridge</SelectItem>
                    <SelectItem value="wireguard">WireGuard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interface-name" className="text-slate-300">Name</Label>
              <Input
                id="interface-name"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={newInterfaceData.name}
                onChange={(e) => setNewInterfaceData({...newInterfaceData, name: e.target.value})}
                placeholder={newInterfaceData.type === 'ethernet' ? 'eth0' : 
                  newInterfaceData.type === 'loopback' ? 'lo' : 
                  newInterfaceData.type === 'wireguard' ? 'wg0' : 
                  newInterfaceData.type === 'bridge' ? 'br0' : 'interface name'}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interface-description" className="text-slate-300">Description</Label>
              <Input
                id="interface-description"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={newInterfaceData.description}
                onChange={(e) => setNewInterfaceData({...newInterfaceData, description: e.target.value})}
                placeholder="Interface description"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interface-address" className="text-slate-300">IP Address</Label>
              <Input
                id="interface-address"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={newInterfaceData.address}
                onChange={(e) => setNewInterfaceData({...newInterfaceData, address: e.target.value})}
                placeholder="e.g. 192.168.1.1/24 or dhcp"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interface-disabled" className="text-slate-300">Disabled</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="interface-disabled"
                  checked={newInterfaceData.disabled}
                  onCheckedChange={(checked) => setNewInterfaceData({...newInterfaceData, disabled: checked})}
                />
                <Label htmlFor="interface-disabled" className="text-slate-300">
                  {newInterfaceData.disabled ? "Interface is disabled" : "Interface is enabled"}
                </Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setNewInterfaceDialogOpen(false)}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={createNewInterface} 
              className="bg-cyan-600 hover:bg-cyan-700"
              disabled={isUpdatingInterface}
            >
              {isUpdatingInterface ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Interface
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 