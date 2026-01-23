"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Plus, Trash2, X, ArrowRight } from "lucide-react";
import {
  zonesService,
  type FirewallZone,
  type FromZonePolicy,
  type CreateZoneRequest,
} from "@/lib/api/zones";

interface ZoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone?: FirewallZone | null;
  existingZones: string[];
  availableInterfaces: string[];
  availableRulesets: { ipv4: string[]; ipv6: string[] };
  onSuccess: () => void;
}

export function ZoneModal({
  open,
  onOpenChange,
  zone,
  existingZones,
  availableInterfaces,
  availableRulesets,
  onSuccess,
}: ZoneModalProps) {
  const isEditing = !!zone;

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultAction, setDefaultAction] = useState<string>("");
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [fromZones, setFromZones] = useState<FromZonePolicy[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New interface input
  const [newInterface, setNewInterface] = useState("");

  // New from-zone input
  const [newFromZone, setNewFromZone] = useState("");
  const [newFromIpv4Ruleset, setNewFromIpv4Ruleset] = useState("");
  const [newFromIpv6Ruleset, setNewFromIpv6Ruleset] = useState("");

  useEffect(() => {
    if (open) {
      if (zone) {
        setName(zone.name);
        setDescription(zone.description || "");
        setDefaultAction(zone.default_action || "");
        setInterfaces(zone.interfaces || []);
        setFromZones(zone.from_zones || []);
      } else {
        setName("");
        setDescription("");
        setDefaultAction("");
        setInterfaces([]);
        setFromZones([]);
      }
      setError(null);
      setNewInterface("");
      setNewFromZone("");
      setNewFromIpv4Ruleset("");
      setNewFromIpv6Ruleset("");
    }
  }, [open, zone]);

  const addInterface = () => {
    if (newInterface && !interfaces.includes(newInterface)) {
      setInterfaces([...interfaces, newInterface]);
      setNewInterface("");
    }
  };

  const removeInterface = (iface: string) => {
    setInterfaces(interfaces.filter((i) => i !== iface));
  };

  const addFromZone = () => {
    if (newFromZone && !fromZones.some((f) => f.zone === newFromZone)) {
      setFromZones([
        ...fromZones,
        {
          zone: newFromZone,
          firewall: {
            ipv4_ruleset: newFromIpv4Ruleset || null,
            ipv6_ruleset: newFromIpv6Ruleset || null,
          },
        },
      ]);
      setNewFromZone("");
      setNewFromIpv4Ruleset("");
      setNewFromIpv6Ruleset("");
    }
  };

  const removeFromZone = (zoneName: string) => {
    setFromZones(fromZones.filter((f) => f.zone !== zoneName));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Zone name is required");
      return;
    }

    if (!isEditing && existingZones.includes(name)) {
      setError("Zone already exists");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditing) {
        await zonesService.updateZone(zone!.name, {
          description: description || null,
          default_action: defaultAction || null,
          interfaces,
          from_zones: fromZones,
        });
      } else {
        const data: CreateZoneRequest = {
          name: name.trim(),
          description: description || undefined,
          default_action: defaultAction || undefined,
          interfaces,
          from_zones: fromZones.length > 0 ? fromZones : undefined,
        };
        await zonesService.createZone(data);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save zone");
    } finally {
      setSaving(false);
    }
  };

  // Filter out already used interfaces
  const unusedInterfaces = availableInterfaces.filter(
    (i) => !interfaces.includes(i)
  );

  // Filter out already added zones and current zone
  const availableFromZones = existingZones.filter(
    (z) => z !== name && !fromZones.some((f) => f.zone === z)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Zone" : "Create Zone"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Editing zone "${zone?.name}"`
              : "Create a new firewall zone"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Zone Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., LAN, WAN, DMZ"
                disabled={isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_action">Default Action</Label>
              <Select value={defaultAction} onValueChange={setDefaultAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drop">Drop</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                  <SelectItem value="accept">Accept</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Zone description"
            />
          </div>

          {/* Interfaces */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Interfaces</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {interfaces.map((iface) => (
                  <Badge key={iface} variant="secondary" className="gap-1">
                    {iface}
                    <button
                      onClick={() => removeInterface(iface)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {interfaces.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    No interfaces assigned
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Select value={newInterface} onValueChange={setNewInterface}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select interface" />
                  </SelectTrigger>
                  <SelectContent>
                    {unusedInterfaces.map((iface) => (
                      <SelectItem key={iface} value={iface}>
                        {iface}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addInterface}
                  disabled={!newInterface}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* From Zone Policies */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">
                Incoming Traffic Policies (From Other Zones)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {fromZones.length > 0 ? (
                <div className="space-y-2">
                  {fromZones.map((from) => (
                    <div
                      key={from.zone}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{from.zone}</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary">{name || "this zone"}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {from.firewall.ipv4_ruleset && (
                          <Badge className="bg-blue-500/10 text-blue-500">
                            IPv4: {from.firewall.ipv4_ruleset}
                          </Badge>
                        )}
                        {from.firewall.ipv6_ruleset && (
                          <Badge className="bg-purple-500/10 text-purple-500">
                            IPv6: {from.firewall.ipv6_ruleset}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromZone(from.zone)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No incoming traffic policies defined
                </p>
              )}

              {availableFromZones.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-2 border-t">
                  <Select value={newFromZone} onValueChange={setNewFromZone}>
                    <SelectTrigger>
                      <SelectValue placeholder="From zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFromZones.map((z) => (
                        <SelectItem key={z} value={z}>
                          {z}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={newFromIpv4Ruleset}
                    onValueChange={setNewFromIpv4Ruleset}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="IPv4 ruleset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {availableRulesets.ipv4.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={newFromIpv6Ruleset}
                    onValueChange={setNewFromIpv6Ruleset}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="IPv6 ruleset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {availableRulesets.ipv6.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={addFromZone}
                    disabled={!newFromZone}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              "Update Zone"
            ) : (
              "Create Zone"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
