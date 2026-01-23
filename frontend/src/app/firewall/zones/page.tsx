"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  MoreVertical,
  Network,
  ArrowRight,
  AlertTriangle,
  Layers,
} from "lucide-react";
import {
  zonesService,
  type FirewallZone,
  type ZonePolicyMatrix,
} from "@/lib/api/zones";
import { useToast } from "@/hooks/useToast";
import { ZoneModal } from "@/components/firewall/ZoneModal";
import { cn } from "@/lib/utils";

export default function FirewallZonesPage() {
  const { toast } = useToast();
  const [zones, setZones] = useState<FirewallZone[]>([]);
  const [policies, setPolicies] = useState<ZonePolicyMatrix[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<FirewallZone | null>(null);

  // Available interfaces and rulesets (would normally come from API)
  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>([]);
  const [availableRulesets, setAvailableRulesets] = useState<{
    ipv4: string[];
    ipv6: string[];
  }>({ ipv4: [], ipv6: [] });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [configResult, policiesResult] = await Promise.all([
        zonesService.getConfig(),
        zonesService.getPolicies(),
      ]);

      setZones(configResult.zones);
      setPolicies(policiesResult);

      // Extract unique interfaces from zones
      const allInterfaces = new Set<string>();
      configResult.zones.forEach((z) => {
        z.interfaces.forEach((i) => allInterfaces.add(i));
      });
      // Add some common interface names
      ["eth0", "eth1", "eth2", "eth3", "wg0", "tun0"].forEach((i) =>
        allInterfaces.add(i)
      );
      setAvailableInterfaces(Array.from(allInterfaces).sort());

      // Mock rulesets - in real implementation, fetch from firewall API
      setAvailableRulesets({
        ipv4: ["WAN-IN", "WAN-OUT", "LAN-IN", "LAN-OUT", "DMZ-IN", "DMZ-OUT"],
        ipv6: ["WAN-IN-v6", "WAN-OUT-v6", "LAN-IN-v6", "LAN-OUT-v6"],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load zones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = () => {
    setSelectedZone(null);
    setModalOpen(true);
  };

  const handleEdit = (zone: FirewallZone) => {
    setSelectedZone(zone);
    setModalOpen(true);
  };

  const handleDelete = async (zone: FirewallZone) => {
    if (!confirm(`Delete zone "${zone.name}"? This will remove all associated policies.`)) {
      return;
    }

    try {
      await zonesService.deleteZone(zone.name);
      toast.success("Deleted", `Zone "${zone.name}" deleted`);
      loadData();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to delete zone");
    }
  };

  const handleModalSuccess = () => {
    toast.success("Success", selectedZone ? "Zone updated" : "Zone created");
    loadData();
  };

  // Generate zone matrix for visualization
  const zoneNames = zones.map((z) => z.name);

  const getPolicy = (from: string, to: string): ZonePolicyMatrix | undefined => {
    return policies.find((p) => p.from_zone === from && p.to_zone === to);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Firewall Zones
            </h1>
            <p className="text-muted-foreground mt-1">
              Zone-based firewall policy management
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Zone
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="flex items-center gap-2 py-3">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">{error}</span>
              <Button variant="outline" size="sm" onClick={loadData} className="ml-auto">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Zones List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Configured Zones
            </CardTitle>
            <CardDescription>
              {zones.length} zone(s) configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {zones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No zones configured</p>
                <p className="text-sm mt-1">Create your first zone to get started</p>
                <Button className="mt-4" onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Zone
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Default Action</TableHead>
                    <TableHead>Interfaces</TableHead>
                    <TableHead>Incoming Policies</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((zone) => (
                    <TableRow key={zone.name}>
                      <TableCell className="font-medium">{zone.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {zone.description || "-"}
                      </TableCell>
                      <TableCell>
                        {zone.default_action ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              zone.default_action === "drop" && "border-red-500 text-red-500",
                              zone.default_action === "reject" && "border-orange-500 text-orange-500",
                              zone.default_action === "accept" && "border-green-500 text-green-500"
                            )}
                          >
                            {zone.default_action}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {zone.interfaces.length > 0 ? (
                            zone.interfaces.map((iface) => (
                              <Badge key={iface} variant="secondary">
                                <Network className="h-3 w-3 mr-1" />
                                {iface}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {zone.from_zones.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {zone.from_zones.map((from) => (
                              <Badge key={from.zone} variant="outline" className="gap-1">
                                {from.zone}
                                <ArrowRight className="h-3 w-3" />
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(zone)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(zone)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Policy Matrix */}
        {zones.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                Zone Policy Matrix
              </CardTitle>
              <CardDescription>
                Traffic flow policies between zones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold">From ↓ / To →</TableHead>
                      {zoneNames.map((name) => (
                        <TableHead key={name} className="text-center font-bold">
                          {name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zoneNames.map((fromZone) => (
                      <TableRow key={fromZone}>
                        <TableCell className="font-bold">{fromZone}</TableCell>
                        {zoneNames.map((toZone) => {
                          const policy = getPolicy(fromZone, toZone);
                          const isIntra = fromZone === toZone;

                          return (
                            <TableCell key={toZone} className="text-center">
                              {policy ? (
                                <div className="flex flex-col gap-1 items-center">
                                  {policy.ipv4_ruleset && (
                                    <Badge className="bg-blue-500/10 text-blue-500 text-xs">
                                      {policy.ipv4_ruleset}
                                    </Badge>
                                  )}
                                  {policy.ipv6_ruleset && (
                                    <Badge className="bg-purple-500/10 text-purple-500 text-xs">
                                      {policy.ipv6_ruleset}
                                    </Badge>
                                  )}
                                  {policy.action && (
                                    <Badge variant="outline" className="text-xs">
                                      {policy.action}
                                    </Badge>
                                  )}
                                </div>
                              ) : isIntra ? (
                                <span className="text-muted-foreground text-xs">-</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  No policy
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Zone Modal */}
      <ZoneModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        zone={selectedZone}
        existingZones={zoneNames}
        availableInterfaces={availableInterfaces}
        availableRulesets={availableRulesets}
        onSuccess={handleModalSuccess}
      />
    </AppLayout>
  );
}
