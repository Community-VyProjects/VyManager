"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Shield, Plus, Info, Filter, ArrowUpDown } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function FirewallPage() {
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [config, setConfig] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [activeRuleSet, setActiveRuleSet] = useState<string | null>(null)
  
  // New rule dialog state
  const [newRuleDialogOpen, setNewRuleDialogOpen] = useState(false)
  const [isCreatingNewRuleSet, setIsCreatingNewRuleSet] = useState(false)
  const [newRuleData, setNewRuleData] = useState({
    ruleSet: '',
    ruleNumber: '',
    action: 'drop',
    protocol: 'all',
    description: '',
    sourceAddress: '',
    destinationAddress: '',
    destinationPort: '',
    state: 'enabled'
  })
  const [isUpdatingRule, setIsUpdatingRule] = useState(false)

  const fetchConfig = async () => {
    setIsLoadingConfig(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/config`);
      
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
        
        // Set the first ruleset as active if available
        if (data.data.firewall?.name && Object.keys(data.data.firewall.name).length > 0) {
          setActiveRuleSet(Object.keys(data.data.firewall.name)[0]);
        }
        
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
  
  // Function to open new rule dialog
  const openNewRuleDialog = (ruleSet?: string) => {
    setNewRuleData({
      ruleSet: ruleSet || '',
      ruleNumber: '',
      action: 'drop',
      protocol: 'all',
      description: '',
      sourceAddress: '',
      destinationAddress: '',
      destinationPort: '',
      state: 'enabled'
    });
    setIsCreatingNewRuleSet(false);
    setNewRuleDialogOpen(true);
  };
  
  // Function to switch to creating a new rule set
  const switchToCreateNewRuleSet = () => {
    setIsCreatingNewRuleSet(true);
    setNewRuleData({
      ...newRuleData,
      ruleSet: ''
    });
  };
  
  // Function to create new firewall rule
  const createNewRule = async () => {
    if (!newRuleData.ruleSet || !newRuleData.ruleNumber) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Rule set and rule number are required"
      });
      return;
    }
    
    setIsUpdatingRule(true);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const [type, name] = newRuleData.ruleSet.split('-', 2);
      
      let basePath = '';
      if (type === 'ipv4') {
        basePath = `firewall/ipv4/${name}/filter/rule/${newRuleData.ruleNumber}`;
      } else if (type === 'ipv6') {
        basePath = `firewall/ipv6/${name}/filter/rule/${newRuleData.ruleNumber}`;
      } else if (type === 'name') {
        basePath = `firewall/name/${name}/rule/${newRuleData.ruleNumber}`;
      } else {
        // New rule set being created (it'll be a name-based one)
        basePath = `firewall/name/${newRuleData.ruleSet}/rule/${newRuleData.ruleNumber}`;
      }
      
      // Create the rule
      const createResponse = await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(basePath)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });
      
      if (!createResponse.ok) {
        throw new Error(`Failed to create rule: ${createResponse.statusText}`);
      }
      
      // Set action
      const actionPath = `${basePath}/action`;
      await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(actionPath)}?value=${encodeURIComponent(newRuleData.action)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });
      
      // Set protocol if not "all"
      if (newRuleData.protocol !== 'all') {
        const protocolPath = `${basePath}/protocol`;
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(protocolPath)}?value=${encodeURIComponent(newRuleData.protocol)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }
      
      // Set description if provided
      if (newRuleData.description) {
        const descPath = `${basePath}/description`;
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(descPath)}?value=${encodeURIComponent(newRuleData.description)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }
      
      // Set source address if provided
      if (newRuleData.sourceAddress) {
        const sourcePath = `${basePath}/source/address`;
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(sourcePath)}?value=${encodeURIComponent(newRuleData.sourceAddress)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }
      
      // Set destination address if provided
      if (newRuleData.destinationAddress) {
        const destPath = `${basePath}/destination/address`;
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(destPath)}?value=${encodeURIComponent(newRuleData.destinationAddress)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }
      
      // Set destination port if provided
      if (newRuleData.destinationPort) {
        const destPortPath = `${basePath}/destination/port`;
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(destPortPath)}?value=${encodeURIComponent(newRuleData.destinationPort)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }
      
      // Set disabled if needed
      if (newRuleData.state === 'disabled') {
        const disablePath = `${basePath}/disable`;
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(disablePath)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }
      
      toast({
        title: "Rule Created",
        description: `Successfully created rule ${newRuleData.ruleNumber} in ${newRuleData.ruleSet}`
      });
      
      setNewRuleDialogOpen(false);
      setActiveRuleSet(newRuleData.ruleSet);
      await fetchConfig(); // Refresh configuration
      
    } catch (error) {
      console.error("Error creating rule:", error);
      toast({
        variant: "destructive",
        title: "Failed to create rule",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsUpdatingRule(false);
    }
  };

  // Check if there's a pending action from the dashboard
  useEffect(() => {
    // Timeout to ensure this runs after component is fully mounted
    const timer = setTimeout(() => {
      const pendingAction = typeof window !== 'undefined' ? sessionStorage.getItem('pendingAction') : null;
      if (pendingAction === 'new') {
        openNewRuleDialog();
        // Clear the pending action
        sessionStorage.removeItem('pendingAction');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchConfig();
    
    // Check if we should navigate to a specific tab based on sessionStorage
    const activeTab = sessionStorage.getItem('firewallActiveTab');
    if (activeTab === 'groups') {
      // Navigate to firewall groups page using window location
      window.location.href = '/firewall/groups';
    }
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

  const hasFirewallRules = (
    config?.firewall?.ipv4 || 
    config?.firewall?.ipv6 || 
    (config?.firewall?.name && Object.keys(config.firewall.name).length > 0)
  );
  
  // Helper function to get group details
  const getGroupDetails = (groupType: string, groupName: string) => {
    if (!config?.firewall?.group) return null;

    if (groupType === 'network-group' && config.firewall.group['network-group']?.[groupName]) {
      return config.firewall.group['network-group'][groupName];
    } else if (groupType === 'address-group' && config.firewall.group['address-group']?.[groupName]) {
      return config.firewall.group['address-group'][groupName];
    } else if (groupType === 'port-group' && config.firewall.group['port-group']?.[groupName]) {
      return config.firewall.group['port-group'][groupName];
    } else if (groupType === 'interface-group' && config.firewall.group['interface-group']?.[groupName]) {
      return config.firewall.group['interface-group'][groupName];
    }
    return null;
  };

  // Format group data for display
  const formatGroupData = (groupType: string, data: any) => {
    if (!data) return [];
    
    if (groupType === 'network-group') {
      const networks = Array.isArray(data.network) ? data.network : [data.network];
      return networks.map((net: string) => ({
        type: 'network',
        value: net
      }));
    } else if (groupType === 'address-group') {
      const addresses = Array.isArray(data.address) ? data.address : [data.address];
      return addresses.map((addr: string) => ({
        type: 'address',
        value: addr
      }));
    } else if (groupType === 'port-group') {
      const ports = Array.isArray(data.port) ? data.port : [data.port];
      return ports.map((port: string) => ({
        type: 'port',
        value: port
      }));
    } else if (groupType === 'interface-group') {
      const interfaces = Array.isArray(data.interface) ? data.interface : [data.interface];
      return interfaces.map((intf: string) => ({
        type: 'interface',
        value: intf
      }));
    }
    return [];
  };
  
  // Get all rule sets from different firewall sections
  const getRuleSets = () => {
    const sets = [];
    
    // IPv4 rule sets
    if (config?.firewall?.ipv4) {
      if (config.firewall.ipv4.forward?.filter?.rule) {
        sets.push('ipv4-forward');
      }
      if (config.firewall.ipv4.input?.filter?.rule) {
        sets.push('ipv4-input');
      }
      if (config.firewall.ipv4.output?.filter?.rule) {
        sets.push('ipv4-output');
      }
    }
    
    // IPv6 rule sets
    if (config?.firewall?.ipv6) {
      if (config.firewall.ipv6.forward?.filter?.rule) {
        sets.push('ipv6-forward');
      }
      if (config.firewall.ipv6.input?.filter?.rule) {
        sets.push('ipv6-input');
      }
      if (config.firewall.ipv6.output?.filter?.rule) {
        sets.push('ipv6-output');
      }
    }
    
    // Name-based rule sets (if any)
    if (config?.firewall?.name) {
      sets.push(...Object.keys(config.firewall.name).map(name => `name-${name}`));
    }
    
    return sets;
  };
  
  const getRulesForSet = (ruleSet: string) => {
    if (!ruleSet || !config?.firewall) return [];
    
    // Parse the rule set ID to get the type and name
    const [type, name] = ruleSet.split('-', 2);
    
    if (type === 'ipv4') {
      if (name === 'forward' && config.firewall.ipv4?.forward?.filter?.rule) {
        return Object.entries(config.firewall.ipv4.forward.filter.rule);
      } else if (name === 'input' && config.firewall.ipv4?.input?.filter?.rule) {
        return Object.entries(config.firewall.ipv4.input.filter.rule);
      } else if (name === 'output' && config.firewall.ipv4?.output?.filter?.rule) {
        return Object.entries(config.firewall.ipv4.output.filter.rule);
      }
    } else if (type === 'ipv6') {
      if (name === 'forward' && config.firewall.ipv6?.forward?.filter?.rule) {
        return Object.entries(config.firewall.ipv6.forward.filter.rule);
      } else if (name === 'input' && config.firewall.ipv6?.input?.filter?.rule) {
        return Object.entries(config.firewall.ipv6.input.filter.rule);
      } else if (name === 'output' && config.firewall.ipv6?.output?.filter?.rule) {
        return Object.entries(config.firewall.ipv6.output.filter.rule);
      }
    } else if (type === 'name' && config.firewall.name?.[name]?.rule) {
      return Object.entries(config.firewall.name[name].rule);
    }
    
    return [];
  };
  
  const getRuleSetDisplayName = (ruleSet: string) => {
    if (!ruleSet) return '';
    
    const [type, name] = ruleSet.split('-', 2);
    
    if (type === 'ipv4') {
      return `IPv4 ${name.charAt(0).toUpperCase() + name.slice(1)}`;
    } else if (type === 'ipv6') {
      return `IPv6 ${name.charAt(0).toUpperCase() + name.slice(1)}`;
    } else if (type === 'name') {
      return name;
    }
    
    return ruleSet;
  };
  
  const getPathForRuleSet = (ruleSet: string) => {
    if (!ruleSet) return '';
    
    const [type, name] = ruleSet.split('-', 2);
    
    if (type === 'ipv4') {
      return `firewall/ipv4/${name}/filter`;
    } else if (type === 'ipv6') {
      return `firewall/ipv6/${name}/filter`;
    } else if (type === 'name') {
      return `firewall/name/${name}`;
    }
    
    return '';
  };
  
  const ruleSets = getRuleSets();
  const activeRules = activeRuleSet ? getRulesForSet(activeRuleSet) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">Firewall</h1>
          <p className="text-slate-400">Manage firewall rules and policies to secure your network</p>
        </div>
        <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => openNewRuleDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>
      
      {hasFirewallRules ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-cyan-400 text-lg">Rule Sets</CardTitle>
                <CardDescription className="text-slate-400">Firewall rule groups</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ruleSets.map((ruleSet) => (
                    <Button 
                      key={ruleSet}
                      variant={activeRuleSet === ruleSet ? "default" : "outline"}
                      className={`w-full justify-start ${activeRuleSet === ruleSet ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-slate-900 border-slate-700 text-slate-300'}`}
                      onClick={() => setActiveRuleSet(ruleSet)}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      {getRuleSetDisplayName(ruleSet)}
                      {getRulesForSet(ruleSet).length > 0 && (
                        <Badge variant="secondary" className="ml-2 bg-slate-700">
                          {getRulesForSet(ruleSet).length}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
                <Button 
                  className="w-full mt-4 bg-slate-700 hover:bg-slate-600 border-dashed border-slate-600"
                  variant="outline"
                  onClick={() => openNewRuleDialog()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Rule Set
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-3">
            {activeRuleSet ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex-row justify-between items-start">
                  <div>
                    <CardTitle className="text-cyan-400 text-lg">Rules: {getRuleSetDisplayName(activeRuleSet)}</CardTitle>
                    <CardDescription className="text-slate-400">
                      {activeRules.length} {activeRules.length === 1 ? 'rule' : 'rules'} defined
                    </CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => openNewRuleDialog(activeRuleSet)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Rule
                  </Button>
                </CardHeader>
                <CardContent>
                  {activeRules.length > 0 ? (
                    <div className="space-y-4">
                      {activeRules.map(([ruleNumber, rule]: [string, any]) => (
                        <Card key={ruleNumber} className="bg-slate-900 border-slate-700 overflow-hidden">
                          <div className="flex flex-col md:flex-row">
                            <div className="w-full md:w-24 bg-slate-800 p-4 flex items-center justify-center">
                              <div className="text-2xl font-bold text-cyan-400">{ruleNumber}</div>
                            </div>
                            
                            <div className="flex-1 p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={`${rule.action === 'accept' ? 'bg-green-600' : rule.action === 'drop' ? 'bg-red-600' : 'bg-amber-600'}`}>
                                  {rule.action}
                                </Badge>
                                {rule.protocol && (
                                  <Badge variant="outline" className="border-slate-600 text-slate-300">
                                    {rule.protocol}
                                  </Badge>
                                )}
                                {rule.disable && (
                                  <Badge variant="outline" className="border-red-800 text-red-400">
                                    Disabled
                                  </Badge>
                                )}
                              </div>
                              
                              {rule.description && (
                                <p className="text-sm text-slate-300 mb-3 italic">"{rule.description}"</p>
                              )}
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                {/* Source information */}
                                {rule.source && (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-slate-400 font-medium">Source:</span>
                                    {rule.source.address && (
                                      <div className="flex items-center gap-2 ml-2">
                                        <span className="text-slate-400">Address:</span>
                                        <span className="text-white font-mono bg-slate-800 px-2 py-1 rounded text-xs">
                                          {rule.source.address}
                                        </span>
                                      </div>
                                    )}
                                    {rule.source.group && rule.source.group['network-group'] && (
                                      <div className="flex items-center gap-2 ml-2">
                                        <span className="text-slate-400">Network Group:</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-white font-mono bg-purple-900/40 text-purple-300 px-2 py-1 rounded text-xs">
                                            {rule.source.group['network-group']}
                                          </span>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-5 w-5 rounded-full bg-slate-700 hover:bg-slate-600"
                                            title="Show group details"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const details = getGroupDetails('network-group', rule.source.group['network-group']);
                                              if (details) {
                                                const groupData = formatGroupData('network-group', details);
                                                toast({
                                                  title: `Network Group: ${rule.source.group['network-group']}`,
                                                  description: (
                                                    <div className="mt-2 space-y-1">
                                                      {groupData.map((item: { type: string, value: string }, i: number) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                          <span className="text-white font-mono bg-purple-900/40 text-purple-300 px-2 py-1 rounded text-xs">
                                                            {item.value}
                                                          </span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )
                                                });
                                              }
                                            }}
                                          >
                                            <Info className="h-3 w-3 text-purple-300" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {rule.source.group && rule.source.group['address-group'] && (
                                      <div className="flex items-center gap-2 ml-2">
                                        <span className="text-slate-400">Address Group:</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-white font-mono bg-cyan-900/40 text-cyan-300 px-2 py-1 rounded text-xs">
                                            {rule.source.group['address-group']}
                                          </span>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-5 w-5 rounded-full bg-slate-700 hover:bg-slate-600"
                                            title="Show group details"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const details = getGroupDetails('address-group', rule.source.group['address-group']);
                                              if (details) {
                                                const groupData = formatGroupData('address-group', details);
                                                toast({
                                                  title: `Address Group: ${rule.source.group['address-group']}`,
                                                  description: (
                                                    <div className="mt-2 space-y-1">
                                                      {groupData.map((item: { type: string, value: string }, i: number) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                          <span className="text-white font-mono bg-cyan-900/40 text-cyan-300 px-2 py-1 rounded text-xs">
                                                            {item.value}
                                                          </span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )
                                                });
                                              }
                                            }}
                                          >
                                            <Info className="h-3 w-3 text-cyan-300" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {rule.source.group && rule.source.group['port-group'] && (
                                      <div className="flex items-center gap-2 ml-2">
                                        <span className="text-slate-400">Port Group:</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-white font-mono bg-amber-900/40 text-amber-300 px-2 py-1 rounded text-xs">
                                            {rule.source.group['port-group']}
                                          </span>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-5 w-5 rounded-full bg-slate-700 hover:bg-slate-600"
                                            title="Show group details"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const details = getGroupDetails('port-group', rule.source.group['port-group']);
                                              if (details) {
                                                const groupData = formatGroupData('port-group', details);
                                                toast({
                                                  title: `Port Group: ${rule.source.group['port-group']}`,
                                                  description: (
                                                    <div className="mt-2 space-y-1">
                                                      {groupData.map((item: { type: string, value: string }, i: number) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                          <span className="text-white font-mono bg-amber-900/40 text-amber-300 px-2 py-1 rounded text-xs">
                                                            {item.value}
                                                          </span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )
                                                });
                                              }
                                            }}
                                          >
                                            <Info className="h-3 w-3 text-amber-300" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {rule.source.port && (
                                      <div className="flex items-center gap-2 ml-2">
                                        <span className="text-slate-400">Port:</span>
                                        <span className="text-white font-mono bg-slate-800 px-2 py-1 rounded text-xs">
                                          {rule.source.port}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Destination information */}
                                {rule.destination && (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-slate-400 font-medium">Destination:</span>
                                    {rule.destination.address && (
                                      <div className="flex items-center gap-2 ml-2">
                                        <span className="text-slate-400">Address:</span>
                                        <span className="text-white font-mono bg-slate-800 px-2 py-1 rounded text-xs">
                                          {rule.destination.address}
                                        </span>
                                      </div>
                                    )}
                                    {rule.destination.group && rule.destination.group['network-group'] && (
                                      <div className="flex items-center gap-2 ml-2">
                                        <span className="text-slate-400">Network Group:</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-white font-mono bg-purple-900/40 text-purple-300 px-2 py-1 rounded text-xs">
                                            {rule.destination.group['network-group']}
                                          </span>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-5 w-5 rounded-full bg-slate-700 hover:bg-slate-600"
                                            title="Show group details"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const details = getGroupDetails('network-group', rule.destination.group['network-group']);
                                              if (details) {
                                                const groupData = formatGroupData('network-group', details);
                                                toast({
                                                  title: `Network Group: ${rule.destination.group['network-group']}`,
                                                  description: (
                                                    <div className="mt-2 space-y-1">
                                                      {groupData.map((item: { type: string, value: string }, i: number) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                          <span className="text-white font-mono bg-purple-900/40 text-purple-300 px-2 py-1 rounded text-xs">
                                                            {item.value}
                                                          </span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )
                                                });
                                              }
                                            }}
                                          >
                                            <Info className="h-3 w-3 text-purple-300" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {rule.destination.group && rule.destination.group['address-group'] && (
                                      <div className="flex items-center gap-2 ml-2">
                                        <span className="text-slate-400">Address Group:</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-white font-mono bg-cyan-900/40 text-cyan-300 px-2 py-1 rounded text-xs">
                                            {rule.destination.group['address-group']}
                                          </span>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-5 w-5 rounded-full bg-slate-700 hover:bg-slate-600"
                                            title="Show group details"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const details = getGroupDetails('address-group', rule.destination.group['address-group']);
                                              if (details) {
                                                const groupData = formatGroupData('address-group', details);
                                                toast({
                                                  title: `Address Group: ${rule.destination.group['address-group']}`,
                                                  description: (
                                                    <div className="mt-2 space-y-1">
                                                      {groupData.map((item: { type: string, value: string }, i: number) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                          <span className="text-white font-mono bg-cyan-900/40 text-cyan-300 px-2 py-1 rounded text-xs">
                                                            {item.value}
                                                          </span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )
                                                });
                                              }
                                            }}
                                          >
                                            <Info className="h-3 w-3 text-cyan-300" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {rule.destination.group && rule.destination.group['port-group'] && (
                                      <div className="flex items-center gap-2 ml-2">
                                        <span className="text-slate-400">Port Group:</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-white font-mono bg-amber-900/40 text-amber-300 px-2 py-1 rounded text-xs">
                                            {rule.destination.group['port-group']}
                                          </span>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-5 w-5 rounded-full bg-slate-700 hover:bg-slate-600"
                                            title="Show group details"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const details = getGroupDetails('port-group', rule.destination.group['port-group']);
                                              if (details) {
                                                const groupData = formatGroupData('port-group', details);
                                                toast({
                                                  title: `Port Group: ${rule.destination.group['port-group']}`,
                                                  description: (
                                                    <div className="mt-2 space-y-1">
                                                      {groupData.map((item: { type: string, value: string }, i: number) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                          <span className="text-white font-mono bg-amber-900/40 text-amber-300 px-2 py-1 rounded text-xs">
                                                            {item.value}
                                                          </span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )
                                                });
                                              }
                                            }}
                                          >
                                            <Info className="h-3 w-3 text-amber-300" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {rule.destination.port && (
                                      <div className="flex items-center gap-2 ml-2">
                                        <span className="text-slate-400">Port:</span>
                                        <span className="text-white font-mono bg-slate-800 px-2 py-1 rounded text-xs">
                                          {rule.destination.port}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Interface information */}
                                {rule['inbound-interface'] && (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-slate-400 font-medium">Inbound Interface:</span>
                                    {rule['inbound-interface'].name && (
                                      <div className="flex items-center gap-2 ml-2">
                                        <span className="text-white font-mono bg-blue-900/40 text-blue-300 px-2 py-1 rounded text-xs">
                                          {rule['inbound-interface'].name}
                                        </span>
                                      </div>
                                    )}
                                    {rule['inbound-interface'].group && (
                                      <div className="flex items-center gap-2 ml-2">
                                        <span className="text-slate-400">Group:</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-white font-mono bg-blue-900/40 text-blue-300 px-2 py-1 rounded text-xs">
                                            {typeof rule['inbound-interface'].group === 'string' 
                                              ? rule['inbound-interface'].group 
                                              : JSON.stringify(rule['inbound-interface'].group)}
                                          </span>
                                          {typeof rule['inbound-interface'].group === 'string' && !rule['inbound-interface'].group.startsWith('!') && (
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-5 w-5 rounded-full bg-slate-700 hover:bg-slate-600"
                                              title="Show group details"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const details = getGroupDetails('interface-group', rule['inbound-interface'].group as string);
                                                if (details) {
                                                  const groupData = formatGroupData('interface-group', details);
                                                  toast({
                                                    title: `Interface Group: ${rule['inbound-interface'].group}`,
                                                    description: (
                                                      <div className="mt-2 space-y-1">
                                                        {groupData.map((item: { type: string, value: string }, i: number) => (
                                                          <div key={i} className="flex items-center gap-2">
                                                            <span className="text-white font-mono bg-blue-900/40 text-blue-300 px-2 py-1 rounded text-xs">
                                                              {item.value}
                                                            </span>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    )
                                                  });
                                                }
                                              }}
                                            >
                                              <Info className="h-3 w-3 text-blue-300" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {rule['outbound-interface'] && (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-slate-400 font-medium">Outbound Interface:</span>
                                    {rule['outbound-interface'].name && (
                                      <div className="flex items-center gap-2 ml-2">
                                        <span className="text-white font-mono bg-teal-900/40 text-teal-300 px-2 py-1 rounded text-xs">
                                          {rule['outbound-interface'].name}
                                        </span>
                                      </div>
                                    )}
                                    {rule['outbound-interface'].group && (
                                      <div className="flex items-center gap-2 ml-2">
                                        <span className="text-slate-400">Group:</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-white font-mono bg-teal-900/40 text-teal-300 px-2 py-1 rounded text-xs">
                                            {typeof rule['outbound-interface'].group === 'string' 
                                              ? rule['outbound-interface'].group 
                                              : JSON.stringify(rule['outbound-interface'].group)}
                                          </span>
                                          {typeof rule['outbound-interface'].group === 'string' && !rule['outbound-interface'].group.startsWith('!') && (
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-5 w-5 rounded-full bg-slate-700 hover:bg-slate-600"
                                              title="Show group details"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const details = getGroupDetails('interface-group', rule['outbound-interface'].group as string);
                                                if (details) {
                                                  const groupData = formatGroupData('interface-group', details);
                                                  toast({
                                                    title: `Interface Group: ${rule['outbound-interface'].group}`,
                                                    description: (
                                                      <div className="mt-2 space-y-1">
                                                        {groupData.map((item: { type: string, value: string }, i: number) => (
                                                          <div key={i} className="flex items-center gap-2">
                                                            <span className="text-white font-mono bg-teal-900/40 text-teal-300 px-2 py-1 rounded text-xs">
                                                              {item.value}
                                                            </span>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    )
                                                  });
                                                }
                                              }}
                                            >
                                              <Info className="h-3 w-3 text-teal-300" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* State tracking */}
                                {rule.state && (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-slate-400 font-medium">State Tracking:</span>
                                    {typeof rule.state === 'string' ? (
                                      <div className="flex items-center gap-2 ml-2">
                                        <span className="text-white font-mono bg-slate-800 px-2 py-1 rounded text-xs">
                                          {rule.state}
                                        </span>
                                      </div>
                                    ) : (
                                      Object.entries(rule.state).map(([key, value]) => (
                                        <div key={`state-${key}`} className="flex items-center gap-2 ml-2">
                                          <span className="text-slate-400">{key}:</span>
                                          <span className="text-white font-mono bg-slate-800 px-2 py-1 rounded text-xs">
                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                          </span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="w-full md:w-auto p-4 md:border-l border-slate-700 flex md:flex-col justify-end gap-2">
                              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700">
                                <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Edit
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
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Shield className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-300 mb-2">No Rules Defined</h3>
                      <p className="text-slate-400 mb-4">This rule set doesn't have any rules defined yet.</p>
                      <Button 
                        className="bg-cyan-600 hover:bg-cyan-700"
                        onClick={() => openNewRuleDialog(activeRuleSet)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Rule
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800 border-slate-700 h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <Shield className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-300 mb-2">Select a Rule Set</h3>
                  <p className="text-slate-400">Please select a rule set from the left to view its rules.</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <Card className="bg-slate-800 border-slate-700 p-8 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Firewall Rules Defined</h3>
            <p className="text-sm text-slate-400 mb-6">You haven't configured any firewall rules yet. Rules help protect your network from unauthorized access.</p>
            <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => openNewRuleDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Rule
            </Button>
          </div>
        </Card>
      )}

      {/* New Rule Dialog */}
      <Dialog open={newRuleDialogOpen} onOpenChange={setNewRuleDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Create New Firewall Rule</DialogTitle>
            <DialogDescription className="text-slate-400">
              Define a new rule to control network traffic
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ruleset" className="text-slate-300">Rule Set</Label>
              <div className="col-span-3">
                {ruleSets.length > 0 && !isCreatingNewRuleSet ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Select 
                        value={newRuleData.ruleSet} 
                        onValueChange={(value) => setNewRuleData({...newRuleData, ruleSet: value})}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue placeholder="Select existing rule set" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                          <SelectItem value="ipv4-input">IPv4 Input</SelectItem>
                          <SelectItem value="ipv4-output">IPv4 Output</SelectItem>
                          <SelectItem value="ipv4-forward">IPv4 Forward</SelectItem>
                          <SelectItem value="ipv6-input">IPv6 Input</SelectItem>
                          <SelectItem value="ipv6-output">IPv6 Output</SelectItem>
                          <SelectItem value="ipv6-forward">IPv6 Forward</SelectItem>
                          {config?.firewall?.name && Object.keys(config.firewall.name).map(name => (
                            <SelectItem key={`name-${name}`} value={`name-${name}`}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        onClick={switchToCreateNewRuleSet}
                      >
                        Create New
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Input
                        id="ruleset-input"
                        className="bg-slate-800 border-slate-700 text-white"
                        value={newRuleData.ruleSet}
                        onChange={(e) => setNewRuleData({...newRuleData, ruleSet: e.target.value})}
                        placeholder="Enter a name for the new rule set"
                      />
                      {ruleSets.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                          onClick={() => setIsCreatingNewRuleSet(false)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-cyan-400 mt-1">
                      New rules will be created in a name-based firewall ruleset
                    </p>
                    {newRuleData.ruleSet && (
                      <p className="text-xs text-cyan-400">New rule set "{newRuleData.ruleSet}" will be created</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rule-number" className="text-slate-300">Rule Number</Label>
              <Input
                id="rule-number"
                type="number"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={newRuleData.ruleNumber}
                onChange={(e) => setNewRuleData({...newRuleData, ruleNumber: e.target.value})}
                placeholder="e.g. 10"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="action" className="text-slate-300">Action</Label>
              <div className="col-span-3">
                <Select 
                  value={newRuleData.action} 
                  onValueChange={(value) => setNewRuleData({...newRuleData, action: value})}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="accept">Accept</SelectItem>
                    <SelectItem value="drop">Drop</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="protocol" className="text-slate-300">Protocol</Label>
              <div className="col-span-3">
                <Select 
                  value={newRuleData.protocol} 
                  onValueChange={(value) => setNewRuleData({...newRuleData, protocol: value})}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select protocol" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="udp">UDP</SelectItem>
                    <SelectItem value="icmp">ICMP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-slate-300">Description</Label>
              <Input
                id="description"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={newRuleData.description}
                onChange={(e) => setNewRuleData({...newRuleData, description: e.target.value})}
                placeholder="Optional rule description"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="source-address" className="text-slate-300">Source Address</Label>
              <Input
                id="source-address"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={newRuleData.sourceAddress}
                onChange={(e) => setNewRuleData({...newRuleData, sourceAddress: e.target.value})}
                placeholder="e.g. 192.168.1.0/24"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="destination-address" className="text-slate-300">Destination Address</Label>
              <Input
                id="destination-address"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={newRuleData.destinationAddress}
                onChange={(e) => setNewRuleData({...newRuleData, destinationAddress: e.target.value})}
                placeholder="e.g. 10.0.0.0/8"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="destination-port" className="text-slate-300">Destination Port</Label>
              <Input
                id="destination-port"
                className="col-span-3 bg-slate-800 border-slate-700 text-white"
                value={newRuleData.destinationPort}
                onChange={(e) => setNewRuleData({...newRuleData, destinationPort: e.target.value})}
                placeholder="e.g. 80 or 1000-2000"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="state" className="text-slate-300">State</Label>
              <div className="col-span-3">
                <Select 
                  value={newRuleData.state} 
                  onValueChange={(value) => setNewRuleData({...newRuleData, state: value})}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setNewRuleDialogOpen(false)}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={createNewRule} 
              className="bg-cyan-600 hover:bg-cyan-700"
              disabled={isUpdatingRule}
            >
              {isUpdatingRule ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 