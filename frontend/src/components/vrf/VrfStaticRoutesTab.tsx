"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { VrfSelect } from "@/components/ui/vrf-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Loader2,
  Plus,
  Route,
  Search,
  Trash2,
} from "lucide-react";
import {
  VrfInstance,
  VrfCapabilities,
  VrfStaticRoute,
  vrfService,
} from "@/lib/api/vrf";

interface VrfStaticRoutesTabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

export function VrfStaticRoutesTab({
  vrf,
  canWrite,
  onRefresh,
}: VrfStaticRoutesTabProps) {
  const [family, setFamily] = useState<"ipv4" | "ipv6">("ipv4");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteRoute, setDeleteRoute] = useState<{ dest: string; family: "route" | "route6" } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [newDest, setNewDest] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState<"next-hop" | "interface" | "blackhole" | "reject">("next-hop");
  const [newNextHop, setNewNextHop] = useState("");
  const [newInterface, setNewInterface] = useState("");
  const [newDistance, setNewDistance] = useState("");
  const [newNhVrf, setNewNhVrf] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  const routes = family === "ipv4"
    ? (vrf.static?.routes ?? [])
    : (vrf.static?.routes6 ?? []);

  const filteredRoutes = search
    ? routes.filter((r) =>
        r.destination.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase())
      )
    : routes;

  const getRouteTypeDisplay = (route: VrfStaticRoute): string => {
    const types: string[] = [];
    if (route.next_hops.length > 0) types.push(`${route.next_hops.length} next-hop(s)`);
    if (route.interfaces.length > 0) types.push(`${route.interfaces.length} interface(s)`);
    if (route.blackhole) types.push("blackhole");
    if (route.reject) types.push("reject");
    return types.join(", ") || "empty";
  };

  const getRouteTargets = (route: VrfStaticRoute): string => {
    const targets: string[] = [];
    for (const nh of route.next_hops) {
      let t = nh.address;
      if (nh.interface) t += ` via ${nh.interface}`;
      if (nh.vrf) t += ` (vrf: ${nh.vrf})`;
      targets.push(t);
    }
    for (const iface of route.interfaces) {
      let t = iface.name;
      if (iface.vrf) t += ` (vrf: ${iface.vrf})`;
      targets.push(t);
    }
    if (route.blackhole) targets.push("blackhole");
    if (route.reject) targets.push("reject");
    return targets.join("; ") || "—";
  };

  const resetCreateForm = () => {
    setNewDest("");
    setNewDesc("");
    setNewType("next-hop");
    setNewNextHop("");
    setNewInterface("");
    setNewDistance("");
    setNewNhVrf("");
    setCreateError(null);
  };

  const handleCreate = async () => {
    if (!newDest.trim()) {
      setCreateError("Destination is required");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const routeFamily = family === "ipv4" ? "route" : "route6";
      const config: Parameters<typeof vrfService.createStaticRoute>[1] = {
        destination: newDest.trim(),
        family: routeFamily,
        description: newDesc.trim() || undefined,
      };

      if (newType === "next-hop" && newNextHop.trim()) {
        config.next_hops = [{
          address: newNextHop.trim(),
          distance: newDistance.trim() || undefined,
          interface: newInterface.trim() || undefined,
          vrf: newNhVrf.trim() || undefined,
        }];
      } else if (newType === "interface" && newInterface.trim()) {
        config.interfaces = [{
          name: newInterface.trim(),
          distance: newDistance.trim() || undefined,
          vrf: newNhVrf.trim() || undefined,
        }];
      } else if (newType === "blackhole") {
        config.blackhole = {
          distance: newDistance.trim() || undefined,
        };
      } else if (newType === "reject") {
        config.reject = {
          distance: newDistance.trim() || undefined,
        };
      }

      const result = await vrfService.createStaticRoute(vrf.name, config);
      if (!result.success) throw new Error(result.error || "Failed to create route");

      resetCreateForm();
      setCreateOpen(false);
      onRefresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create route");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRoute) return;
    setDeleting(true);
    setError(null);

    try {
      const result = await vrfService.deleteStaticRoute(
        vrf.name,
        deleteRoute.dest,
        deleteRoute.family
      );
      if (!result.success) throw new Error(result.error || "Failed to delete route");
      setDeleteRoute(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete route");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Header controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Tabs value={family} onValueChange={(v) => setFamily(v as "ipv4" | "ipv6")}>
            <TabsList>
              <TabsTrigger value="ipv4">
                IPv4
                {(vrf.static?.routes.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                    {vrf.static?.routes.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ipv6">
                IPv6
                {(vrf.static?.routes6.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                    {vrf.static?.routes6.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search routes..."
              className="pl-9 w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Route
          </Button>
        )}
      </div>

      {/* Routes Table */}
      <Card>
        <CardContent className="p-0">
          {filteredRoutes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Route className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? "No routes match your search"
                  : `No ${family === "ipv4" ? "IPv4" : "IPv6"} static routes configured`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Destination</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Target(s)</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  {canWrite && <TableHead className="w-[60px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoutes.map((route) => {
                  const hasDisabled = route.next_hops.some((nh) => nh.disable) ||
                    route.interfaces.some((i) => i.disable);
                  return (
                    <TableRow key={route.destination}>
                      <TableCell className="font-mono text-sm font-medium">
                        {route.destination}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getRouteTypeDisplay(route)}
                      </TableCell>
                      <TableCell className="text-sm font-mono max-w-[300px] truncate">
                        {getRouteTargets(route)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {route.description || "—"}
                      </TableCell>
                      <TableCell>
                        {hasDisabled ? (
                          <Badge variant="outline" className="text-[10px]">
                            partial
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            active
                          </Badge>
                        )}
                      </TableCell>
                      {canWrite && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteRoute({
                                dest: route.destination,
                                family: family === "ipv4" ? "route" : "route6",
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Route Modal */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) resetCreateForm(); setCreateOpen(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Static Route</DialogTitle>
            <DialogDescription>
              Add a new {family === "ipv4" ? "IPv4" : "IPv6"} static route to VRF {vrf.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {createError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {createError}
              </div>
            )}

            <div className="space-y-2">
              <Label>Destination *</Label>
              <Input
                placeholder={family === "ipv4" ? "e.g., 10.0.0.0/8" : "e.g., 2001:db8::/32"}
                value={newDest}
                onChange={(e) => setNewDest(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Optional"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Route Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as typeof newType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="next-hop">Next-hop</SelectItem>
                  <SelectItem value="interface">Interface</SelectItem>
                  <SelectItem value="blackhole">Blackhole</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newType === "next-hop" && (
              <div className="space-y-2">
                <Label>Next-hop Address *</Label>
                <Input
                  placeholder={family === "ipv4" ? "e.g., 192.168.1.1" : "e.g., 2001:db8::1"}
                  value={newNextHop}
                  onChange={(e) => setNewNextHop(e.target.value)}
                />
              </div>
            )}

            {(newType === "next-hop" || newType === "interface") && (
              <div className="space-y-2">
                <Label>{newType === "interface" ? "Interface Name *" : "Interface (optional)"}</Label>
                <Input
                  placeholder="e.g., eth0"
                  value={newInterface}
                  onChange={(e) => setNewInterface(e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Distance</Label>
                <Input
                  type="number"
                  min={1}
                  max={255}
                  placeholder="1-255"
                  value={newDistance}
                  onChange={(e) => setNewDistance(e.target.value)}
                />
              </div>
              {(newType === "next-hop" || newType === "interface") && (
                <div className="space-y-2">
                  <Label>VRF (route leaking)</Label>
                  <VrfSelect
                    placeholder="Target VRF"
                    value={newNhVrf}
                    onValueChange={setNewNhVrf}
                    extraOptions={[{ label: "Default", value: "default" }]}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetCreateForm(); setCreateOpen(false); }} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Route
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Route Confirmation */}
      <Dialog open={!!deleteRoute} onOpenChange={(o) => { if (!o) setDeleteRoute(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Static Route</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the route to{" "}
              <strong className="font-mono">{deleteRoute?.dest}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRoute(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
