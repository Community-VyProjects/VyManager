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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import { InterfaceSelect } from "@/components/ui/interface-select";
import type { Srv6Locator } from "@/lib/api/segment-routing";

interface LocatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (locator: Srv6Locator, enableInterface?: string) => Promise<void>;
  existingLocator?: Srv6Locator | null;
  existingNames: string[];
  /**
   * True when no interface has SRv6 enabled yet. VyOS refuses to commit a
   * locator unless at least one interface has SRv6 enabled in the same
   * commit, so creation must bundle an interface enable.
   */
  needsInterfaceEnable: boolean;
  /** True on VyOS 1.4: saving rewrites the whole segment-routing tree. */
  requiresRecreate: boolean;
}

const DEFAULT_BLOCK_LEN = 40;
const DEFAULT_NODE_LEN = 24;

export function LocatorModal({
  open,
  onOpenChange,
  onSubmit,
  existingLocator,
  existingNames,
  needsInterfaceEnable,
  requiresRecreate,
}: LocatorModalProps) {
  const isEditMode = !!existingLocator;

  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [blockLen, setBlockLen] = useState("");
  const [nodeLen, setNodeLen] = useState("");
  const [funcBits, setFuncBits] = useState("");
  const [behaviorUsid, setBehaviorUsid] = useState(false);
  const [enableInterface, setEnableInterface] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setPrefix("");
    setBlockLen("");
    setNodeLen("");
    setFuncBits("");
    setBehaviorUsid(false);
    setEnableInterface("");
    setError(null);
  };

  useEffect(() => {
    if (open) {
      if (existingLocator) {
        setName(existingLocator.name);
        setPrefix(existingLocator.prefix ?? "");
        setBlockLen(existingLocator.block_len != null ? String(existingLocator.block_len) : "");
        setNodeLen(existingLocator.node_len != null ? String(existingLocator.node_len) : "");
        setFuncBits(existingLocator.func_bits != null ? String(existingLocator.func_bits) : "");
        setBehaviorUsid(existingLocator.behavior_usid);
        setEnableInterface("");
        setError(null);
      } else {
        resetForm();
      }
    }
  }, [open, existingLocator]);

  const validateForm = (): string | null => {
    if (!name.trim()) return "Locator name is required";
    if (!/^[a-zA-Z0-9\-_]+$/.test(name.trim())) {
      return "Locator name may contain only letters, digits, hyphens and underscores";
    }
    if (!isEditMode && existingNames.includes(name.trim())) {
      return `Locator ${name.trim()} already exists`;
    }

    if (!prefix.trim()) return "Locator prefix is required";
    const prefixMatch = prefix.trim().match(/^([0-9a-fA-F:]+)\/(\d{1,3})$/);
    if (!prefixMatch) return "Prefix must be an IPv6 network, e.g. 2001:db8:aaaa:bbbb::/64";
    const prefixLen = parseInt(prefixMatch[2], 10);
    if (prefixLen < 1 || prefixLen > 128) return "Prefix length must be between 1 and 128";

    let block = DEFAULT_BLOCK_LEN;
    if (blockLen) {
      block = parseInt(blockLen, 10);
      if (isNaN(block) || block < 16 || block > 64) return "Block length must be between 16 and 64";
    }
    let node = DEFAULT_NODE_LEN;
    if (nodeLen) {
      node = parseInt(nodeLen, 10);
      if (isNaN(node) || node < 16 || node > 64) return "Node length must be between 16 and 64";
    }
    if (funcBits) {
      const func = parseInt(funcBits, 10);
      if (isNaN(func) || func < 0 || func > 64) return "Function bits must be between 0 and 64";
    }

    // FRR requires this equality but VyOS reports only a bare "Commit
    // failed" when it is violated, so enforce it client-side.
    if (prefixLen !== block + node) {
      return `Prefix length must equal block length + node length (${block} + ${node} = ${block + node}, but the prefix is /${prefixLen})`;
    }

    if (!isEditMode && needsInterfaceEnable && !enableInterface) {
      return "Select an interface to enable SRv6 on";
    }

    return null;
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    const locator: Srv6Locator = {
      name: name.trim(),
      prefix: prefix.trim(),
      block_len: blockLen ? parseInt(blockLen, 10) : null,
      node_len: nodeLen ? parseInt(nodeLen, 10) : null,
      func_bits: funcBits ? parseInt(funcBits, 10) : null,
      behavior_usid: behaviorUsid,
    };

    try {
      await onSubmit(
        locator,
        !isEditMode && needsInterfaceEnable ? enableInterface : undefined
      );
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Locator" : "Add Locator"}</DialogTitle>
          <DialogDescription>
            Configure an SRv6 locator — the IPv6 prefix this router advertises
            for Segment Routing segments.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="sr-locator-name">Locator Name</Label>
              <Input
                id="sr-locator-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. main"
                disabled={isEditMode}
                className={isEditMode ? "bg-muted" : ""}
              />
            </div>

            {/* Prefix */}
            <div className="space-y-1.5">
              <Label htmlFor="sr-locator-prefix">Prefix</Label>
              <Input
                id="sr-locator-prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="e.g. 2001:db8:aaaa:bbbb::/64"
              />
              <p className="text-xs text-muted-foreground">
                IPv6 network. The prefix length must equal block length + node
                length (defaults 40 + 24 → /64).
              </p>
            </div>

            {/* Lengths */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sr-block-len">Block Length</Label>
                <Input
                  id="sr-block-len"
                  type="number"
                  min={16}
                  max={64}
                  value={blockLen}
                  onChange={(e) => setBlockLen(e.target.value)}
                  placeholder="Default: 40"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sr-node-len">Node Length</Label>
                <Input
                  id="sr-node-len"
                  type="number"
                  min={16}
                  max={64}
                  value={nodeLen}
                  onChange={(e) => setNodeLen(e.target.value)}
                  placeholder="Default: 24"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sr-func-bits">Function Bits</Label>
                <Input
                  id="sr-func-bits"
                  type="number"
                  min={0}
                  max={64}
                  value={funcBits}
                  onChange={(e) => setFuncBits(e.target.value)}
                  placeholder="Default: 16"
                />
              </div>
            </div>

            {/* uSID */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="sr-behavior-usid"
                checked={behaviorUsid}
                onCheckedChange={(checked) => setBehaviorUsid(checked === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="sr-behavior-usid" className="cursor-pointer">
                  uSID Behavior
                </Label>
                <p className="text-xs text-muted-foreground">
                  Use compressed micro-segment (uSID) behavior for this locator
                </p>
              </div>
            </div>

            {/* Interface enable — bundled into the same commit */}
            {!isEditMode && needsInterfaceEnable && (
              <div className="rounded-md border border-border p-4 space-y-3">
                <div className="space-y-0.5">
                  <Label>Enable SRv6 on Interface</Label>
                  <p className="text-xs text-muted-foreground">
                    VyOS requires SRv6 to be enabled on at least one interface
                    before a locator can be committed. No interface has SRv6
                    enabled yet, so this change is applied together with the
                    locator in a single commit.
                  </p>
                </div>
                <InterfaceSelect
                  value={enableInterface}
                  onValueChange={setEnableInterface}
                  placeholder="Select an interface"
                />
              </div>
            )}

            {/* 1.4 recreate warning */}
            {isEditMode && requiresRecreate && (
              <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  This router runs VyOS 1.4, which cannot modify existing
                  Segment Routing configuration in place. Saving removes the
                  whole segment-routing tree and recreates it with your change,
                  in two commits. If the second commit fails, the tree is left
                  empty — refresh and re-apply from this page.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
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
                {isEditMode ? "Saving..." : "Creating..."}
              </>
            ) : isEditMode ? (
              requiresRecreate ? "Rewrite & Save" : "Save Changes"
            ) : (
              "Add Locator"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
