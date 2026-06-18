"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import type { PimInterface, PimIgmpJoin } from "@/lib/api/pim";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";

interface PimInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (iface: PimInterface) => Promise<void>;
  existingInterface?: PimInterface | null;
}

export function PimInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
}: PimInterfaceModalProps) {
  const isEditMode = !!existingInterface;

  // Available interfaces
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [, setInterfacesLoading] = useState(false);

  // PIM form state
  const [name, setName] = useState("");
  const [bfd, setBfd] = useState(false);
  const [bfdProfile, setBfdProfile] = useState("");
  const [drPriority, setDrPriority] = useState("");
  const [hello, setHello] = useState("");
  const [sourceAddress, setSourceAddress] = useState("");
  const [passive, setPassive] = useState(false);
  const [noBsm, setNoBsm] = useState(false);
  const [noUnicastBsm, setNoUnicastBsm] = useState(false);

  // IGMP form state
  const [igmpDisabled, setIgmpDisabled] = useState(false);
  const [igmpQueryInterval, setIgmpQueryInterval] = useState("");
  const [igmpQueryMaxResponseTime, setIgmpQueryMaxResponseTime] = useState("");
  const [igmpVersion, setIgmpVersion] = useState("");
  const [igmpJoins, setIgmpJoins] = useState<PimIgmpJoin[]>([]);
  const [newJoinGroup, setNewJoinGroup] = useState("");
  const [newJoinSource, setNewJoinSource] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pim");

  useEffect(() => {
    if (open) {
      if (existingInterface) {
        setName(existingInterface.name);
        setBfd(existingInterface.bfd);
        setBfdProfile(existingInterface.bfd_profile || "");
        setDrPriority(existingInterface.dr_priority != null ? String(existingInterface.dr_priority) : "");
        setHello(existingInterface.hello != null ? String(existingInterface.hello) : "");
        setSourceAddress(existingInterface.source_address || "");
        setPassive(existingInterface.passive);
        setNoBsm(existingInterface.no_bsm);
        setNoUnicastBsm(existingInterface.no_unicast_bsm);

        const igmp = existingInterface.igmp;
        if (igmp) {
          setIgmpDisabled(igmp.disabled);
          setIgmpQueryInterval(igmp.query_interval != null ? String(igmp.query_interval) : "");
          setIgmpQueryMaxResponseTime(igmp.query_max_response_time != null ? String(igmp.query_max_response_time) : "");
          setIgmpVersion(igmp.version != null ? String(igmp.version) : "");
          setIgmpJoins(igmp.joins.map((j) => ({ group: j.group, source_addresses: [...j.source_addresses] })));
        } else {
          resetIgmpFields();
        }
      } else {
        resetForm();
      }
      setActiveTab("pim");
      loadInterfaces();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- seed/reset the form when opened; reset helpers only touch local state
  }, [open, existingInterface]);

  const loadInterfaces = async () => {
    setInterfacesLoading(true);
    try {
      const response = await showService.getAllInterfaces();
      setAvailableInterfaces(response.interfaces);
    } catch {
      // Non-critical
    } finally {
      setInterfacesLoading(false);
    }
  };

  const resetIgmpFields = () => {
    setIgmpDisabled(false);
    setIgmpQueryInterval("");
    setIgmpQueryMaxResponseTime("");
    setIgmpVersion("");
    setIgmpJoins([]);
    setNewJoinGroup("");
    setNewJoinSource("");
  };

  const resetForm = () => {
    setName("");
    setBfd(false);
    setBfdProfile("");
    setDrPriority("");
    setHello("");
    setSourceAddress("");
    setPassive(false);
    setNoBsm(false);
    setNoUnicastBsm(false);
    resetIgmpFields();
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // IGMP join management
  const handleAddJoin = () => {
    const group = newJoinGroup.trim();
    if (!group) return;
    if (igmpJoins.some((j) => j.group === group)) {
      setError("Join group already exists");
      return;
    }
    setIgmpJoins([...igmpJoins, { group, source_addresses: [] }]);
    setNewJoinGroup("");
    setError(null);
  };

  const handleRemoveJoin = (index: number) => {
    setIgmpJoins(igmpJoins.filter((_, i) => i !== index));
  };

  const handleAddJoinSource = (joinIndex: number) => {
    const source = newJoinSource.trim();
    if (!source) return;
    const join = igmpJoins[joinIndex];
    if (join.source_addresses.includes(source)) {
      setError("Source address already exists in this join group");
      return;
    }
    const updated = [...igmpJoins];
    updated[joinIndex] = {
      ...join,
      source_addresses: [...join.source_addresses, source],
    };
    setIgmpJoins(updated);
    setNewJoinSource("");
    setError(null);
  };

  const handleRemoveJoinSource = (joinIndex: number, sourceIndex: number) => {
    const updated = [...igmpJoins];
    updated[joinIndex] = {
      ...updated[joinIndex],
      source_addresses: updated[joinIndex].source_addresses.filter((_, i) => i !== sourceIndex),
    };
    setIgmpJoins(updated);
  };

  const validateForm = (): string | null => {
    if (!name) return "Interface is required";

    if (drPriority.trim()) {
      const val = parseInt(drPriority.trim(), 10);
      if (isNaN(val) || val < 1 || val > 4294967295) return "DR Priority must be between 1 and 4294967295";
    }
    if (hello.trim()) {
      const val = parseInt(hello.trim(), 10);
      if (isNaN(val) || val < 1 || val > 180) return "Hello interval must be between 1 and 180";
    }
    if (igmpQueryInterval.trim()) {
      const val = parseInt(igmpQueryInterval.trim(), 10);
      if (isNaN(val) || val < 1 || val > 1800) return "IGMP query interval must be between 1 and 1800";
    }
    if (igmpQueryMaxResponseTime.trim()) {
      const val = parseInt(igmpQueryMaxResponseTime.trim(), 10);
      if (isNaN(val) || val < 10 || val > 250) return "IGMP query max response time must be between 10 and 250";
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const hasIgmpSettings =
        igmpDisabled ||
        igmpQueryInterval.trim() ||
        igmpQueryMaxResponseTime.trim() ||
        igmpVersion ||
        igmpJoins.length > 0;

      const iface: PimInterface = {
        name,
        bfd,
        bfd_profile: bfd && bfdProfile.trim() ? bfdProfile.trim() : null,
        dr_priority: drPriority.trim() ? parseInt(drPriority.trim(), 10) : null,
        hello: hello.trim() ? parseInt(hello.trim(), 10) : null,
        no_bsm: noBsm,
        no_unicast_bsm: noUnicastBsm,
        passive,
        source_address: sourceAddress.trim() || null,
        igmp: hasIgmpSettings
          ? {
              disabled: igmpDisabled,
              joins: igmpJoins,
              query_interval: igmpQueryInterval.trim() ? parseInt(igmpQueryInterval.trim(), 10) : null,
              query_max_response_time: igmpQueryMaxResponseTime.trim() ? parseInt(igmpQueryMaxResponseTime.trim(), 10) : null,
              version: igmpVersion ? parseInt(igmpVersion, 10) : null,
            }
          : null,
      };

      await onSubmit(iface);
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Operation failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit PIM Interface" : "Add PIM Interface"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modify PIM and IGMP settings for ${existingInterface?.name}.`
              : "Add a new interface to PIM multicast routing."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pim">PIM Settings</TabsTrigger>
            <TabsTrigger value="igmp">IGMP Settings</TabsTrigger>
          </TabsList>

          {/* PIM Settings Tab */}
          <TabsContent value="pim">
            <ScrollArea className="max-h-[55vh] pr-4">
              <div className="space-y-5 pb-2">
                {/* Interface Name */}
                <div className="space-y-2">
                  <Label>Interface</Label>
                  {isEditMode ? (
                    <Input value={name} disabled className="bg-muted font-mono" />
                  ) : (
                    <InterfaceSelect
                      value={name}
                      onValueChange={setName}
                      interfaces={availableInterfaces}
                      placeholder="Select interface"
                    />
                  )}
                </div>

                {/* BFD */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="pim-bfd" checked={bfd} onCheckedChange={(c) => setBfd(!!c)} />
                    <Label htmlFor="pim-bfd">Enable BFD (Bidirectional Forwarding Detection)</Label>
                  </div>
                  {bfd && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="pim-bfd-profile">BFD Profile</Label>
                      <Input
                        id="pim-bfd-profile"
                        value={bfdProfile}
                        onChange={(e) => setBfdProfile(e.target.value)}
                        placeholder="Optional BFD profile name"
                      />
                    </div>
                  )}
                </div>

                {/* DR Priority */}
                <div className="space-y-2">
                  <Label htmlFor="pim-dr-priority">DR Priority</Label>
                  <Input
                    id="pim-dr-priority"
                    type="number"
                    value={drPriority}
                    onChange={(e) => setDrPriority(e.target.value)}
                    placeholder="1-4294967295"
                    min={1}
                    max={4294967295}
                  />
                  <p className="text-xs text-muted-foreground">
                    Designated Router election priority. Higher wins.
                  </p>
                </div>

                {/* Hello Interval */}
                <div className="space-y-2">
                  <Label htmlFor="pim-hello">Hello Interval (seconds)</Label>
                  <Input
                    id="pim-hello"
                    type="number"
                    value={hello}
                    onChange={(e) => setHello(e.target.value)}
                    placeholder="1-180"
                    min={1}
                    max={180}
                  />
                </div>

                {/* Source Address */}
                <div className="space-y-2">
                  <Label htmlFor="pim-source-addr">Source Address</Label>
                  <Input
                    id="pim-source-addr"
                    value={sourceAddress}
                    onChange={(e) => setSourceAddress(e.target.value)}
                    placeholder="IPv4 source address (optional)"
                    className="font-mono"
                  />
                </div>

                {/* Flags */}
                <div className="space-y-3">
                  <Label>Flags</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="pim-passive" checked={passive} onCheckedChange={(c) => setPassive(!!c)} />
                      <Label htmlFor="pim-passive">Passive (no PIM hello packets)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="pim-no-bsm" checked={noBsm} onCheckedChange={(c) => setNoBsm(!!c)} />
                      <Label htmlFor="pim-no-bsm">No BSM (do not process bootstrap messages)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="pim-no-unicast-bsm" checked={noUnicastBsm} onCheckedChange={(c) => setNoUnicastBsm(!!c)} />
                      <Label htmlFor="pim-no-unicast-bsm">No Unicast BSM (block unicast bootstrap messages)</Label>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* IGMP Settings Tab */}
          <TabsContent value="igmp">
            <ScrollArea className="max-h-[55vh] pr-4">
              <div className="space-y-5 pb-2">
                {/* Disable IGMP */}
                <div className="flex items-center space-x-2">
                  <Checkbox id="igmp-disable" checked={igmpDisabled} onCheckedChange={(c) => setIgmpDisabled(!!c)} />
                  <Label htmlFor="igmp-disable">Disable IGMP on this interface</Label>
                </div>

                {/* Query Interval */}
                <div className="space-y-2">
                  <Label htmlFor="igmp-query-interval">Query Interval (seconds)</Label>
                  <Input
                    id="igmp-query-interval"
                    type="number"
                    value={igmpQueryInterval}
                    onChange={(e) => setIgmpQueryInterval(e.target.value)}
                    placeholder="1-1800"
                    min={1}
                    max={1800}
                  />
                </div>

                {/* Query Max Response Time */}
                <div className="space-y-2">
                  <Label htmlFor="igmp-query-max-response">Query Max Response Time (deciseconds)</Label>
                  <Input
                    id="igmp-query-max-response"
                    type="number"
                    value={igmpQueryMaxResponseTime}
                    onChange={(e) => setIgmpQueryMaxResponseTime(e.target.value)}
                    placeholder="10-250"
                    min={10}
                    max={250}
                  />
                </div>

                {/* IGMP Version */}
                <div className="space-y-2">
                  <Label>IGMP Version</Label>
                  <Select value={igmpVersion} onValueChange={setIgmpVersion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="2">Version 2</SelectItem>
                      <SelectItem value="3">Version 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* IGMP Joins */}
                <div className="space-y-3">
                  <div>
                    <Label>IGMP Join Groups</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Statically join multicast groups on this interface.
                    </p>
                  </div>

                  {igmpJoins.map((join, joinIndex) => (
                    <div key={joinIndex} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-medium">{join.group}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveJoin(joinIndex)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Source addresses for this join */}
                      {join.source_addresses.length > 0 && (
                        <div className="ml-2 space-y-1">
                          <p className="text-xs text-muted-foreground">Source Addresses:</p>
                          {join.source_addresses.map((src, srcIndex) => (
                            <div key={srcIndex} className="flex items-center gap-2">
                              <span className="flex-1 px-2 py-1 rounded border bg-muted font-mono text-xs">{src}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveJoinSource(joinIndex, srcIndex)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add source to this join */}
                      <div className="flex items-center gap-2 ml-2">
                        <Input
                          value={joinIndex === igmpJoins.length - 1 ? newJoinSource : ""}
                          onChange={(e) => {
                            if (joinIndex === igmpJoins.length - 1) {
                              setNewJoinSource(e.target.value);
                            }
                          }}
                          placeholder="Add source address"
                          className="h-8 text-xs font-mono"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddJoinSource(joinIndex);
                            }
                          }}
                          onFocus={() => {
                            // Allow editing source for any join by focusing
                          }}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleAddJoinSource(joinIndex)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Add new join group */}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newJoinGroup}
                      onChange={(e) => setNewJoinGroup(e.target.value)}
                      placeholder="e.g. 239.1.1.1"
                      className="font-mono"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddJoin();
                        }
                      }}
                    />
                    <Button variant="outline" size="icon" className="shrink-0" onClick={handleAddJoin}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? "Saving..." : "Adding..."}
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Add Interface"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
