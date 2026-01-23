"use client";

import { useState } from "react";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, ArrowLeftRight } from "lucide-react";
import { bgpService } from "@/lib/api/bgp";
import { useToast } from "@/hooks/useToast";

interface BGPAddPeerGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  asn: string;
}

export function BGPAddPeerGroupModal({
  open,
  onOpenChange,
  onSuccess,
  asn,
}: BGPAddPeerGroupModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Basic settings
  const [name, setName] = useState("");
  const [remoteAs, setRemoteAs] = useState("");
  const [description, setDescription] = useState("");

  // Optional settings
  const [updateSource, setUpdateSource] = useState("");
  const [ebgpMultihop, setEbgpMultihop] = useState("");
  const [passive, setPassive] = useState(false);

  const resetForm = () => {
    setName("");
    setRemoteAs("");
    setDescription("");
    setUpdateSource("");
    setEbgpMultihop("");
    setPassive(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Validation Error", "Peer group name is required");
      return;
    }

    // Validate name format (alphanumeric, dash, underscore)
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name.trim())) {
      toast.error(
        "Validation Error",
        "Name must start with a letter and contain only letters, numbers, dashes, and underscores"
      );
      return;
    }

    setLoading(true);
    try {
      const operations: Array<{ op: string; [key: string]: string | number | boolean }> = [];

      // Create peer group
      operations.push({
        op: "add_peer_group",
        group: name.trim(),
        remote_as: remoteAs.trim() || "0", // 0 means inherit from neighbor
      });

      if (description.trim()) {
        operations.push({
          op: "set_peer_group_description",
          group: name.trim(),
          value: description.trim(),
        });
      }

      if (updateSource.trim()) {
        operations.push({
          op: "set_peer_group_update_source",
          group: name.trim(),
          value: updateSource.trim(),
        });
      }

      if (ebgpMultihop.trim()) {
        operations.push({
          op: "set_peer_group_ebgp_multihop",
          group: name.trim(),
          value: parseInt(ebgpMultihop, 10),
        });
      }

      if (passive) {
        operations.push({
          op: "enable_peer_group_passive",
          group: name.trim(),
        });
      }

      const response = await bgpService.configureBatch({ asn, operations });

      if (response.success) {
        toast.success("Peer Group Added", `Peer group ${name} has been created`);
        onOpenChange(false);
        onSuccess();
        resetForm();
      } else {
        toast.error("Failed to Add Peer Group", response.error || "Unknown error");
      }
    } catch (error) {
      console.error("Add peer group error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to add peer group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-orange-500" />
            Add Peer Group
          </DialogTitle>
          <DialogDescription>
            Create a peer group template for BGP neighbor configuration.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Group Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., TRANSIT or CUSTOMERS"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="remote-as">Remote AS</Label>
              <Input
                id="remote-as"
                placeholder="e.g., 65001 (optional)"
                value={remoteAs}
                onChange={(e) => setRemoteAs(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty if neighbors in this group have different ASNs
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Transit providers"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced">
                <AccordionTrigger className="text-sm">Advanced Options</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="update-source">Update Source</Label>
                    <Input
                      id="update-source"
                      placeholder="e.g., lo0 or 10.0.0.1"
                      value={updateSource}
                      onChange={(e) => setUpdateSource(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="ebgp-multihop">eBGP Multihop</Label>
                    <Input
                      id="ebgp-multihop"
                      type="number"
                      min="1"
                      max="255"
                      placeholder="e.g., 2"
                      value={ebgpMultihop}
                      onChange={(e) => setEbgpMultihop(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="passive">Passive Mode</Label>
                      <p className="text-xs text-muted-foreground">
                        Wait for neighbor to initiate
                      </p>
                    </div>
                    <Switch
                      id="passive"
                      checked={passive}
                      onCheckedChange={setPassive}
                      disabled={loading}
                    />
                  </div>
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
              Add Peer Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
