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
import { Loader2, Server } from "lucide-react";
import { ipsecService, type IKEGroup, type ESPGroup } from "@/lib/api/ipsec";
import { useToast } from "@/hooks/useToast";

interface IPsecAddPeerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  ikeGroups: IKEGroup[];
  espGroups: ESPGroup[];
}

const CONNECTION_TYPES = [
  { value: "initiate", label: "Initiate" },
  { value: "respond", label: "Respond Only" },
];

const AUTH_MODES = [
  { value: "pre-shared-secret", label: "Pre-Shared Key" },
  { value: "x509", label: "X.509 Certificate" },
];

export function IPsecAddPeerModal({
  open,
  onOpenChange,
  onSuccess,
  ikeGroups,
  espGroups,
}: IPsecAddPeerModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Basic settings
  const [peerAddress, setPeerAddress] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [ikeGroup, setIkeGroup] = useState("");
  const [description, setDescription] = useState("");

  // Authentication
  const [authMode, setAuthMode] = useState("pre-shared-secret");
  const [preSharedKey, setPreSharedKey] = useState("");
  const [localId, setLocalId] = useState("");
  const [remoteId, setRemoteId] = useState("");

  // Connection
  const [connectionType, setConnectionType] = useState("initiate");
  const [defaultEspGroup, setDefaultEspGroup] = useState("");

  const resetForm = () => {
    setPeerAddress("");
    setLocalAddress("");
    setIkeGroup("");
    setDescription("");
    setAuthMode("pre-shared-secret");
    setPreSharedKey("");
    setLocalId("");
    setRemoteId("");
    setConnectionType("initiate");
    setDefaultEspGroup("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!peerAddress.trim()) {
      toast.error("Validation Error", "Peer address is required");
      return;
    }

    if (!ikeGroup) {
      toast.error("Validation Error", "IKE group is required");
      return;
    }

    if (authMode === "pre-shared-secret" && !preSharedKey.trim()) {
      toast.error("Validation Error", "Pre-shared key is required");
      return;
    }

    setLoading(true);
    try {
      const response = await ipsecService.createPeer(peerAddress.trim(), {
        ikeGroup,
        localAddress: localAddress.trim() || undefined,
        authMode,
        preSharedKey: authMode === "pre-shared-secret" ? preSharedKey : undefined,
        localId: localId.trim() || undefined,
        remoteId: remoteId.trim() || undefined,
        connectionType,
        defaultEspGroup: defaultEspGroup || undefined,
        description: description.trim() || undefined,
      });

      if (response.success) {
        toast.success("Peer Created", `IPsec peer ${peerAddress} has been created`);
        onOpenChange(false);
        onSuccess();
        resetForm();
      } else {
        toast.error("Failed to Create Peer", response.error || "Unknown error");
      }
    } catch (error) {
      console.error("Create peer error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to create peer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-500" />
            Add IPsec Peer
          </DialogTitle>
          <DialogDescription>
            Create a site-to-site VPN peer connection.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="peer-address">
                Peer Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="peer-address"
                placeholder="e.g., 203.0.113.1"
                value={peerAddress}
                onChange={(e) => setPeerAddress(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Remote peer IP address or hostname
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="local-address">Local Address</Label>
              <Input
                id="local-address"
                placeholder="e.g., 198.51.100.1"
                value={localAddress}
                onChange={(e) => setLocalAddress(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Local endpoint address (leave empty for any)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ike-group">
                  IKE Group <span className="text-destructive">*</span>
                </Label>
                <Select value={ikeGroup} onValueChange={setIkeGroup} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select IKE group" />
                  </SelectTrigger>
                  <SelectContent>
                    {ikeGroups.map((g) => (
                      <SelectItem key={g.name} value={g.name}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="connection-type">Connection Type</Label>
                <Select
                  value={connectionType}
                  onValueChange={setConnectionType}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONNECTION_TYPES.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value}>
                        {ct.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., VPN to Branch Office"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <p className="text-sm font-medium">Authentication</p>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="auth-mode">Mode</Label>
                  <Select value={authMode} onValueChange={setAuthMode} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTH_MODES.map((am) => (
                        <SelectItem key={am.value} value={am.value}>
                          {am.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {authMode === "pre-shared-secret" && (
                  <div className="grid gap-2">
                    <Label htmlFor="psk">
                      Pre-Shared Key <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="psk"
                      type="password"
                      placeholder="Enter pre-shared key"
                      value={preSharedKey}
                      onChange={(e) => setPreSharedKey(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                )}
              </div>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced">
                <AccordionTrigger className="text-sm">Advanced Options</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="local-id">Local ID</Label>
                      <Input
                        id="local-id"
                        placeholder="e.g., @local.example.com"
                        value={localId}
                        onChange={(e) => setLocalId(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="remote-id">Remote ID</Label>
                      <Input
                        id="remote-id"
                        placeholder="e.g., @remote.example.com"
                        value={remoteId}
                        onChange={(e) => setRemoteId(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="default-esp">Default ESP Group</Label>
                    <Select
                      value={defaultEspGroup}
                      onValueChange={setDefaultEspGroup}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ESP group (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {espGroups.map((g) => (
                          <SelectItem key={g.name} value={g.name}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Default ESP group for tunnels (can be overridden per tunnel)
                    </p>
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
              Create Peer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
