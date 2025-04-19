"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, RefreshCw, Plus, ArrowLeftRight, ArrowUpDown, Info } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { executeSavingMethod } from "../utils"

export default function NatPage() {
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [config, setConfig] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("source")
  const [newNatRuleDialogOpen, setNewNatRuleDialogOpen] = useState(false)
  const [isCreatingNatRule, setIsCreatingNatRule] = useState(false)
  const [natType, setNatType] = useState<"source" | "destination">("source")
  const [newNatRuleData, setNewNatRuleData] = useState({
    ruleNumber: '',
    description: '',
    outboundInterface: '',
    inboundInterface: '',
    sourceAddress: '',
    destinationAddress: '',
    translationAddress: '',
    protocol: ''
  })
  const [isRefreshing, setIsRefreshing] = useState(false)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchConfig = async () => {
    setIsLoadingConfig(true)
    try {
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

  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchConfig();
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Open dialog to create a new NAT rule
  const openNewNatRuleDialog = (type: "source" | "destination") => {
    setNatType(type);
    setNewNatRuleData({
      ruleNumber: '',
      description: '',
      outboundInterface: '',
      inboundInterface: '',
      sourceAddress: '',
      destinationAddress: '',
      translationAddress: '',
      protocol: ''
    });
    setNewNatRuleDialogOpen(true);
  };

  // Create a new NAT rule
  const createNatRule = async () => {
    if (!newNatRuleData.ruleNumber) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Rule number is required"
      });
      return;
    }

    setIsCreatingNatRule(true);

    try {
      const basePath = `nat/${natType}/rule/${newNatRuleData.ruleNumber}`;
      
      // Create the rule (empty node)
      const createResponse = await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(basePath)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });
      
      if (!createResponse.ok) {
        throw new Error(`Failed to create rule: ${createResponse.statusText}`);
      }

      // Set description if provided
      if (newNatRuleData.description) {
        const descPath = `${basePath}/description`;
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(descPath)}?value=${encodeURIComponent(newNatRuleData.description)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }

      // Set interfaces based on NAT type
      if (natType === "source" && newNatRuleData.outboundInterface) {
        const interfacePath = `${basePath}/outbound-interface/name`;
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(interfacePath)}?value=${encodeURIComponent(newNatRuleData.outboundInterface)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      } else if (natType === "destination" && newNatRuleData.inboundInterface) {
        const interfacePath = `${basePath}/inbound-interface/name`;
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(interfacePath)}?value=${encodeURIComponent(newNatRuleData.inboundInterface)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }

      // Set source address if provided
      if (newNatRuleData.sourceAddress) {
        const sourcePath = `${basePath}/source/address`;
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(sourcePath)}?value=${encodeURIComponent(newNatRuleData.sourceAddress)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }

      // Set destination address if provided
      if (newNatRuleData.destinationAddress) {
        const destPath = `${basePath}/destination/address`;
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(destPath)}?value=${encodeURIComponent(newNatRuleData.destinationAddress)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }

      // Set translation address
      if (newNatRuleData.translationAddress) {
        const translationPath = `${basePath}/translation/address`;
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(translationPath)}?value=${encodeURIComponent(newNatRuleData.translationAddress)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }

      // Set protocol if provided
      if (newNatRuleData.protocol) {
        const protocolPath = `${basePath}/protocol`;
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(protocolPath)}?value=${encodeURIComponent(newNatRuleData.protocol)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }

      toast({
        title: "NAT Rule Created",
        description: `Successfully created ${natType} NAT rule ${newNatRuleData.ruleNumber}`
      });

      executeSavingMethod();
            
      setNewNatRuleDialogOpen(false);
      refreshData();
    } catch (error) {
      console.error("Error creating NAT rule:", error);
      toast({
        variant: "destructive",
        title: "Error creating NAT rule",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsCreatingNatRule(false);
    }
  };

  // Delete a NAT rule
  const deleteNatRule = async (type: string, ruleNumber: string) => {
    try {
      const rulePath = `nat/${type}/rule/${ruleNumber}`;
      const response = await fetch(`${apiUrl}/api/configure/delete/${encodeURIComponent(rulePath)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete rule: ${response.statusText}`);
      }

      toast({
        title: "NAT Rule Deleted",
        description: `Successfully deleted ${type} NAT rule ${ruleNumber}`
      });

      executeSavingMethod();

      refreshData();
    } catch (error) {
      console.error("Error deleting NAT rule:", error);
      toast({
        variant: "destructive",
        title: "Error deleting NAT rule",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    }
  };

  // Get source NAT rules
  const getSourceNatRules = () => {
    if (!config?.nat?.source?.rule) return [];
    
    return Object.entries(config.nat.source.rule).map(([id, rule]: [string, any]) => ({
      id,
      ...rule
    }));
  };

  // Get destination NAT rules
  const getDestinationNatRules = () => {
    if (!config?.nat?.destination?.rule) return [];
    
    return Object.entries(config.nat.destination.rule).map(([id, rule]: [string, any]) => ({
      id,
      ...rule
    }));
  };

  // Get all interface names for dropdowns
  const getInterfaceNames = () => {
    const interfaces: string[] = [];
    
    if (config?.interfaces) {
      // Ethernet interfaces
      if (config.interfaces.ethernet) {
        interfaces.push(...Object.keys(config.interfaces.ethernet).map(name => `eth${name}`));
      }
      
      // WireGuard interfaces
      if (config.interfaces.wireguard) {
        interfaces.push(...Object.keys(config.interfaces.wireguard).map(name => `wg${name}`));
      }
      
      // Other interface types can be added here
    }
    
    return interfaces;
  };

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading NAT configuration...</p>
        </div>
      </div>
    );
  }

  const sourceNatRules = getSourceNatRules();
  const destinationNatRules = getDestinationNatRules();
  const interfaceNames = getInterfaceNames();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">Network Address Translation</h1>
          <p className="text-slate-400">Manage source and destination NAT rules</p>
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

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start mb-6">
          <TabsTrigger value="source">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Source NAT
          </TabsTrigger>
          <TabsTrigger value="destination">
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Destination NAT
          </TabsTrigger>
        </TabsList>

        {/* Source NAT Tab */}
        <TabsContent value="source" className="space-y-6">
          <div className="flex justify-end mb-4">
            <Button
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={() => openNewNatRuleDialog("source")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Source NAT Rule
            </Button>
          </div>

          {sourceNatRules.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700 p-8 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                  <Info className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Source NAT Rules Defined</h3>
                <p className="text-sm text-slate-400 mb-6">You haven't configured any source NAT rules yet. Source NAT is typically used to modify the source address of outgoing packets.</p>
                <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => openNewNatRuleDialog("source")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Source NAT Rule
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-cyan-400">Source NAT Rules</CardTitle>
                <CardDescription className="text-slate-400">
                  Rules for modifying source addresses of outgoing packets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="bg-slate-900">
                    <TableRow>
                      <TableHead className="text-cyan-400">Rule</TableHead>
                      <TableHead className="text-cyan-400">Description</TableHead>
                      <TableHead className="text-cyan-400">Source</TableHead>
                      <TableHead className="text-cyan-400">Translation</TableHead>
                      <TableHead className="text-cyan-400">Interface</TableHead>
                      <TableHead className="text-cyan-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceNatRules.map((rule) => (
                      <TableRow key={rule.id} className="hover:bg-slate-700/50">
                        <TableCell className="font-medium text-white">{rule.id}</TableCell>
                        <TableCell className="text-slate-300">{rule.description || "-"}</TableCell>
                        <TableCell>
                          {rule.source?.address ? (
                            <Badge className="bg-blue-700">{rule.source.address}</Badge>
                          ) : rule.source?.group ? (
                            <>
                              {rule.source.group['address-group'] && (
                                <Badge className="bg-purple-700">Group: {rule.source.group['address-group']}</Badge>
                              )}
                              {rule.source.group['network-group'] && (
                                <Badge className="bg-cyan-700">Network: {rule.source.group['network-group']}</Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400">Any</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {rule.translation?.address ? (
                            <Badge className="bg-amber-700">{rule.translation.address}</Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {rule['outbound-interface']?.name ? (
                            <Badge className="bg-green-700">{rule['outbound-interface'].name}</Badge>
                          ) : (
                            <span className="text-slate-400">Any</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-red-900/30 hover:bg-red-900/50 text-red-300 border-red-900"
                            onClick={() => deleteNatRule("source", rule.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Destination NAT Tab */}
        <TabsContent value="destination" className="space-y-6">
          <div className="flex justify-end mb-4">
            <Button
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={() => openNewNatRuleDialog("destination")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Destination NAT Rule
            </Button>
          </div>

          {destinationNatRules.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700 p-8 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                  <Info className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Destination NAT Rules Defined</h3>
                <p className="text-sm text-slate-400 mb-6">You haven't configured any destination NAT rules yet. Destination NAT is typically used to redirect incoming traffic to internal servers.</p>
                <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => openNewNatRuleDialog("destination")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Destination NAT Rule
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-cyan-400">Destination NAT Rules</CardTitle>
                <CardDescription className="text-slate-400">
                  Rules for modifying destination addresses of incoming packets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="bg-slate-900">
                    <TableRow>
                      <TableHead className="text-cyan-400">Rule</TableHead>
                      <TableHead className="text-cyan-400">Description</TableHead>
                      <TableHead className="text-cyan-400">Destination</TableHead>
                      <TableHead className="text-cyan-400">Translation</TableHead>
                      <TableHead className="text-cyan-400">Interface</TableHead>
                      <TableHead className="text-cyan-400">Protocol</TableHead>
                      <TableHead className="text-cyan-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {destinationNatRules.map((rule) => (
                      <TableRow key={rule.id} className="hover:bg-slate-700/50">
                        <TableCell className="font-medium text-white">{rule.id}</TableCell>
                        <TableCell className="text-slate-300">{rule.description || "-"}</TableCell>
                        <TableCell>
                          {rule.destination?.address ? (
                            <Badge className="bg-blue-700">{rule.destination.address}</Badge>
                          ) : rule.destination?.group ? (
                            <>
                              {rule.destination.group['address-group'] && (
                                <Badge className="bg-purple-700">Group: {rule.destination.group['address-group']}</Badge>
                              )}
                              {rule.destination.group['port-group'] && (
                                <Badge className="bg-amber-700">Ports: {rule.destination.group['port-group']}</Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400">Any</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {rule.translation?.address ? (
                            <Badge className="bg-green-700">{rule.translation.address}</Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {rule['inbound-interface']?.name ? (
                            <Badge className="bg-teal-700">{rule['inbound-interface'].name}</Badge>
                          ) : rule['inbound-interface']?.group ? (
                            <Badge className="bg-indigo-700">Group: {rule['inbound-interface'].group}</Badge>
                          ) : (
                            <span className="text-slate-400">Any</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {rule.protocol ? (
                            <Badge className="bg-cyan-700">{rule.protocol}</Badge>
                          ) : (
                            <span className="text-slate-400">Any</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-red-900/30 hover:bg-red-900/50 text-red-300 border-red-900"
                            onClick={() => deleteNatRule("destination", rule.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* New NAT Rule Dialog */}
      <Dialog open={newNatRuleDialogOpen} onOpenChange={setNewNatRuleDialogOpen}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Add {natType === "source" ? "Source" : "Destination"} NAT Rule</DialogTitle>
            <DialogDescription className="text-slate-400">
              {natType === "source" 
                ? "Create a new source NAT rule to modify the source address of outgoing packets."
                : "Create a new destination NAT rule to modify the destination address of incoming packets."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rule-number" className="text-white">Rule Number</Label>
                <Input
                  id="rule-number"
                  placeholder="e.g. 10"
                  className="bg-slate-900 border-slate-700 text-white"
                  value={newNatRuleData.ruleNumber}
                  onChange={(e) => setNewNatRuleData({ ...newNatRuleData, ruleNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protocol" className="text-white">Protocol (Optional)</Label>
                <Select
                  value={newNatRuleData.protocol}
                  onValueChange={(value) => setNewNatRuleData({ ...newNatRuleData, protocol: value })}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Select protocol" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                    <SelectItem value="icmp">ICMP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Enter a description for this rule"
                className="bg-slate-900 border-slate-700 text-white"
                value={newNatRuleData.description}
                onChange={(e) => setNewNatRuleData({ ...newNatRuleData, description: e.target.value })}
              />
            </div>
            
            {natType === "source" ? (
              <div className="space-y-2">
                <Label htmlFor="outbound-interface" className="text-white">Outbound Interface (Optional)</Label>
                <Select
                  value={newNatRuleData.outboundInterface}
                  onValueChange={(value) => setNewNatRuleData({ ...newNatRuleData, outboundInterface: value })}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Select outbound interface" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="">Any</SelectItem>
                    {interfaceNames.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="inbound-interface" className="text-white">Inbound Interface (Optional)</Label>
                <Select
                  value={newNatRuleData.inboundInterface}
                  onValueChange={(value) => setNewNatRuleData({ ...newNatRuleData, inboundInterface: value })}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Select inbound interface" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="">Any</SelectItem>
                    {interfaceNames.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source-address" className="text-white">{natType === "source" ? "Source Address" : "Source Address (Optional)"}</Label>
                <Input
                  id="source-address"
                  placeholder="e.g. 192.168.1.0/24"
                  className="bg-slate-900 border-slate-700 text-white"
                  value={newNatRuleData.sourceAddress}
                  onChange={(e) => setNewNatRuleData({ ...newNatRuleData, sourceAddress: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination-address" className="text-white">{natType === "destination" ? "Destination Address" : "Destination Address (Optional)"}</Label>
                <Input
                  id="destination-address"
                  placeholder="e.g. 203.0.113.5"
                  className="bg-slate-900 border-slate-700 text-white"
                  value={newNatRuleData.destinationAddress}
                  onChange={(e) => setNewNatRuleData({ ...newNatRuleData, destinationAddress: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="translation-address" className="text-white">Translation Address</Label>
              <Input
                id="translation-address"
                placeholder="e.g. 203.0.113.10"
                className="bg-slate-900 border-slate-700 text-white"
                value={newNatRuleData.translationAddress}
                onChange={(e) => setNewNatRuleData({ ...newNatRuleData, translationAddress: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewNatRuleDialogOpen(false)}
              className="bg-slate-700 hover:bg-slate-600"
            >
              Cancel
            </Button>
            <Button 
              onClick={createNatRule}
              disabled={isCreatingNatRule}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {isCreatingNatRule ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 