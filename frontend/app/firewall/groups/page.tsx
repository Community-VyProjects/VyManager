"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, RefreshCw, Plus, Network, Computer, Router, Smartphone } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export default function FirewallGroupsPage() {
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [config, setConfig] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("address-group")
  const [newGroupDialogOpen, setNewGroupDialogOpen] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [groupType, setGroupType] = useState<"address-group" | "network-group" | "port-group" | "interface-group">("address-group")
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    items: ''
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

  // Open dialog to create a new group
  const openNewGroupDialog = (type: "address-group" | "network-group" | "port-group" | "interface-group") => {
    setGroupType(type);
    setNewGroupData({
      name: '',
      items: ''
    });
    setNewGroupDialogOpen(true);
  };

  // Create a new group
  const createGroup = async () => {
    if (!newGroupData.name || !newGroupData.items) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Group name and items are required"
      });
      return;
    }

    setIsCreatingGroup(true);

    try {
      const basePath = `firewall/group/${groupType}/${newGroupData.name}`;
      
      // Create the empty group
      const createResponse = await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(basePath)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });
      
      if (!createResponse.ok) {
        throw new Error(`Failed to create group: ${createResponse.statusText}`);
      }

      // Get the proper property name based on group type
      let itemProperty = "";
      switch (groupType) {
        case "address-group":
          itemProperty = "address";
          break;
        case "network-group":
          itemProperty = "network";
          break;
        case "port-group":
          itemProperty = "port";
          break;
        case "interface-group":
          itemProperty = "interface";
          break;
      }

      // Add each item to the group
      const items = newGroupData.items.split(',').map(item => item.trim());
      for (const item of items) {
        const itemPath = `${basePath}/${itemProperty}`;
        await fetch(`${apiUrl}/api/configure/set/${encodeURIComponent(itemPath)}?value=${encodeURIComponent(item)}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json'
          }
        });
      }

      toast({
        title: "Firewall Group Created",
        description: `Successfully created ${groupType} ${newGroupData.name}`
      });

      setNewGroupDialogOpen(false);
      refreshData();
    } catch (error) {
      console.error("Error creating firewall group:", error);
      toast({
        variant: "destructive",
        title: "Error creating firewall group",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Delete a firewall group
  const deleteGroup = async (type: string, name: string) => {
    try {
      const groupPath = `firewall/group/${type}/${name}`;
      const response = await fetch(`${apiUrl}/api/configure/delete/${encodeURIComponent(groupPath)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete group: ${response.statusText}`);
      }

      toast({
        title: "Firewall Group Deleted",
        description: `Successfully deleted ${type} ${name}`
      });

      refreshData();
    } catch (error) {
      console.error("Error deleting firewall group:", error);
      toast({
        variant: "destructive",
        title: "Error deleting firewall group",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    }
  };

  // Helper function to get all items from a group
  const getGroupItems = (type: string, group: any): string[] => {
    if (!group) return [];
    
    let itemProperty = "";
    switch (type) {
      case "address-group":
        itemProperty = "address";
        break;
      case "network-group":
        itemProperty = "network";
        break;
      case "port-group":
        itemProperty = "port";
        break;
      case "interface-group":
        itemProperty = "interface";
        break;
    }

    if (!group[itemProperty]) return [];
    
    return Array.isArray(group[itemProperty]) 
      ? group[itemProperty] 
      : [group[itemProperty]];
  };

  // Get all groups of a specific type
  const getGroups = (type: string) => {
    if (!config?.firewall?.group?.[type]) return [];
    
    return Object.entries(config.firewall.group[type]).map(([name, data]: [string, any]) => ({
      name,
      items: getGroupItems(type, data)
    }));
  };

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading firewall groups...</p>
        </div>
      </div>
    );
  }

  const addressGroups = getGroups("address-group");
  const networkGroups = getGroups("network-group");
  const portGroups = getGroups("port-group");
  const interfaceGroups = getGroups("interface-group");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">Firewall Groups</h1>
          <p className="text-slate-400">Manage address, network, port and interface groups</p>
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
          <TabsTrigger value="address-group">
            <Computer className="h-4 w-4 mr-2" />
            Address Groups
          </TabsTrigger>
          <TabsTrigger value="network-group">
            <Network className="h-4 w-4 mr-2" />
            Network Groups
          </TabsTrigger>
          <TabsTrigger value="port-group">
            <Smartphone className="h-4 w-4 mr-2" />
            Port Groups
          </TabsTrigger>
          <TabsTrigger value="interface-group">
            <Router className="h-4 w-4 mr-2" />
            Interface Groups
          </TabsTrigger>
        </TabsList>

        {/* Address Groups Tab */}
        <TabsContent value="address-group" className="space-y-6">
          <div className="flex justify-end mb-4">
            <Button
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={() => openNewGroupDialog("address-group")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Address Group
            </Button>
          </div>

          {addressGroups.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700 p-8 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                  <Computer className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Address Groups Defined</h3>
                <p className="text-sm text-slate-400 mb-6">You haven't configured any address groups yet. Address groups allow you to reference multiple IP addresses in a single rule.</p>
                <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => openNewGroupDialog("address-group")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Address Group
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-cyan-400">Address Groups</CardTitle>
                <CardDescription className="text-slate-400">
                  Groups of IP addresses that can be referenced in firewall rules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="bg-slate-900">
                    <TableRow>
                      <TableHead className="text-cyan-400">Group Name</TableHead>
                      <TableHead className="text-cyan-400">Addresses</TableHead>
                      <TableHead className="text-cyan-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addressGroups.map((group) => (
                      <TableRow key={group.name} className="hover:bg-slate-700/50">
                        <TableCell className="font-medium text-white">{group.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {group.items.map((item, idx) => (
                              <Badge key={idx} className="bg-blue-700">{item}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-red-900/30 hover:bg-red-900/50 text-red-300 border-red-900"
                            onClick={() => deleteGroup("address-group", group.name)}
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

        {/* Network Groups Tab */}
        <TabsContent value="network-group" className="space-y-6">
          <div className="flex justify-end mb-4">
            <Button
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={() => openNewGroupDialog("network-group")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Network Group
            </Button>
          </div>

          {networkGroups.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700 p-8 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                  <Network className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Network Groups Defined</h3>
                <p className="text-sm text-slate-400 mb-6">You haven't configured any network groups yet. Network groups allow you to reference multiple subnets in a single rule.</p>
                <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => openNewGroupDialog("network-group")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Network Group
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-cyan-400">Network Groups</CardTitle>
                <CardDescription className="text-slate-400">
                  Groups of networks/subnets that can be referenced in firewall rules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="bg-slate-900">
                    <TableRow>
                      <TableHead className="text-cyan-400">Group Name</TableHead>
                      <TableHead className="text-cyan-400">Networks</TableHead>
                      <TableHead className="text-cyan-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {networkGroups.map((group) => (
                      <TableRow key={group.name} className="hover:bg-slate-700/50">
                        <TableCell className="font-medium text-white">{group.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {group.items.map((item, idx) => (
                              <Badge key={idx} className="bg-purple-700">{item}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-red-900/30 hover:bg-red-900/50 text-red-300 border-red-900"
                            onClick={() => deleteGroup("network-group", group.name)}
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

        {/* Port Groups Tab */}
        <TabsContent value="port-group" className="space-y-6">
          <div className="flex justify-end mb-4">
            <Button
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={() => openNewGroupDialog("port-group")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Port Group
            </Button>
          </div>

          {portGroups.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700 p-8 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                  <Smartphone className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Port Groups Defined</h3>
                <p className="text-sm text-slate-400 mb-6">You haven't configured any port groups yet. Port groups allow you to reference multiple port numbers in a single rule.</p>
                <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => openNewGroupDialog("port-group")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Port Group
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-cyan-400">Port Groups</CardTitle>
                <CardDescription className="text-slate-400">
                  Groups of ports that can be referenced in firewall rules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="bg-slate-900">
                    <TableRow>
                      <TableHead className="text-cyan-400">Group Name</TableHead>
                      <TableHead className="text-cyan-400">Ports</TableHead>
                      <TableHead className="text-cyan-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portGroups.map((group) => (
                      <TableRow key={group.name} className="hover:bg-slate-700/50">
                        <TableCell className="font-medium text-white">{group.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {group.items.map((item, idx) => (
                              <Badge key={idx} className="bg-amber-700">{item}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-red-900/30 hover:bg-red-900/50 text-red-300 border-red-900"
                            onClick={() => deleteGroup("port-group", group.name)}
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

        {/* Interface Groups Tab */}
        <TabsContent value="interface-group" className="space-y-6">
          <div className="flex justify-end mb-4">
            <Button
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={() => openNewGroupDialog("interface-group")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Interface Group
            </Button>
          </div>

          {interfaceGroups.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700 p-8 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                  <Router className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Interface Groups Defined</h3>
                <p className="text-sm text-slate-400 mb-6">You haven't configured any interface groups yet. Interface groups allow you to reference multiple interfaces in a single rule.</p>
                <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => openNewGroupDialog("interface-group")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Interface Group
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-cyan-400">Interface Groups</CardTitle>
                <CardDescription className="text-slate-400">
                  Groups of interfaces that can be referenced in firewall rules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="bg-slate-900">
                    <TableRow>
                      <TableHead className="text-cyan-400">Group Name</TableHead>
                      <TableHead className="text-cyan-400">Interfaces</TableHead>
                      <TableHead className="text-cyan-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interfaceGroups.map((group) => (
                      <TableRow key={group.name} className="hover:bg-slate-700/50">
                        <TableCell className="font-medium text-white">{group.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {group.items.map((item, idx) => (
                              <Badge key={idx} className="bg-teal-700">{item}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-red-900/30 hover:bg-red-900/50 text-red-300 border-red-900"
                            onClick={() => deleteGroup("interface-group", group.name)}
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

      {/* New Group Dialog */}
      <Dialog open={newGroupDialogOpen} onOpenChange={setNewGroupDialogOpen}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Add {groupType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {
                groupType === "address-group" ? "Create a new group of IP addresses to use in firewall rules." :
                groupType === "network-group" ? "Create a new group of networks/subnets to use in firewall rules." :
                groupType === "port-group" ? "Create a new group of ports to use in firewall rules." :
                "Create a new group of interfaces to use in firewall rules."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="group-name" className="text-white">Group Name</Label>
              <Input
                id="group-name"
                placeholder="e.g. TRUSTED_SERVERS"
                className="bg-slate-900 border-slate-700 text-white"
                value={newGroupData.name}
                onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="group-items" className="text-white">
                {
                  groupType === "address-group" ? "IP Addresses" :
                  groupType === "network-group" ? "Networks" :
                  groupType === "port-group" ? "Ports" :
                  "Interfaces"
                }
              </Label>
              <Input
                id="group-items"
                placeholder={
                  groupType === "address-group" ? "e.g. 192.168.1.10,10.0.0.5" :
                  groupType === "network-group" ? "e.g. 192.168.0.0/24,10.0.0.0/8" :
                  groupType === "port-group" ? "e.g. 80,443,8080-8090" :
                  "e.g. eth0,eth1,wg0"
                }
                className="bg-slate-900 border-slate-700 text-white"
                value={newGroupData.items}
                onChange={(e) => setNewGroupData({ ...newGroupData, items: e.target.value })}
              />
              <p className="text-xs text-slate-500">Separate multiple items with commas</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewGroupDialogOpen(false)}
              className="bg-slate-700 hover:bg-slate-600"
            >
              Cancel
            </Button>
            <Button 
              onClick={createGroup}
              disabled={isCreatingGroup}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {isCreatingGroup ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 