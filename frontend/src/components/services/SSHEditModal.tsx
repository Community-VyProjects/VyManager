"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Shield, Plus, X } from "lucide-react";
import { sshService, type SSHConfig, type SSHCapabilities, type SSHOperation } from "@/lib/api/ssh";
import { useToast } from "@/hooks/useToast";
import { Badge } from "@/components/ui/badge";

interface SSHEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: SSHConfig;
}

export function SSHEditModal({
  open,
  onOpenChange,
  onSuccess,
  config,
}: SSHEditModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<SSHCapabilities | null>(null);

  // Basic settings
  const [port, setPort] = useState("");
  const [listenAddresses, setListenAddresses] = useState<string[]>([]);
  const [disable, setDisable] = useState(false);
  const [disablePasswordAuth, setDisablePasswordAuth] = useState(false);
  const [disableHostValidation, setDisableHostValidation] = useState(false);
  const [keepaliveInterval, setKeepaliveInterval] = useState("");
  const [logLevel, setLogLevel] = useState("");
  const [vrf, setVrf] = useState("");

  // Access control
  const [allowUsers, setAllowUsers] = useState<string[]>([]);
  const [allowGroups, setAllowGroups] = useState<string[]>([]);
  const [denyUsers, setDenyUsers] = useState<string[]>([]);
  const [denyGroups, setDenyGroups] = useState<string[]>([]);

  // Dynamic protection
  const [dynamicProtectionEnabled, setDynamicProtectionEnabled] = useState(false);
  const [dpBlockTime, setDpBlockTime] = useState("");
  const [dpDetectTime, setDpDetectTime] = useState("");
  const [dpThreshold, setDpThreshold] = useState("");
  const [dpAllowFrom, setDpAllowFrom] = useState<string[]>([]);

  // Input fields
  const [newListenAddr, setNewListenAddr] = useState("");
  const [newAllowUser, setNewAllowUser] = useState("");
  const [newAllowGroup, setNewAllowGroup] = useState("");
  const [newDenyUser, setNewDenyUser] = useState("");
  const [newDenyGroup, setNewDenyGroup] = useState("");
  const [newDpAllowFrom, setNewDpAllowFrom] = useState("");

  useEffect(() => {
    if (open) {
      // Load capabilities
      sshService.getCapabilities().then(setCapabilities).catch(console.error);

      // Initialize form with current config
      setPort(config.port || "");
      setListenAddresses([...config.listen_addresses]);
      setDisable(config.disable);
      setDisablePasswordAuth(config.disable_password_authentication);
      setDisableHostValidation(config.disable_host_validation);
      setKeepaliveInterval(config.client_keepalive_interval || "");
      setLogLevel(config.loglevel || "__none__");
      setVrf(config.vrf || "");

      setAllowUsers([...config.access_control.allow.users]);
      setAllowGroups([...config.access_control.allow.groups]);
      setDenyUsers([...config.access_control.deny.users]);
      setDenyGroups([...config.access_control.deny.groups]);

      if (config.dynamic_protection) {
        setDynamicProtectionEnabled(config.dynamic_protection.enabled);
        setDpBlockTime(config.dynamic_protection.block_time || "");
        setDpDetectTime(config.dynamic_protection.detect_time || "");
        setDpThreshold(config.dynamic_protection.threshold || "");
        setDpAllowFrom([...config.dynamic_protection.allow_from]);
      } else {
        setDynamicProtectionEnabled(false);
        setDpBlockTime("");
        setDpDetectTime("");
        setDpThreshold("");
        setDpAllowFrom([]);
      }
    }
  }, [open, config]);

  const handleAddToList = (
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    setValue: (v: string) => void
  ) => {
    if (value.trim() && !list.includes(value.trim())) {
      setList([...list, value.trim()]);
      setValue("");
    }
  };

  const handleRemoveFromList = (value: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.filter(v => v !== value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const operations: SSHOperation[] = [];

      // Handle port
      if (port !== (config.port || "")) {
        if (port) {
          operations.push({ op: "set_port", port: parseInt(port) });
        }
      }

      // Handle listen addresses
      const currentListenAddrs = new Set(config.listen_addresses);
      const newListenAddrs = new Set(listenAddresses);

      for (const addr of config.listen_addresses) {
        if (!newListenAddrs.has(addr)) {
          operations.push({ op: "delete_listen_address", address: addr });
        }
      }
      for (const addr of listenAddresses) {
        if (!currentListenAddrs.has(addr)) {
          operations.push({ op: "add_listen_address", address: addr });
        }
      }

      // Handle disable toggle
      if (disable !== config.disable) {
        operations.push({ op: disable ? "disable_ssh" : "enable_ssh" });
      }

      // Handle password auth
      if (disablePasswordAuth !== config.disable_password_authentication) {
        operations.push({ op: disablePasswordAuth ? "disable_password_auth" : "enable_password_auth" });
      }

      // Handle host validation
      if (disableHostValidation !== config.disable_host_validation) {
        operations.push({ op: disableHostValidation ? "disable_host_validation" : "enable_host_validation" });
      }

      // Handle keepalive interval
      if (keepaliveInterval !== (config.client_keepalive_interval || "")) {
        if (keepaliveInterval) {
          operations.push({ op: "set_keepalive_interval", value: parseInt(keepaliveInterval) });
        } else if (config.client_keepalive_interval) {
          operations.push({ op: "delete_keepalive_interval" });
        }
      }

      // Handle log level
      const effectiveLogLevel = logLevel === "__none__" ? "" : logLevel;
      if (effectiveLogLevel !== (config.loglevel || "")) {
        if (effectiveLogLevel) {
          operations.push({ op: "set_loglevel", level: effectiveLogLevel });
        } else if (config.loglevel) {
          operations.push({ op: "delete_loglevel" });
        }
      }

      // Handle VRF
      if (vrf !== (config.vrf || "")) {
        if (vrf) {
          operations.push({ op: "set_vrf", vrf });
        } else if (config.vrf) {
          operations.push({ op: "delete_vrf" });
        }
      }

      // Handle access control - allow users
      const currentAllowUsers = new Set(config.access_control.allow.users);
      const newAllowUsersSet = new Set(allowUsers);
      for (const user of config.access_control.allow.users) {
        if (!newAllowUsersSet.has(user)) {
          operations.push({ op: "delete_allow_user", user });
        }
      }
      for (const user of allowUsers) {
        if (!currentAllowUsers.has(user)) {
          operations.push({ op: "allow_user", user });
        }
      }

      // Handle access control - allow groups
      const currentAllowGroups = new Set(config.access_control.allow.groups);
      const newAllowGroupsSet = new Set(allowGroups);
      for (const group of config.access_control.allow.groups) {
        if (!newAllowGroupsSet.has(group)) {
          operations.push({ op: "delete_allow_group", group });
        }
      }
      for (const group of allowGroups) {
        if (!currentAllowGroups.has(group)) {
          operations.push({ op: "allow_group", group });
        }
      }

      // Handle access control - deny users
      const currentDenyUsers = new Set(config.access_control.deny.users);
      const newDenyUsersSet = new Set(denyUsers);
      for (const user of config.access_control.deny.users) {
        if (!newDenyUsersSet.has(user)) {
          operations.push({ op: "delete_deny_user", user });
        }
      }
      for (const user of denyUsers) {
        if (!currentDenyUsers.has(user)) {
          operations.push({ op: "deny_user", user });
        }
      }

      // Handle access control - deny groups
      const currentDenyGroups = new Set(config.access_control.deny.groups);
      const newDenyGroupsSet = new Set(denyGroups);
      for (const group of config.access_control.deny.groups) {
        if (!newDenyGroupsSet.has(group)) {
          operations.push({ op: "delete_deny_group", group });
        }
      }
      for (const group of denyGroups) {
        if (!currentDenyGroups.has(group)) {
          operations.push({ op: "deny_group", group });
        }
      }

      // Handle dynamic protection
      const currentDpEnabled = config.dynamic_protection?.enabled || false;
      if (dynamicProtectionEnabled !== currentDpEnabled) {
        operations.push({ op: dynamicProtectionEnabled ? "enable_dynamic_protection" : "disable_dynamic_protection" });
      }

      if (dynamicProtectionEnabled) {
        if (dpBlockTime && dpBlockTime !== (config.dynamic_protection?.block_time || "")) {
          operations.push({ op: "set_dp_block_time", value: parseInt(dpBlockTime) });
        }
        if (dpDetectTime && dpDetectTime !== (config.dynamic_protection?.detect_time || "")) {
          operations.push({ op: "set_dp_detect_time", value: parseInt(dpDetectTime) });
        }
        if (dpThreshold && dpThreshold !== (config.dynamic_protection?.threshold || "")) {
          operations.push({ op: "set_dp_threshold", value: parseInt(dpThreshold) });
        }

        // Handle DP allow from
        const currentDpAllowFrom = new Set(config.dynamic_protection?.allow_from || []);
        const newDpAllowFromSet = new Set(dpAllowFrom);
        for (const network of (config.dynamic_protection?.allow_from || [])) {
          if (!newDpAllowFromSet.has(network)) {
            operations.push({ op: "delete_dp_allow_from", network });
          }
        }
        for (const network of dpAllowFrom) {
          if (!currentDpAllowFrom.has(network)) {
            operations.push({ op: "add_dp_allow_from", network });
          }
        }
      }

      if (operations.length === 0) {
        toast.info("No Changes", "No changes were made to the configuration");
        onOpenChange(false);
        return;
      }

      const response = await sshService.configureBatch({ operations });

      if (response.success) {
        toast.success("SSH Updated", "SSH service configuration has been updated");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error("Update Failed", response.error || "Unknown error");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Failed to update SSH configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-500" />
            Edit SSH Service Settings
          </DialogTitle>
          <DialogDescription>
            Configure SSH service settings and security options
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Basic Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  type="number"
                  placeholder={capabilities?.defaults.port.toString() || "22"}
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>Keepalive Interval (seconds)</Label>
                <Input
                  type="number"
                  placeholder={capabilities?.defaults.client_keepalive_interval.toString() || "180"}
                  value={keepaliveInterval}
                  onChange={(e) => setKeepaliveInterval(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Listen Addresses */}
            <div className="space-y-3">
              <Label>Listen Addresses</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., 192.168.1.1 or ::"
                  value={newListenAddr}
                  onChange={(e) => setNewListenAddr(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddToList(newListenAddr, listenAddresses, setListenAddresses, setNewListenAddr))}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleAddToList(newListenAddr, listenAddresses, setListenAddresses, setNewListenAddr)}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {listenAddresses.map((addr) => (
                  <Badge key={addr} variant="secondary" className="font-mono">
                    {addr}
                    <button
                      type="button"
                      onClick={() => handleRemoveFromList(addr, listenAddresses, setListenAddresses)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Log Level</Label>
                <Select value={logLevel} onValueChange={setLogLevel} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Default</SelectItem>
                    {capabilities?.log_levels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    )) || (
                      <>
                        <SelectItem value="QUIET">Quiet</SelectItem>
                        <SelectItem value="FATAL">Fatal</SelectItem>
                        <SelectItem value="ERROR">Error</SelectItem>
                        <SelectItem value="INFO">Info</SelectItem>
                        <SelectItem value="VERBOSE">Verbose</SelectItem>
                        <SelectItem value="DEBUG">Debug</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>VRF</Label>
                <Input
                  placeholder="VRF name (optional)"
                  value={vrf}
                  onChange={(e) => setVrf(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm">Disable SSH Service</Label>
                </div>
                <Switch
                  checked={disable}
                  onCheckedChange={setDisable}
                  disabled={loading}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm">Disable Password Authentication</Label>
                  <p className="text-xs text-muted-foreground">Require SSH key authentication only</p>
                </div>
                <Switch
                  checked={disablePasswordAuth}
                  onCheckedChange={setDisablePasswordAuth}
                  disabled={loading}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm">Disable Host Validation</Label>
                </div>
                <Switch
                  checked={disableHostValidation}
                  onCheckedChange={setDisableHostValidation}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Advanced Settings */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="access-control">
                <AccordionTrigger>Access Control</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  {/* Allow Users */}
                  <div className="space-y-2">
                    <Label className="text-sm">Allow Users</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Username"
                        value={newAllowUser}
                        onChange={(e) => setNewAllowUser(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddToList(newAllowUser, allowUsers, setAllowUsers, setNewAllowUser))}
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleAddToList(newAllowUser, allowUsers, setAllowUsers, setNewAllowUser)}
                        disabled={loading}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {allowUsers.map((user) => (
                        <Badge key={user} variant="secondary" className="bg-green-500/10">
                          {user}
                          <button type="button" onClick={() => handleRemoveFromList(user, allowUsers, setAllowUsers)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Allow Groups */}
                  <div className="space-y-2">
                    <Label className="text-sm">Allow Groups</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Group name"
                        value={newAllowGroup}
                        onChange={(e) => setNewAllowGroup(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddToList(newAllowGroup, allowGroups, setAllowGroups, setNewAllowGroup))}
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleAddToList(newAllowGroup, allowGroups, setAllowGroups, setNewAllowGroup)}
                        disabled={loading}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {allowGroups.map((group) => (
                        <Badge key={group} variant="secondary" className="bg-green-500/10">
                          {group}
                          <button type="button" onClick={() => handleRemoveFromList(group, allowGroups, setAllowGroups)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Deny Users */}
                  <div className="space-y-2">
                    <Label className="text-sm">Deny Users</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Username"
                        value={newDenyUser}
                        onChange={(e) => setNewDenyUser(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddToList(newDenyUser, denyUsers, setDenyUsers, setNewDenyUser))}
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleAddToList(newDenyUser, denyUsers, setDenyUsers, setNewDenyUser)}
                        disabled={loading}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {denyUsers.map((user) => (
                        <Badge key={user} variant="secondary" className="bg-red-500/10">
                          {user}
                          <button type="button" onClick={() => handleRemoveFromList(user, denyUsers, setDenyUsers)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Deny Groups */}
                  <div className="space-y-2">
                    <Label className="text-sm">Deny Groups</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Group name"
                        value={newDenyGroup}
                        onChange={(e) => setNewDenyGroup(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddToList(newDenyGroup, denyGroups, setDenyGroups, setNewDenyGroup))}
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleAddToList(newDenyGroup, denyGroups, setDenyGroups, setNewDenyGroup)}
                        disabled={loading}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {denyGroups.map((group) => (
                        <Badge key={group} variant="secondary" className="bg-red-500/10">
                          {group}
                          <button type="button" onClick={() => handleRemoveFromList(group, denyGroups, setDenyGroups)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="dynamic-protection">
                <AccordionTrigger>Dynamic Protection (Brute Force)</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label className="text-sm">Enable Dynamic Protection</Label>
                      <p className="text-xs text-muted-foreground">Block IPs after too many failed attempts</p>
                    </div>
                    <Switch
                      checked={dynamicProtectionEnabled}
                      onCheckedChange={setDynamicProtectionEnabled}
                      disabled={loading}
                    />
                  </div>

                  {dynamicProtectionEnabled && (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm">Block Time (sec)</Label>
                          <Input
                            type="number"
                            placeholder={capabilities?.dynamic_protection_defaults.block_time.toString() || "120"}
                            value={dpBlockTime}
                            onChange={(e) => setDpBlockTime(e.target.value)}
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Detect Time (sec)</Label>
                          <Input
                            type="number"
                            placeholder={capabilities?.dynamic_protection_defaults.detect_time.toString() || "1800"}
                            value={dpDetectTime}
                            onChange={(e) => setDpDetectTime(e.target.value)}
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Threshold</Label>
                          <Input
                            type="number"
                            placeholder={capabilities?.dynamic_protection_defaults.threshold.toString() || "30"}
                            value={dpThreshold}
                            onChange={(e) => setDpThreshold(e.target.value)}
                            disabled={loading}
                          />
                        </div>
                      </div>

                      {/* DP Allow From */}
                      <div className="space-y-2">
                        <Label className="text-sm">Whitelist Networks</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g., 10.0.0.0/8"
                            value={newDpAllowFrom}
                            onChange={(e) => setNewDpAllowFrom(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddToList(newDpAllowFrom, dpAllowFrom, setDpAllowFrom, setNewDpAllowFrom))}
                            disabled={loading}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleAddToList(newDpAllowFrom, dpAllowFrom, setDpAllowFrom, setNewDpAllowFrom)}
                            disabled={loading}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {dpAllowFrom.map((network) => (
                            <Badge key={network} variant="secondary" className="font-mono">
                              {network}
                              <button type="button" onClick={() => handleRemoveFromList(network, dpAllowFrom, setDpAllowFrom)} className="ml-1 hover:text-destructive">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
