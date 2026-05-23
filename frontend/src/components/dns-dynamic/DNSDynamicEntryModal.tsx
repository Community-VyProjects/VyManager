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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import type { DynamicNameEntry } from "@/lib/api/dns-dynamic";
import { showService, InterfaceName } from "@/lib/api/show";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: DynamicNameEntry | null;
  onSubmit: (name: string, fields: Omit<DynamicNameEntry, "name">) => Promise<void>;
}

type AddressSource = "interface" | "web";

export function DNSDynamicEntryModal({ open, onOpenChange, entry, onSubmit }: Props) {
  const isEdit = !!entry;

  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [interfacesLoading, setInterfacesLoading] = useState(false);

  const [name, setName] = useState("");
  const [protocol, setProtocol] = useState("");
  const [server, setServer] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hostnames, setHostnames] = useState<string[]>([]);
  const [newHostname, setNewHostname] = useState("");
  const [ipVersion, setIpVersion] = useState("");
  const [addressSource, setAddressSource] = useState<AddressSource>("interface");
  const [addressInterface, setAddressInterface] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [webSkip, setWebSkip] = useState("");
  const [description, setDescription] = useState("");
  const [ttl, setTtl] = useState("");
  const [key, setKey] = useState("");
  const [expiryTime, setExpiryTime] = useState("");
  const [waitTime, setWaitTime] = useState("");
  const [zone, setZone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInterfaces = async () => {
    setInterfacesLoading(true);
    try {
      const response = await showService.getAllInterfaces();
      setAvailableInterfaces(response.interfaces);
    } catch {
      // non-critical
    } finally {
      setInterfacesLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadInterfaces();
      if (entry) {
        setName(entry.name);
        setProtocol(entry.protocol ?? "");
        setServer(entry.server ?? "");
        setUsername(entry.username ?? "");
        setPassword(entry.password ?? "");
        setHostnames([...entry.hostnames]);
        setIpVersion(entry.ip_version ?? "");
        if (entry.address.web_url) {
          setAddressSource("web");
          setWebUrl(entry.address.web_url ?? "");
          setWebSkip(entry.address.web_skip ?? "");
          setAddressInterface("");
        } else {
          setAddressSource("interface");
          setAddressInterface(entry.address.interface ?? "");
          setWebUrl("");
          setWebSkip("");
        }
        setDescription(entry.description ?? "");
        setTtl(entry.ttl != null ? String(entry.ttl) : "");
        setKey(entry.key ?? "");
        setExpiryTime(entry.expiry_time != null ? String(entry.expiry_time) : "");
        setWaitTime(entry.wait_time != null ? String(entry.wait_time) : "");
        setZone(entry.zone ?? "");
      } else {
        setName("");
        setProtocol("");
        setServer("");
        setUsername("");
        setPassword("");
        setHostnames([]);
        setNewHostname("");
        setIpVersion("");
        setAddressSource("interface");
        setAddressInterface("");
        setWebUrl("");
        setWebSkip("");
        setDescription("");
        setTtl("");
        setKey("");
        setExpiryTime("");
        setWaitTime("");
        setZone("");
      }
      setError(null);
    }
  }, [open, entry]);

  const addHostname = () => {
    const h = newHostname.trim();
    if (h && !hostnames.includes(h)) {
      setHostnames([...hostnames, h]);
      setNewHostname("");
    }
  };

  const handleSubmit = async () => {
    if (!isEdit && !name.trim()) {
      setError("Name is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(isEdit ? entry!.name : name.trim(), {
        protocol: protocol.trim() || null,
        server: server.trim() || null,
        username: username.trim() || null,
        password: password || null,
        hostnames,
        ip_version: ipVersion || null,
        address: {
          interface: addressSource === "interface" ? addressInterface.trim() || null : null,
          web_url: addressSource === "web" ? webUrl.trim() || null : null,
          web_skip: addressSource === "web" ? webSkip.trim() || null : null,
        },
        description: description.trim() || null,
        ttl: ttl ? parseInt(ttl, 10) : null,
        key: key.trim() || null,
        expiry_time: expiryTime ? parseInt(expiryTime, 10) : null,
        wait_time: waitTime ? parseInt(waitTime, 10) : null,
        zone: zone.trim() || null,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit DDNS Entry" : "Add DDNS Entry"}</DialogTitle>
          <DialogDescription>Configure a Dynamic DNS update entry.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic">
          <TabsList className="w-full">
            <TabsTrigger value="basic" className="flex-1">Basic</TabsTrigger>
            <TabsTrigger value="address" className="flex-1">Address</TabsTrigger>
            <TabsTrigger value="options" className="flex-1">Options</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="ddns-name">Name</Label>
                  <Input
                    id="ddns-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. my-ddns"
                    disabled={isEdit}
                    className={isEdit ? "bg-muted font-mono" : "font-mono"}
                  />
                  {isEdit && <p className="text-xs text-muted-foreground">Name cannot be changed after creation.</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ddns-protocol">Protocol</Label>
                  <Input
                    id="ddns-protocol"
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    placeholder="e.g. dyndns2, cloudflare"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ddns-server">Server (optional)</Label>
                  <Input
                    id="ddns-server"
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    placeholder="e.g. members.dyndns.org"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ddns-user">Username</Label>
                  <Input
                    id="ddns-user"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ddns-pass">Password</Label>
                  <Input
                    id="ddns-pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hostnames</Label>
                  {hostnames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {hostnames.map((h) => (
                        <Badge key={h} variant="secondary" className="font-mono gap-1 pr-1">
                          {h}
                          <button onClick={() => setHostnames(hostnames.filter((x) => x !== h))} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={newHostname}
                      onChange={(e) => setNewHostname(e.target.value)}
                      placeholder="host.example.com"
                      className="font-mono"
                      onKeyDown={(e) => e.key === "Enter" && addHostname()}
                    />
                    <Button variant="outline" size="icon" onClick={addHostname} disabled={!newHostname.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>IP Version</Label>
                  <Select value={ipVersion || "none"} onValueChange={(v) => setIpVersion(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      <SelectItem value="ipv4">IPv4</SelectItem>
                      <SelectItem value="ipv6">IPv6</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="address">
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select value={addressSource} onValueChange={(v) => setAddressSource(v as AddressSource)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interface">Interface</SelectItem>
                      <SelectItem value="web">Web URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {addressSource === "interface" ? (
                  <div className="space-y-2">
                    <Label>Interface</Label>
                    <Select
                      value={addressInterface || "none"}
                      onValueChange={(v) => setAddressInterface(v === "none" ? "" : v)}
                    >
                      <SelectTrigger className="font-mono">
                        <SelectValue
                          placeholder={
                            interfacesLoading ? "Loading interfaces..." : "Select interface"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">None</span>
                        </SelectItem>
                        {availableInterfaces.map((iface) => (
                          <SelectItem key={iface.name} value={iface.name}>
                            <span className="font-mono">{iface.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs">({iface.type})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="ddns-weburl">Web URL</Label>
                      <Input
                        id="ddns-weburl"
                        value={webUrl}
                        onChange={(e) => setWebUrl(e.target.value)}
                        placeholder="e.g. http://checkip.dyndns.org"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ddns-skip">Skip Words (optional)</Label>
                      <Input
                        id="ddns-skip"
                        value={webSkip}
                        onChange={(e) => setWebSkip(e.target.value)}
                        placeholder="words to skip in response"
                      />
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="options">
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="ddns-desc">Description</Label>
                  <Input
                    id="ddns-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="optional description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ddns-ttl">TTL (seconds)</Label>
                    <Input
                      id="ddns-ttl"
                      type="number"
                      value={ttl}
                      onChange={(e) => setTtl(e.target.value)}
                      placeholder="e.g. 300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ddns-expiry">Expiry Time (days)</Label>
                    <Input
                      id="ddns-expiry"
                      type="number"
                      value={expiryTime}
                      onChange={(e) => setExpiryTime(e.target.value)}
                      placeholder="e.g. 30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ddns-wait">Wait Time (seconds)</Label>
                    <Input
                      id="ddns-wait"
                      type="number"
                      value={waitTime}
                      onChange={(e) => setWaitTime(e.target.value)}
                      placeholder="e.g. 30"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ddns-key">Key File Path (optional)</Label>
                  <Input
                    id="ddns-key"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="/config/auth/ddns.key"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ddns-zone">DNS Zone (optional)</Label>
                  <Input
                    id="ddns-zone"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    placeholder="e.g. example.com"
                    className="font-mono"
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Saving..." : "Adding..."}</> : isEdit ? "Save Changes" : "Add Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
