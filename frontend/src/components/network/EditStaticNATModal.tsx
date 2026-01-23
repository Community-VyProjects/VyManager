"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { natService } from "@/lib/api/nat";
import { ethernetService } from "@/lib/api/ethernet";
import type { EthernetInterface } from "@/lib/api/types/ethernet";
import type { StaticNATRule } from "@/lib/api/nat";

interface EditStaticNATModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: StaticNATRule | null;
  onSuccess: () => void;
}

export function EditStaticNATModal({ open, onOpenChange, rule, onSuccess }: EditStaticNATModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdown data
  const [interfaces, setInterfaces] = useState<EthernetInterface[]>([]);

  // Form fields - Description
  const [description, setDescription] = useState("");

  // Destination
  const [destinationAddress, setDestinationAddress] = useState("");

  // Inbound interface
  const [inboundInterfaceName, setInboundInterfaceName] = useState("");

  // Translation
  const [translationAddress, setTranslationAddress] = useState("");

  // Load interfaces on mount
  useEffect(() => {
    if (open) {
      loadInterfaces();
    }
  }, [open]);

  // Populate form when rule changes
  useEffect(() => {
    if (rule && open) {
      populateForm(rule);
    }
  }, [rule, open]);

  const populateForm = (rule: StaticNATRule) => {
    // Description
    setDescription(rule.description || "");

    // Destination
    if (rule.destination?.address) {
      setDestinationAddress(rule.destination.address);
    }

    // Inbound interface
    if (rule.inbound_interface) {
      setInboundInterfaceName(rule.inbound_interface);
    }

    // Translation
    if (rule.translation?.address) {
      setTranslationAddress(rule.translation.address);
    }
  };

  const loadInterfaces = async () => {
    try {
      const config = await ethernetService.getConfig();
      setInterfaces(config.interfaces);
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!rule) return;

    setLoading(true);
    setError(null);

    try {
      const config: any = {};

      if (description.trim()) {
        config.description = description.trim();
      }

      // Destination
      if (destinationAddress.trim()) {
        config.destination_address = destinationAddress.trim();
      }

      // Inbound interface
      if (inboundInterfaceName) {
        config.inbound_interface = inboundInterfaceName;
      }

      // Translation
      if (translationAddress.trim()) {
        config.translation_address = translationAddress.trim();
      }

      // Update the rule
      await natService.updateStaticRule(rule.rule_number, config);

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update static NAT rule");
    } finally {
      setLoading(false);
    }
  };

  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Static NAT Rule {rule.rule_number}</DialogTitle>
          <DialogDescription>
            Modify the static NAT rule configuration (1:1 mapping).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Alert */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this rule"
              rows={2}
            />
          </div>

          {/* Destination Address */}
          <div className="space-y-2">
            <Label htmlFor="destination-address">Destination Address (External)</Label>
            <Input
              id="destination-address"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="e.g., 203.0.113.10"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              The external/public IP address
            </p>
          </div>

          {/* Inbound Interface */}
          <div className="space-y-2">
            <Label htmlFor="inbound-interface">Inbound Interface (Optional)</Label>
            <Select value={inboundInterfaceName || undefined} onValueChange={setInboundInterfaceName}>
              <SelectTrigger id="inbound-interface">
                <SelectValue placeholder="Select interface (optional)" />
              </SelectTrigger>
              <SelectContent>
                {interfaces.map((iface) => (
                  <SelectItem key={iface.name} value={iface.name}>
                    {iface.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {inboundInterfaceName && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInboundInterfaceName("")}
                className="h-6 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear selection
              </Button>
            )}
          </div>

          {/* Translation Address */}
          <div className="space-y-2">
            <Label htmlFor="translation-address">Translation Address (Internal)</Label>
            <Input
              id="translation-address"
              value={translationAddress}
              onChange={(e) => setTranslationAddress(e.target.value)}
              placeholder="e.g., 192.168.1.10"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              The internal/private IP address to translate to
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating..." : "Update Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
