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
import type { Pim6Interface, Pim6MldJoin } from "@/lib/api/pim6";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { isValidIPv6 } from "@/lib/validators/firewall";

interface Pim6InterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (iface: Pim6Interface) => Promise<void>;
  existingInterface?: Pim6Interface | null;
}

export function Pim6InterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
}: Pim6InterfaceModalProps) {
  const isEditMode = !!existingInterface;

  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [, setInterfacesLoading] = useState(false);

  // PIMv6 form state
  const [name, setName] = useState("");
  const [drPriority, setDrPriority] = useState("");
  const [hello, setHello] = useState("");
  const [passive, setPassive] = useState(false);
  const [noBsm, setNoBsm] = useState(false);
  const [noUnicastBsm, setNoUnicastBsm] = useState(false);

  // MLD form state
  const [mldDisabled, setMldDisabled] = useState(false);
  const [mldInterval, setMldInterval] = useState("");
  const [mldLastMemberQueryCount, setMldLastMemberQueryCount] = useState("");
  const [mldLastMemberQueryInterval, setMldLastMemberQueryInterval] = useState("");
  const [mldMaxResponseTime, setMldMaxResponseTime] = useState("");
  const [mldVersion, setMldVersion] = useState("");
  const [mldJoins, setMldJoins] = useState<Pim6MldJoin[]>([]);
  const [newJoinGroup, setNewJoinGroup] = useState("");
  const [joinSourceInputs, setJoinSourceInputs] = useState<Record<number, string>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pim6");

  useEffect(() => {
    if (open) {
      if (existingInterface) {
        setName(existingInterface.name);
        setDrPriority(existingInterface.dr_priority != null ? String(existingInterface.dr_priority) : "");
        setHello(existingInterface.hello != null ? String(existingInterface.hello) : "");
        setPassive(existingInterface.passive);
        setNoBsm(existingInterface.no_bsm);
        setNoUnicastBsm(existingInterface.no_unicast_bsm);

        const mld = existingInterface.mld;
        if (mld) {
          setMldDisabled(mld.disabled);
          setMldInterval(mld.interval != null ? String(mld.interval) : "");
          setMldLastMemberQueryCount(mld.last_member_query_count != null ? String(mld.last_member_query_count) : "");
          setMldLastMemberQueryInterval(mld.last_member_query_interval != null ? String(mld.last_member_query_interval) : "");
          setMldMaxResponseTime(mld.max_response_time != null ? String(mld.max_response_time) : "");
          setMldVersion(mld.version != null ? String(mld.version) : "");
          setMldJoins(mld.joins.map((j) => ({ group: j.group, sources: [...j.sources] })));
        } else {
          resetMldFields();
        }
      } else {
        resetForm();
      }
      setJoinSourceInputs({});
      setActiveTab("pim6");
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

  const resetMldFields = () => {
    setMldDisabled(false);
    setMldInterval("");
    setMldLastMemberQueryCount("");
    setMldLastMemberQueryInterval("");
    setMldMaxResponseTime("");
    setMldVersion("");
    setMldJoins([]);
    setNewJoinGroup("");
    setJoinSourceInputs({});
  };

  const resetForm = () => {
    setName("");
    setDrPriority("");
    setHello("");
    setPassive(false);
    setNoBsm(false);
    setNoUnicastBsm(false);
    resetMldFields();
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleAddJoin = () => {
    const group = newJoinGroup.trim();
    if (!group) return;
    if (!isValidIPv6(group) || group === "") {
      setError(`Invalid IPv6 group address: ${group}`);
      return;
    }
    if (mldJoins.some((j) => j.group === group)) {
      setError("Join group already exists");
      return;
    }
    setMldJoins([...mldJoins, { group, sources: [] }]);
    setNewJoinGroup("");
    setError(null);
  };

  const handleRemoveJoin = (index: number) => {
    setMldJoins(mldJoins.filter((_, i) => i !== index));
    const newInputs = { ...joinSourceInputs };
    delete newInputs[index];
    setJoinSourceInputs(newInputs);
  };

  const handleAddJoinSource = (joinIndex: number) => {
    const source = (joinSourceInputs[joinIndex] || "").trim();
    if (!source) return;
    if (!isValidIPv6(source) || source === "") {
      setError(`Invalid IPv6 source address: ${source}`);
      return;
    }
    const join = mldJoins[joinIndex];
    if (join.sources.includes(source)) {
      setError("Source address already exists in this join group");
      return;
    }
    const updated = [...mldJoins];
    updated[joinIndex] = { ...join, sources: [...join.sources, source] };
    setMldJoins(updated);
    setJoinSourceInputs({ ...joinSourceInputs, [joinIndex]: "" });
    setError(null);
  };

  const handleRemoveJoinSource = (joinIndex: number, sourceIndex: number) => {
    const updated = [...mldJoins];
    updated[joinIndex] = {
      ...updated[joinIndex],
      sources: updated[joinIndex].sources.filter((_, i) => i !== sourceIndex),
    };
    setMldJoins(updated);
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
    if (mldInterval.trim()) {
      const val = parseInt(mldInterval.trim(), 10);
      if (isNaN(val) || val < 1 || val > 65535) return "MLD query interval must be between 1 and 65535";
    }
    if (mldLastMemberQueryCount.trim()) {
      const val = parseInt(mldLastMemberQueryCount.trim(), 10);
      if (isNaN(val) || val < 1 || val > 255) return "MLD last-member query count must be between 1 and 255";
    }
    if (mldLastMemberQueryInterval.trim()) {
      const val = parseInt(mldLastMemberQueryInterval.trim(), 10);
      if (isNaN(val) || val < 100 || val > 6553500) return "MLD last-member query interval must be between 100 and 6553500 ms";
    }
    if (mldMaxResponseTime.trim()) {
      const val = parseInt(mldMaxResponseTime.trim(), 10);
      if (isNaN(val) || val < 100 || val > 6553500) return "MLD max response time must be between 100 and 6553500 ms";
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
      const hasMldSettings =
        mldDisabled ||
        mldInterval.trim() ||
        mldLastMemberQueryCount.trim() ||
        mldLastMemberQueryInterval.trim() ||
        mldMaxResponseTime.trim() ||
        (mldVersion && mldVersion !== "default") ||
        mldJoins.length > 0;

      const iface: Pim6Interface = {
        name,
        dr_priority: drPriority.trim() ? parseInt(drPriority.trim(), 10) : null,
        hello: hello.trim() ? parseInt(hello.trim(), 10) : null,
        no_bsm: noBsm,
        no_unicast_bsm: noUnicastBsm,
        passive,
        mld: hasMldSettings
          ? {
              disabled: mldDisabled,
              interval: mldInterval.trim() ? parseInt(mldInterval.trim(), 10) : null,
              last_member_query_count: mldLastMemberQueryCount.trim() ? parseInt(mldLastMemberQueryCount.trim(), 10) : null,
              last_member_query_interval: mldLastMemberQueryInterval.trim() ? parseInt(mldLastMemberQueryInterval.trim(), 10) : null,
              max_response_time: mldMaxResponseTime.trim() ? parseInt(mldMaxResponseTime.trim(), 10) : null,
              version: mldVersion && mldVersion !== "default" ? parseInt(mldVersion, 10) : null,
              joins: mldJoins,
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
            {isEditMode ? "Edit PIMv6 Interface" : "Add PIMv6 Interface"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modify PIMv6 and MLD settings for ${existingInterface?.name}.`
              : "Add a new interface to PIMv6 multicast routing."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pim6">PIMv6 Settings</TabsTrigger>
            <TabsTrigger value="mld">MLD Settings</TabsTrigger>
          </TabsList>

          {/* PIMv6 Settings Tab */}
          <TabsContent value="pim6">
            <ScrollArea className="max-h-[55vh] pr-4">
              <div className="space-y-5 pb-2">
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

                <div className="space-y-2">
                  <Label htmlFor="pim6-dr-priority">DR Priority</Label>
                  <Input
                    id="pim6-dr-priority"
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

                <div className="space-y-2">
                  <Label htmlFor="pim6-hello">Hello Interval (seconds)</Label>
                  <Input
                    id="pim6-hello"
                    type="number"
                    value={hello}
                    onChange={(e) => setHello(e.target.value)}
                    placeholder="1-180"
                    min={1}
                    max={180}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Flags</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="pim6-passive" checked={passive} onCheckedChange={(c) => setPassive(!!c)} />
                      <Label htmlFor="pim6-passive">Passive (no PIMv6 hello packets)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="pim6-no-bsm" checked={noBsm} onCheckedChange={(c) => setNoBsm(!!c)} />
                      <Label htmlFor="pim6-no-bsm">No BSM (do not process bootstrap messages)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="pim6-no-unicast-bsm" checked={noUnicastBsm} onCheckedChange={(c) => setNoUnicastBsm(!!c)} />
                      <Label htmlFor="pim6-no-unicast-bsm">No Unicast BSM (block unicast bootstrap messages)</Label>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* MLD Settings Tab */}
          <TabsContent value="mld">
            <ScrollArea className="max-h-[55vh] pr-4">
              <div className="space-y-5 pb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="mld-disable" checked={mldDisabled} onCheckedChange={(c) => setMldDisabled(!!c)} />
                  <Label htmlFor="mld-disable">Disable MLD on this interface</Label>
                </div>

                <div className="space-y-2">
                  <Label>MLD Version</Label>
                  <Select value={mldVersion || "default"} onValueChange={setMldVersion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="1">Version 1</SelectItem>
                      <SelectItem value="2">Version 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mld-interval">Query Interval (seconds)</Label>
                  <Input
                    id="mld-interval"
                    type="number"
                    value={mldInterval}
                    onChange={(e) => setMldInterval(e.target.value)}
                    placeholder="1-65535"
                    min={1}
                    max={65535}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mld-lmqc">Last Member Query Count</Label>
                  <Input
                    id="mld-lmqc"
                    type="number"
                    value={mldLastMemberQueryCount}
                    onChange={(e) => setMldLastMemberQueryCount(e.target.value)}
                    placeholder="1-255"
                    min={1}
                    max={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mld-lmqi">Last Member Query Interval (milliseconds)</Label>
                  <Input
                    id="mld-lmqi"
                    type="number"
                    value={mldLastMemberQueryInterval}
                    onChange={(e) => setMldLastMemberQueryInterval(e.target.value)}
                    placeholder="100-6553500"
                    min={100}
                    max={6553500}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mld-mrt">Max Response Time (milliseconds)</Label>
                  <Input
                    id="mld-mrt"
                    type="number"
                    value={mldMaxResponseTime}
                    onChange={(e) => setMldMaxResponseTime(e.target.value)}
                    placeholder="100-6553500"
                    min={100}
                    max={6553500}
                  />
                </div>

                {/* MLD Joins */}
                <div className="space-y-3">
                  <div>
                    <Label>MLD Join Groups</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Statically join IPv6 multicast groups on this interface.
                    </p>
                  </div>

                  {mldJoins.map((join, joinIndex) => (
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

                      {join.sources.length > 0 && (
                        <div className="ml-2 space-y-1">
                          <p className="text-xs text-muted-foreground">Source Addresses:</p>
                          {join.sources.map((src, srcIndex) => (
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

                      <div className="flex items-center gap-2 ml-2">
                        <Input
                          value={joinSourceInputs[joinIndex] || ""}
                          onChange={(e) =>
                            setJoinSourceInputs({ ...joinSourceInputs, [joinIndex]: e.target.value })
                          }
                          placeholder="Add IPv6 source address"
                          className="h-8 text-xs font-mono"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddJoinSource(joinIndex);
                            }
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

                  <div className="flex items-center gap-2">
                    <Input
                      value={newJoinGroup}
                      onChange={(e) => setNewJoinGroup(e.target.value)}
                      placeholder="e.g. ff38::1234"
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
