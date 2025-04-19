"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Clock, Plus, RefreshCw, Trash2, Save } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { executeSavingMethod } from "@/app/utils"

interface NTPServer {
  name: string;
  pool?: boolean;
  noselect?: boolean;
  prefer?: boolean;
}

interface NTPConfig {
  server?: Record<string, any>;
  'allow-clients'?: {
    address?: string[];
    network?: string[];
  };
  'listen-address'?: string[];
}

export default function NTPPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [config, setConfig] = useState<any>(null)
  const [ntpConfig, setNtpConfig] = useState<NTPConfig | null>(null)
  const [ntpStatus, setNtpStatus] = useState<any>(null)
  const [newServerDialogOpen, setNewServerDialogOpen] = useState(false)
  const [newServerData, setNewServerData] = useState({
    name: '',
    pool: false,
    noselect: false,
    prefer: false
  })
  const [isAddingServer, setIsAddingServer] = useState(false)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchConfig = async () => {
    executeSavingMethod();
    setIsLoading(true)
    try {
      const response = await fetch(`${apiUrl}/api/config`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success === true && data.data) {
        setConfig(data.data);
        const ntp = data.data.service?.ntp || null;
        setNtpConfig(ntp);
        
        // If NTP config exists, consider the service active
        if (ntp) {
          setNtpStatus({ active: true });
        } else {
          setNtpStatus({ active: false });
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

  // Fetch NTP status - fallback function if the API provides actual status
  const fetchNTPStatus = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/ntp/status`);
      
      if (!response.ok) {
        // If 404, use the config-based status detection instead (already set in fetchConfig)
        if (response.status === 404) {
          return;
        }
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success === true) {
        setNtpStatus(data.data);
      } else {
        throw new Error(data.error || "Failed to load NTP status");
      }
    } catch (error) {
      console.error("Error fetching NTP status:", error);
      // Don't update ntpStatus here as we're using config-based detection
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchConfig(), fetchNTPStatus()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchConfig(), fetchNTPStatus()]);
  }, []);

  const addNtpServer = async () => {
    if (!newServerData.name) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Server name or IP address is required"
      });
      return;
    }

    setIsAddingServer(true);

    try {
      // Create base NTP server configuration
      const baseUrl = `service/ntp/server/${encodeURIComponent(newServerData.name)}`;
      
      // Set the server
      await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(baseUrl)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });

      // Set pool if enabled
      if (newServerData.pool) {
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(baseUrl)}/pool`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }

      // Set noselect if enabled
      if (newServerData.noselect) {
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(baseUrl)}/noselect`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }

      // Set prefer if enabled
      if (newServerData.prefer) {
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(baseUrl)}/prefer`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }

      toast({
        title: "NTP Server Added",
        description: `Successfully added NTP server: ${newServerData.name}`
      });

      setNewServerDialogOpen(false);
      setNewServerData({
        name: '',
        pool: false,
        noselect: false,
        prefer: false
      });

      refreshData();
    } catch (error) {
      console.error("Error adding NTP server:", error);
      toast({
        variant: "destructive",
        title: "Failed to add NTP server",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsAddingServer(false);
    }
  };

  const deleteNtpServer = async (serverName: string) => {
    try {
      const url = `service/ntp/server/${encodeURIComponent(serverName)}`;
      
      const response = await fetch(`${apiUrl}/api/configure/delete/${encodeURIComponent(url)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }

      toast({
        title: "NTP Server Removed",
        description: `Successfully removed NTP server: ${serverName}`
      });

      refreshData();
    } catch (error) {
      console.error("Error removing NTP server:", error);
      toast({
        variant: "destructive",
        title: "Failed to remove NTP server",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    }
  };

  const getNtpServers = (): NTPServer[] => {
    if (!ntpConfig || !ntpConfig.server) return [];

    return Object.entries(ntpConfig.server).map(([name, config]) => ({
      name,
      pool: 'pool' in config,
      noselect: 'noselect' in config,
      prefer: 'prefer' in config
    }));
  };

  const getClientNetworks = (): string[] => {
    if (!ntpConfig || !ntpConfig['allow-clients']) return [];

    const networks: string[] = [];
    
    if (ntpConfig['allow-clients'].address) {
      networks.push(...ntpConfig['allow-clients'].address);
    }
    
    if (ntpConfig['allow-clients'].network) {
      networks.push(...ntpConfig['allow-clients'].network);
    }
    
    return networks;
  };

  const getListenAddresses = (): string[] => {
    if (!ntpConfig || !ntpConfig['listen-address']) return [];
    return ntpConfig['listen-address'];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading NTP configuration...</p>
        </div>
      </div>
    );
  }

  const ntpServers = getNtpServers();
  const clientNetworks = getClientNetworks();
  const listenAddresses = getListenAddresses();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">NTP Service</h1>
          <p className="text-slate-400">Configure and manage NTP time synchronization</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">
        {/* Main content */}
        <Card className="bg-slate-800 border-slate-700 xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              NTP Servers
            </CardTitle>
            <CardDescription className="text-slate-400">
              {ntpServers.length} NTP servers configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ntpServers.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>No NTP servers configured</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 bg-slate-700 hover:bg-slate-600"
                  onClick={() => setNewServerDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add NTP Server
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader className="bg-slate-900">
                    <TableRow>
                      <TableHead className="text-cyan-400">Server</TableHead>
                      <TableHead className="text-cyan-400">Options</TableHead>
                      <TableHead className="text-cyan-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ntpServers.map((server) => (
                      <TableRow key={server.name} className="hover:bg-slate-700/50">
                        <TableCell className="font-medium text-slate-200">{server.name}</TableCell>
                        <TableCell className="text-slate-300">
                          <div className="flex gap-2">
                            {server.pool && <Badge className="bg-blue-700">Pool</Badge>}
                            {server.prefer && <Badge className="bg-green-700">Preferred</Badge>}
                            {server.noselect && <Badge className="bg-amber-700">No Select</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            onClick={() => deleteNtpServer(server.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-end">
                  <Button 
                    className="bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => setNewServerDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add NTP Server
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                NTP Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md bg-slate-900 p-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Service Status</span>
                    <Badge className={ntpStatus?.active ? "bg-green-700" : "bg-red-700"}>
                      {ntpStatus?.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Configured Servers</span>
                    <span className="text-white font-medium">{ntpServers.length}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Client Networks</span>
                    <span className="text-white font-medium">{clientNetworks.length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Accordion type="single" collapsible className="w-full bg-slate-800 rounded-md border border-slate-700">
            <AccordionItem value="clients">
              <AccordionTrigger className="px-4 text-cyan-400 hover:text-cyan-300 hover:no-underline">
                Client Access
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {clientNetworks.length === 0 ? (
                  <p className="text-sm text-slate-400 mb-2">No client networks configured</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-400 mb-2">Allowed client networks:</p>
                    <ul className="space-y-1">
                      {clientNetworks.map((network, idx) => (
                        <li key={idx} className="text-sm text-slate-300 bg-slate-900 rounded p-2">
                          {network}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="listen">
              <AccordionTrigger className="px-4 text-cyan-400 hover:text-cyan-300 hover:no-underline">
                Listen Addresses
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {listenAddresses.length === 0 ? (
                  <p className="text-sm text-slate-400 mb-2">No specific listen addresses configured</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-400 mb-2">NTP listens on:</p>
                    <ul className="space-y-1">
                      {listenAddresses.map((address, idx) => (
                        <li key={idx} className="text-sm text-slate-300 bg-slate-900 rounded p-2">
                          {address}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* New Server Dialog */}
      <Dialog open={newServerDialogOpen} onOpenChange={setNewServerDialogOpen}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Add NTP Server</DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure a new NTP server for time synchronization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="server-name" className="text-white">Server Address</Label>
              <Input
                id="server-name"
                placeholder="pool.ntp.org"
                className="bg-slate-900 border-slate-700 text-white"
                value={newServerData.name}
                onChange={(e) => setNewServerData({ ...newServerData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="pool-switch" className="text-white flex-1">NTP Pool</Label>
                <Switch
                  id="pool-switch"
                  checked={newServerData.pool}
                  onCheckedChange={(checked) => setNewServerData({ ...newServerData, pool: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="noselect-switch" className="text-white flex-1">Noselect</Label>
                <Switch
                  id="noselect-switch"
                  checked={newServerData.noselect}
                  onCheckedChange={(checked) => setNewServerData({ ...newServerData, noselect: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="prefer-switch" className="text-white flex-1">Prefer</Label>
                <Switch
                  id="prefer-switch"
                  checked={newServerData.prefer}
                  onCheckedChange={(checked) => setNewServerData({ ...newServerData, prefer: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewServerDialogOpen(false)}
              className="bg-slate-700 hover:bg-slate-600"
            >
              Cancel
            </Button>
            <Button 
              onClick={addNtpServer}
              disabled={isAddingServer}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {isAddingServer ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 