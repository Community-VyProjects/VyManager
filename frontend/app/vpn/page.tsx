"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Plus, Users, Key, Radio, Network, Shield, AlertCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import QRCode from "react-qr-code"

export default function VPNPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [config, setConfig] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("wireguard")
  const [wireguardInterfaces, setWireguardInterfaces] = useState<any[]>([])
  const [newInterfaceDialogOpen, setNewInterfaceDialogOpen] = useState(false)
  const [newInterfaceData, setNewInterfaceData] = useState({
    name: '',
    address: '',
    port: '',
    mtu: '',
    description: ''
  })
  const [isCreatingInterface, setIsCreatingInterface] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedInterface, setSelectedInterface] = useState<any>(null)
  const [selectedPeer, setSelectedPeer] = useState<string>("")
  const [clientConfig, setClientConfig] = useState<string>("")

  const fetchConfig = async () => {
    setIsLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/config`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success === true && data.data) {
        setConfig(data.data);
        // Extract WireGuard interfaces
        if (data.data.interfaces?.wireguard) {
          const interfaces = Object.entries(data.data.interfaces.wireguard).map(([name, config]) => ({
            name,
            config
          }));
          setWireguardInterfaces(interfaces);
        }
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
      setIsLoading(false);
    }
  };

  const createWireGuardInterface = async () => {
    if (!newInterfaceData.name) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Interface name is required"
      });
      return;
    }

    if (!newInterfaceData.address) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Interface address is required"
      });
      return;
    }

    setIsCreatingInterface(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // Create interface
      const createResponse = await fetch(`${apiUrl}/api/configure/set/interfaces/wireguard/${encodeURIComponent(newInterfaceData.name)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create interface: ${createResponse.statusText}`);
      }

      // Set interface address
      await fetch(`${apiUrl}/api/configure/set/interfaces/wireguard/${encodeURIComponent(newInterfaceData.name)}/address?value=${encodeURIComponent(newInterfaceData.address)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });

      // Set description if provided
      if (newInterfaceData.description) {
        await fetch(`${apiUrl}/api/configure/set/interfaces/wireguard/${encodeURIComponent(newInterfaceData.name)}/description?value=${encodeURIComponent(newInterfaceData.description)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }

      // Set port if provided
      if (newInterfaceData.port) {
        await fetch(`${apiUrl}/api/configure/set/interfaces/wireguard/${encodeURIComponent(newInterfaceData.name)}/port?value=${encodeURIComponent(newInterfaceData.port)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }

      // Set MTU if provided
      if (newInterfaceData.mtu) {
        await fetch(`${apiUrl}/api/configure/set/interfaces/wireguard/${encodeURIComponent(newInterfaceData.name)}/mtu?value=${encodeURIComponent(newInterfaceData.mtu)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }

      // Generate a private key
      const privateKeyResponse = await fetch(`${apiUrl}/api/operations/generate-wireguard-key`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });

      if (privateKeyResponse.ok) {
        const keyData = await privateKeyResponse.json();
        if (keyData.success && keyData.data.private_key) {
          await fetch(`${apiUrl}/api/configure/set/interfaces/wireguard/${encodeURIComponent(newInterfaceData.name)}/private-key?value=${encodeURIComponent(keyData.data.private_key)}`, {
            method: 'POST',
            headers: {
              'accept': 'application/json'
            }
          });
        }
      }

      toast({
        title: "Interface Created",
        description: `Successfully created WireGuard interface: ${newInterfaceData.name}`
      });

      setNewInterfaceDialogOpen(false);
      setNewInterfaceData({
        name: '',
        address: '',
        port: '',
        mtu: '',
        description: ''
      });

      fetchConfig();
    } catch (error) {
      console.error("Error creating WireGuard interface:", error);
      toast({
        variant: "destructive",
        title: "Failed to create interface",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsCreatingInterface(false);
    }
  };

  // Generate WireGuard configuration string for QR code
  const generateWireGuardConfig = (iface: any) => {
    if (!iface || !iface.config) return null;
    
    // Base configuration
    let config = [
      '[Interface]',
      `PrivateKey = ${iface.config['private-key'] || ''}`,
      `Address = ${Array.isArray(iface.config.address) ? iface.config.address[0] : iface.config.address || ''}`,
    ];
    
    // Add DNS if configured
    if (iface.config.dns) {
      config.push(`DNS = ${iface.config.dns}`);
    }
    
    // Add peers
    if (iface.config.peer) {
      Object.entries(iface.config.peer).forEach(([peerName, peerConfig]: [string, any]) => {
        config.push('', '[Peer]');
        config.push(`PublicKey = ${peerConfig['public-key'] || ''}`);
        
        // Add allowed IPs
        const allowedIps = Array.isArray(peerConfig['allowed-ips']) 
          ? peerConfig['allowed-ips'].join(', ') 
          : peerConfig['allowed-ips'] || '0.0.0.0/0';
        config.push(`AllowedIPs = ${allowedIps}`);
        
        // Add endpoint if available
        if (peerConfig.address) {
          const port = peerConfig.port || '51820';
          config.push(`Endpoint = ${peerConfig.address}:${port}`);
        }
        
        // Add persistent keepalive if configured
        if (peerConfig['persistent-keepalive']) {
          config.push(`PersistentKeepalive = ${peerConfig['persistent-keepalive']}`);
        }
      });
    }
    
    return config.join('\n');
  };

  // Generate WireGuard client configuration string for QR code
  const generateClientConfig = (iface: any, peerName: string) => {
    if (!iface || !iface.config || !peerName) return null;
    
    const peerConfig = iface.config.peer?.[peerName];
    if (!peerConfig) return null;
    
    // Client interface configuration
    let config = [
      '[Interface]',
      // We need a client-specific private key for the client, not the server's
      // For demo/display purposes, we'll use placeholder text
      'PrivateKey = <client-private-key-goes-here>',
    ];
    
    // Set client address based on allowed IPs
    const allowedIp = Array.isArray(peerConfig['allowed-ips']) 
      ? peerConfig['allowed-ips'][0] 
      : peerConfig['allowed-ips'];
      
    config.push(`Address = ${allowedIp}`);
    
    // Add DNS if needed for client (optional)
    config.push('DNS = 1.1.1.1, 8.8.8.8');
    
    // Add the server as a peer
    config.push('', '[Peer]');
    config.push(`PublicKey = ${iface.config['public-key'] || ''}`);
    config.push('AllowedIPs = 0.0.0.0/0');
    
    // Add server endpoint - try to determine based on global configuration
    let endpoint = '';
    
    // Use the hostname from the browser as a fallback
    if (!endpoint) {
      endpoint = window.location.hostname;
    }
    
    config.push(`Endpoint = ${endpoint}:${iface.config.port || '51820'}`);
    
    // Add persistent keepalive
    config.push('PersistentKeepalive = 25');
    
    return config.join('\n');
  };

  // Handle QR code button click
  const handleShowQrCode = (iface: any) => {
    setSelectedInterface(iface);
    
    // If there's only one peer, select it automatically
    if (iface.config.peer && Object.keys(iface.config.peer).length === 1) {
      const peerName = Object.keys(iface.config.peer)[0];
      setSelectedPeer(peerName);
      const generatedConfig = generateClientConfig(iface, peerName);
      setClientConfig(generatedConfig || "");
    } else {
      setSelectedPeer("");
      setClientConfig("");
    }
    
    setQrDialogOpen(true);
  };

  // Handle peer selection
  const handlePeerSelection = (peerName: string) => {
    setSelectedPeer(peerName);
    const generatedConfig = generateClientConfig(selectedInterface, peerName);
    setClientConfig(generatedConfig || "");
  };

  // Get QR configuration for the selected interface
  const qrConfig = useMemo(() => {
    return generateWireGuardConfig(selectedInterface);
  }, [selectedInterface]);

  useEffect(() => {
    fetchConfig();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading VPN configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">VPN</h1>
          <p className="text-slate-400">Manage your VPN connections and security</p>
        </div>
        <Button 
          className="bg-slate-600 hover:bg-slate-600 cursor-not-allowed"
          onClick={() => {}} 
          disabled
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Interface
        </Button>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-2 w-[400px]">
          <TabsTrigger value="wireguard">
            <Shield className="h-4 w-4 mr-2" />
            WireGuard
          </TabsTrigger>
          <TabsTrigger value="openvpn" disabled>
            <Network className="h-4 w-4 mr-2" />
            OpenVPN
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="wireguard">
          <div className="grid gap-4">
            {wireguardInterfaces.length > 0 ? (
              wireguardInterfaces.map((iface) => (
                <Card key={iface.name} className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-cyan-400">{iface.name}</CardTitle>
                        <CardDescription className="text-slate-400">
                          {iface.config.description || "WireGuard Interface"}
                        </CardDescription>
                      </div>
                      <Badge className="bg-green-600">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-slate-900 p-3 rounded-md">
                          <p className="text-xs text-slate-500 mb-1">Interface Address</p>
                          <p className="text-sm font-mono text-slate-200">
                            {Array.isArray(iface.config.address) 
                              ? iface.config.address.join(', ') 
                              : iface.config.address || 'Not configured'}
                          </p>
                        </div>
                        <div className="bg-slate-900 p-3 rounded-md">
                          <p className="text-xs text-slate-500 mb-1">Listen Port</p>
                          <p className="text-sm font-mono text-slate-200">
                            {iface.config.port || 'Default'}
                          </p>
                        </div>
                        <div className="bg-slate-900 p-3 rounded-md">
                          <p className="text-xs text-slate-500 mb-1">MTU</p>
                          <p className="text-sm font-mono text-slate-200">
                            {iface.config.mtu || 'Default'}
                          </p>
                        </div>
                      </div>
                      
                      {iface.config.peer && (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="peers" className="border-slate-700">
                            <AccordionTrigger className="text-slate-300 hover:text-white">
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-2" />
                                <span>Peers ({Object.keys(iface.config.peer).length})</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <Table>
                                <TableHeader className="bg-slate-900">
                                  <TableRow>
                                    <TableHead className="text-cyan-400">Name</TableHead>
                                    <TableHead className="text-cyan-400">Allowed IPs</TableHead>
                                    <TableHead className="text-cyan-400">Endpoint</TableHead>
                                    <TableHead className="text-cyan-400 w-[100px]">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {Object.entries(iface.config.peer).map(([peerName, peerConfig]: [string, any]) => (
                                    <TableRow key={peerName} className="hover:bg-slate-700/50">
                                      <TableCell className="font-medium text-slate-200">
                                        {peerName}
                                      </TableCell>
                                      <TableCell className="font-mono text-xs text-slate-300">
                                        {Array.isArray(peerConfig['allowed-ips']) 
                                          ? peerConfig['allowed-ips'].join(', ') 
                                          : peerConfig['allowed-ips'] || '-'}
                                      </TableCell>
                                      <TableCell>
                                        {peerConfig.address ? (
                                          <span className="font-mono text-xs text-slate-300">
                                            {peerConfig.address}:{peerConfig.port || '51820'}
                                          </span>
                                        ) : (
                                          <Badge variant="outline" className="text-slate-400 border-slate-600">
                                            Client
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white">
                                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300">
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
                              <div className="mt-4 flex justify-end">
                                <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                                  <Plus className="h-3 w-3 mr-2" />
                                  Add Peer
                                </Button>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}

                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="keys" className="border-slate-700">
                          <AccordionTrigger className="text-slate-300 hover:text-white">
                            <div className="flex items-center">
                              <Key className="h-4 w-4 mr-2" />
                              <span>Security Keys</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="bg-slate-900 p-3 rounded-md mb-3">
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-xs text-slate-500">Private Key</p>
                                <Button size="sm" variant="ghost" className="h-6 text-xs text-slate-400">
                                  Reset
                                </Button>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-mono text-slate-200 truncate">
                                  {iface.config['private-key'] 
                                    ? '********************' 
                                    : 'Not configured'}
                                </p>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400">
                                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                  </svg>
                                </Button>
                              </div>
                            </div>
                            
                            <div className="bg-slate-900 p-3 rounded-md">
                              <p className="text-xs text-slate-500 mb-1">Public Key</p>
                              <p className="text-sm font-mono text-slate-200 break-all">
                                {iface.config['public-key'] || 'Generated from private key'}
                              </p>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-slate-700 py-3">
                    <div className="flex justify-between w-full">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        onClick={() => handleShowQrCode(iface)}
                      >
                        QR Code
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="border-red-900 bg-red-950/30 text-red-400 hover:bg-red-900/50 hover:text-red-200">
                          Delete
                        </Button>
                        <Button variant="outline" size="sm" className="border-amber-700 bg-amber-950/30 text-amber-400 hover:bg-amber-900/50 hover:text-amber-200">
                          Restart
                        </Button>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="text-center py-12">
                  <Shield className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-300 mb-2">No WireGuard Interfaces</h3>
                  <p className="text-slate-400 mb-4">You haven't configured any WireGuard interfaces yet.</p>
                  <Button className="bg-cyan-600 hover:bg-cyan-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add WireGuard Interface
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="openvpn">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="text-center py-12">
              <Network className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">OpenVPN Configuration</h3>
              <p className="text-slate-400 mb-4">OpenVPN support coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* New Interface Dialog */}
      <Dialog open={newInterfaceDialogOpen} onOpenChange={setNewInterfaceDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">New WireGuard Interface</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new WireGuard interface for secure VPN connectivity
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-slate-300">Interface Name</Label>
              <Input
                id="name"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={newInterfaceData.name}
                onChange={(e) => setNewInterfaceData({...newInterfaceData, name: e.target.value})}
                placeholder="e.g. wg0"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-slate-300">IP Address</Label>
              <Input
                id="address"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={newInterfaceData.address}
                onChange={(e) => setNewInterfaceData({...newInterfaceData, address: e.target.value})}
                placeholder="e.g. 10.1.0.1/24"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="port" className="text-slate-300">Listen Port</Label>
              <Input
                id="port"
                type="number"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={newInterfaceData.port}
                onChange={(e) => setNewInterfaceData({...newInterfaceData, port: e.target.value})}
                placeholder="e.g. 51820 (optional)"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mtu" className="text-slate-300">MTU</Label>
              <Input
                id="mtu"
                type="number"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={newInterfaceData.mtu}
                onChange={(e) => setNewInterfaceData({...newInterfaceData, mtu: e.target.value})}
                placeholder="e.g. 1420 (optional)"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-slate-300">Description</Label>
              <Input
                id="description"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={newInterfaceData.description}
                onChange={(e) => setNewInterfaceData({...newInterfaceData, description: e.target.value})}
                placeholder="e.g. VPN to office (optional)"
              />
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
              onClick={createWireGuardInterface} 
              className="bg-cyan-600 hover:bg-cyan-700"
              disabled={isCreatingInterface}
            >
              {isCreatingInterface ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Interface
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">
              WireGuard Client Config - {selectedInterface?.name || ''}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Generate a client configuration to connect to this WireGuard interface
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {selectedInterface?.config?.peer && Object.keys(selectedInterface.config.peer).length > 0 ? (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="peer" className="text-slate-300">Select Peer</Label>
                  <div className="col-span-3">
                    <select 
                      id="peer"
                      className="w-full bg-slate-800 border-slate-700 text-white rounded-md px-3 py-2"
                      value={selectedPeer}
                      onChange={(e) => handlePeerSelection(e.target.value)}
                    >
                      <option value="">Select a peer...</option>
                      {Object.keys(selectedInterface.config.peer).map(peerName => (
                        <option key={peerName} value={peerName}>{peerName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {selectedPeer && clientConfig ? (
                  <>
                    <div className="bg-white p-4 rounded-md mb-4 flex items-center justify-center">
                      <QRCode 
                        value={clientConfig}
                        size={256}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        viewBox={`0 0 256 256`}
                      />
                    </div>
                    <div className="w-full mt-2">
                      <p className="text-xs text-slate-400 mb-2">Client Configuration:</p>
                      <div className="bg-slate-800 p-3 rounded-md max-h-[150px] overflow-y-auto">
                        <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                          {clientConfig}
                        </pre>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        Note: Replace &lt;client-private-key-goes-here&gt; with a generated private key. 
                        This can be done in the WireGuard app or using the wg command.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-slate-400">
                      Select a peer to generate a client configuration
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">No Peers Configured</h3>
                <p className="text-slate-400 mb-4">
                  This interface doesn't have any peers configured yet.
                  Add a peer first to generate a client configuration.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setQrDialogOpen(false)}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Close
            </Button>
            {clientConfig && (
              <Button 
                className="bg-cyan-600 hover:bg-cyan-700"
                onClick={() => {
                  if (clientConfig) {
                    navigator.clipboard.writeText(clientConfig);
                    toast({
                      title: "Copied",
                      description: "WireGuard client configuration copied to clipboard"
                    });
                  }
                }}
              >
                Copy Config
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 