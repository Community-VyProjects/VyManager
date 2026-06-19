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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, Wifi, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import {
  ipsecService,
  RAConnection,
  IKEGroup,
  ESPGroup,
  RAPool,
  IPSecCapabilities,
} from "@/lib/api/ipsec";
import { ApiError } from "@/lib/types/api";

interface RemoteAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: IPSecCapabilities | null;
  ikeGroups: IKEGroup[];
  espGroups: ESPGroup[];
  pools: RAPool[];
  existingConnection: RAConnection | null;
}

interface LocalUserRow {
  username: string;
  password: string;
  disabled: boolean;
}

export function RemoteAccessModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  ikeGroups,
  espGroups,
  pools,
  existingConnection,
}: RemoteAccessModalProps) {
  const isEdit = !!existingConnection;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ikeGroup, setIkeGroup] = useState("");
  const [espGroup, setEspGroup] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [selectedPools, setSelectedPools] = useState("");
  const [authServerMode, setAuthServerMode] = useState("pre-shared-secret");
  const [authClientMode, setAuthClientMode] = useState("");
  const [authLocalId, setAuthLocalId] = useState("");
  const [authPsk, setAuthPsk] = useState("");
  const [showPsk, setShowPsk] = useState(false);
  const [authX509CaCert, setAuthX509CaCert] = useState("");
  const [authX509Cert, setAuthX509Cert] = useState("");
  const [alwaysSendCert, setAlwaysSendCert] = useState(false);
  const [localUsers, setLocalUsers] = useState<LocalUserRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingConnection) {
        setName(existingConnection.name);
        setDescription(existingConnection.description || "");
        setIkeGroup(existingConnection.ike_group || "");
        setEspGroup(existingConnection.esp_group || "");
        setLocalAddress(existingConnection.local_address || "");
        setSelectedPools((existingConnection.pools || []).join(", "));
        setAuthServerMode(existingConnection.auth_server_mode || "pre-shared-secret");
        setAuthClientMode(existingConnection.auth_client_mode || "");
        setAuthLocalId(existingConnection.auth_local_id || "");
        setAuthPsk("");
        setAuthX509CaCert(existingConnection.auth_x509_ca_cert || "");
        setAuthX509Cert(existingConnection.auth_x509_cert || "");
        setAlwaysSendCert(!!existingConnection.auth_always_send_cert);
        setLocalUsers(
          (existingConnection.local_users || []).map((u) => ({
            username: u.username,
            password: u.password || "",
            disabled: !!u.disabled,
          }))
        );
      } else {
        setName("");
        setDescription("");
        setIkeGroup("");
        setEspGroup("");
        setLocalAddress("");
        setSelectedPools("");
        setAuthServerMode("pre-shared-secret");
        setAuthClientMode("");
        setAuthLocalId("");
        setAuthPsk("");
        setAuthX509CaCert("");
        setAuthX509Cert("");
        setAlwaysSendCert(false);
        setLocalUsers([]);
      }
      setShowPsk(false);
      setError(null);
    }
  }, [open, existingConnection]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Connection name is required"); return; }

    setLoading(true);
    setError(null);

    try {
      const poolList = selectedPools.split(",").map((p) => p.trim()).filter(Boolean);
      const isX509 = authServerMode === "x509";
      const cleanedUsers = localUsers
        .map((u) => ({ username: u.username.trim(), password: u.password, disabled: u.disabled }))
        .filter((u) => u.username);

      const payload = {
        description: description || undefined,
        esp_group: espGroup || undefined,
        ike_group: ikeGroup || undefined,
        local_address: localAddress || undefined,
        pools: poolList.length > 0 ? poolList : undefined,
        auth_server_mode: authServerMode || undefined,
        auth_client_mode: authClientMode || undefined,
        auth_local_id: authLocalId || undefined,
        auth_psk: !isX509 ? authPsk || undefined : undefined,
        auth_x509_ca_cert: isX509 ? authX509CaCert || undefined : undefined,
        auth_x509_cert: isX509 ? authX509Cert || undefined : undefined,
        auth_always_send_cert: isX509 ? alwaysSendCert || undefined : undefined,
        local_users: cleanedUsers,
      };

      const result = isEdit
        ? await ipsecService.updateRAConnection(existingConnection!.name, payload, existingConnection!)
        : await ipsecService.createRAConnection(name.trim(), payload);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to save connection");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to save connection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-primary" />
            {isEdit ? "Edit" : "Create"} Remote Access Connection
          </DialogTitle>
          <DialogDescription>Configure a remote access IPSec VPN connection.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ra-vpn" disabled={isEdit} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Remote access VPN" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>IKE Group</Label>
              <Select value={ikeGroup} onValueChange={setIkeGroup}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {ikeGroups.map((g) => <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ESP Group</Label>
              <Select value={espGroup} onValueChange={setEspGroup}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {espGroups.map((g) => <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Local Address</Label>
              <Input value={localAddress} onChange={(e) => setLocalAddress(e.target.value)} placeholder="any or IP" />
            </div>
            <div className="space-y-2">
              <Label>Pools</Label>
              {pools.length > 0 ? (
                <div className="space-y-2">
                  {pools.map((pool) => {
                    const poolList = selectedPools.split(",").map((p) => p.trim()).filter(Boolean);
                    const isChecked = poolList.includes(pool.name);
                    return (
                      <div key={pool.name} className="flex items-center gap-2">
                        <Checkbox
                          id={`pool-${pool.name}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPools([...poolList, pool.name].join(", "));
                            } else {
                              setSelectedPools(poolList.filter((p) => p !== pool.name).join(", "));
                            }
                          }}
                        />
                        <Label htmlFor={`pool-${pool.name}`} className="cursor-pointer text-sm">{pool.name}</Label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pools configured</p>
              )}
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <Label className="text-sm font-medium">Authentication</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Server Mode</Label>
                <Select value={authServerMode} onValueChange={setAuthServerMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre-shared-secret">Pre-Shared Secret</SelectItem>
                    <SelectItem value="x509">X.509</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Client Mode</Label>
                <Select value={authClientMode || "_none"} onValueChange={(v) => setAuthClientMode(v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Default</SelectItem>
                    <SelectItem value="eap-mschapv2">EAP-MSCHAPv2</SelectItem>
                    <SelectItem value="eap-tls">EAP-TLS</SelectItem>
                    <SelectItem value="eap-radius">EAP-RADIUS</SelectItem>
                    <SelectItem value="x509">X.509</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Local ID</Label>
              <Input value={authLocalId} onChange={(e) => setAuthLocalId(e.target.value)} placeholder="@vpn-server" />
            </div>
            {authServerMode === "pre-shared-secret" && (
              <div className="space-y-2">
                <Label>Pre-Shared Key</Label>
                <div className="relative">
                  <Input
                    type={showPsk ? "text" : "password"}
                    value={authPsk}
                    onChange={(e) => setAuthPsk(e.target.value)}
                    placeholder="Enter PSK"
                    className="pr-10"
                  />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPsk(!showPsk)}>
                    {showPsk ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
            {authServerMode === "x509" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CA Certificate</Label>
                    <Input value={authX509CaCert} onChange={(e) => setAuthX509CaCert(e.target.value)} placeholder="ca-cert" />
                  </div>
                  <div className="space-y-2">
                    <Label>Certificate</Label>
                    <Input value={authX509Cert} onChange={(e) => setAuthX509Cert(e.target.value)} placeholder="server-cert" />
                  </div>
                </div>
                {(capabilities?.features.always_send_cert.supported ?? true) && (
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="always-send-cert"
                      checked={alwaysSendCert}
                      onCheckedChange={(checked) => setAlwaysSendCert(checked === true)}
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="always-send-cert" className="cursor-pointer text-sm">Always send certificate</Label>
                      <p className="text-xs text-muted-foreground">
                        Send the server certificate even when not requested. Required by some clients (e.g. Windows).
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Local Users</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLocalUsers([...localUsers, { username: "", password: "", disabled: false }])}
                >
                  <Plus className="mr-1 h-3 w-3" /> Add User
                </Button>
              </div>
              {localUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No local users configured</p>
              ) : (
                <div className="space-y-2">
                  {localUsers.map((user, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={user.username}
                        onChange={(e) => {
                          const next = [...localUsers];
                          next[idx] = { ...next[idx], username: e.target.value };
                          setLocalUsers(next);
                        }}
                        placeholder="username"
                      />
                      <Input
                        type="password"
                        value={user.password}
                        onChange={(e) => {
                          const next = [...localUsers];
                          next[idx] = { ...next[idx], password: e.target.value };
                          setLocalUsers(next);
                        }}
                        placeholder="password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setLocalUsers(localUsers.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Saving..." : "Creating..."}</> : isEdit ? "Save Changes" : "Create Connection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
