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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import type { Pim6RpAddress } from "@/lib/api/pim6";
import { isValidIPv6, isValidIPv6CIDR } from "@/lib/validators/firewall";

type MatchMode = "groups" | "prefix-list6";

interface Pim6RpAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rp: Pim6RpAddress) => Promise<void>;
  existingRp?: Pim6RpAddress | null;
}

export function Pim6RpAddressModal({
  open,
  onOpenChange,
  onSubmit,
  existingRp,
}: Pim6RpAddressModalProps) {
  const isEditMode = !!existingRp;

  const [address, setAddress] = useState("");
  const [mode, setMode] = useState<MatchMode>("groups");
  const [groups, setGroups] = useState<string[]>([]);
  const [newGroup, setNewGroup] = useState("");
  const [prefixList, setPrefixList] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingRp) {
        setAddress(existingRp.address);
        if (existingRp.prefix_list6) {
          setMode("prefix-list6");
          setPrefixList(existingRp.prefix_list6);
          setGroups([]);
        } else {
          setMode("groups");
          setGroups([...existingRp.groups]);
          setPrefixList("");
        }
        setNewGroup("");
        setError(null);
      } else {
        resetForm();
      }
    }
  }, [open, existingRp]);

  const resetForm = () => {
    setAddress("");
    setMode("groups");
    setGroups([]);
    setNewGroup("");
    setPrefixList("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleModeChange = (next: MatchMode) => {
    setMode(next);
    setError(null);
  };

  const validateForm = (): string | null => {
    const trimmed = address.trim();
    if (!trimmed) {
      return "RP address is required";
    }
    if (!isValidIPv6(trimmed) || trimmed === "") {
      return "RP address must be a valid IPv6 address";
    }
    if (mode === "groups") {
      if (groups.length === 0) {
        return "Add at least one IPv6 group prefix, or switch to prefix-list6 mode";
      }
      for (const g of groups) {
        if (!isValidIPv6CIDR(g) || g === "") {
          return `Invalid group format: ${g}. Use IPv6 CIDR notation (e.g., ff00::/8)`;
        }
      }
    } else {
      if (!prefixList.trim()) {
        return "Prefix-list6 name is required";
      }
    }
    return null;
  };

  const handleAddGroup = () => {
    const value = newGroup.trim();
    if (!value) return;
    if (groups.includes(value)) {
      setError("Group already exists");
      return;
    }
    if (!isValidIPv6CIDR(value) || value === "") {
      setError(`Invalid IPv6 CIDR: ${value}`);
      return;
    }
    setGroups([...groups, value]);
    setNewGroup("");
    setError(null);
  };

  const handleRemoveGroup = (index: number) => {
    setGroups(groups.filter((_, i) => i !== index));
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
      await onSubmit({
        address: address.trim(),
        groups: mode === "groups" ? groups : [],
        prefix_list6: mode === "prefix-list6" ? prefixList.trim() : null,
      });
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit RP Address" : "Add RP Address"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modify the Rendezvous Point configuration for ${existingRp?.address}.`
              : "Add a new Rendezvous Point address for PIMv6 multicast routing."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* RP Address */}
            <div className="space-y-2">
              <Label>RP Address</Label>
              {isEditMode ? (
                <Input value={address} disabled className="bg-muted font-mono" />
              ) : (
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 2001:db8::1"
                  className="font-mono"
                />
              )}
              <p className="text-xs text-muted-foreground">
                IPv6 address of the Rendezvous Point.
              </p>
            </div>

            {/* Match mode */}
            <div className="space-y-3">
              <Label>Group Matching</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => handleModeChange(v as MatchMode)}
                className="gap-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="groups" id="mode-groups" />
                  <Label htmlFor="mode-groups" className="font-normal cursor-pointer">
                    Match by explicit IPv6 group prefixes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="prefix-list6" id="mode-prefix" />
                  <Label htmlFor="mode-prefix" className="font-normal cursor-pointer">
                    Match by IPv6 prefix-list
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {mode === "groups" ? (
              <div className="space-y-3">
                <div>
                  <Label>Multicast Groups (IPv6)</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Multicast group ranges this RP serves. Use IPv6 CIDR notation (e.g., ff00::/8).
                  </p>
                </div>

                {groups.length > 0 && (
                  <div className="space-y-2">
                    {groups.map((group, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 rounded-md border bg-muted font-mono text-sm">
                          {group}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                          onClick={() => handleRemoveGroup(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Input
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    placeholder="e.g. ff00::/8"
                    className="font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddGroup();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={handleAddGroup}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Prefix-list6 Name</Label>
                <Input
                  value={prefixList}
                  onChange={(e) => setPrefixList(e.target.value)}
                  placeholder="e.g. MCAST-GROUPS"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Name of an IPv6 prefix-list (configured under <code>policy prefix-list6</code>).
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

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
              "Add RP Address"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
