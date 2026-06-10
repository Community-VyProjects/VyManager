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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import type { WebProxyAuthentication, WebProxyCapabilities } from "@/lib/api/webproxy";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auth: WebProxyAuthentication | null;
  caps: WebProxyCapabilities | null;
  onSubmit: (auth: WebProxyAuthentication) => Promise<void>;
}

const numOrNull = (s: string): number | null => {
  if (s.trim() === "") return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
};

export function WebProxyAuthModal({ open, onOpenChange, auth, caps, onSubmit }: Props) {
  const [method, setMethod] = useState<string>("");
  const [realm, setRealm] = useState("");
  const [children, setChildren] = useState("");
  const [credentialsTtl, setCredentialsTtl] = useState("");
  const [server, setServer] = useState("");
  const [port, setPort] = useState("");
  const [version, setVersion] = useState<string>("");
  const [baseDn, setBaseDn] = useState("");
  const [bindDn, setBindDn] = useState("");
  const [password, setPassword] = useState("");
  const [filterExpression, setFilterExpression] = useState("");
  const [usernameAttribute, setUsernameAttribute] = useState("");
  const [persistentConnection, setPersistentConnection] = useState(false);
  const [useSsl, setUseSsl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && auth) {
      setMethod(auth.method ?? "");
      setRealm(auth.realm ?? "");
      setChildren(auth.children != null ? String(auth.children) : "");
      setCredentialsTtl(auth.credentials_ttl != null ? String(auth.credentials_ttl) : "");
      setServer(auth.ldap.server ?? "");
      setPort(auth.ldap.port != null ? String(auth.ldap.port) : "");
      setVersion(auth.ldap.version ?? "");
      setBaseDn(auth.ldap.base_dn ?? "");
      setBindDn(auth.ldap.bind_dn ?? "");
      setPassword(auth.ldap.password ?? "");
      setFilterExpression(auth.ldap.filter_expression ?? "");
      setUsernameAttribute(auth.ldap.username_attribute ?? "");
      setPersistentConnection(auth.ldap.persistent_connection);
      setUseSsl(auth.ldap.use_ssl);
      setError(null);
    }
  }, [open, auth]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        method: method || null,
        realm: realm.trim() || null,
        children: numOrNull(children),
        credentials_ttl: numOrNull(credentialsTtl),
        ldap: {
          server: server.trim() || null,
          port: numOrNull(port),
          version: version || null,
          base_dn: baseDn.trim() || null,
          bind_dn: bindDn.trim() || null,
          password: password || null,
          filter_expression: filterExpression.trim() || null,
          username_attribute: usernameAttribute.trim() || null,
          persistent_connection: persistentConnection,
          use_ssl: useSsl,
        },
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Proxy Authentication</DialogTitle>
          <DialogDescription>Require users to authenticate against an LDAP directory before using the proxy.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 pb-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    {(caps?.options.auth_method ?? ["ldap"]).map((m) => (
                      <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wp-realm">Realm</Label>
                <Input id="wp-realm" value={realm} onChange={(e) => setRealm(e.target.value)} placeholder="My Company proxy server" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wp-children">Helper Processes</Label>
                <Input id="wp-children" type="number" value={children} onChange={(e) => setChildren(e.target.value)} placeholder="5" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wp-ttl">Credentials TTL (min)</Label>
                <Input id="wp-ttl" type="number" value={credentialsTtl} onChange={(e) => setCredentialsTtl(e.target.value)} placeholder="60" className="font-mono" />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-3">LDAP Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wp-ldap-server">Server</Label>
                  <Input id="wp-ldap-server" value={server} onChange={(e) => setServer(e.target.value)} placeholder="ldap.example.com" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wp-ldap-port">Port</Label>
                  <Input id="wp-ldap-port" type="number" value={port} onChange={(e) => setPort(e.target.value)} placeholder="389" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Protocol Version</Label>
                  <Select value={version} onValueChange={setVersion}>
                    <SelectTrigger><SelectValue placeholder="3" /></SelectTrigger>
                    <SelectContent>
                      {(caps?.options.ldap_version ?? ["2", "3"]).map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wp-ldap-userattr">Username Attribute</Label>
                  <Input id="wp-ldap-userattr" value={usernameAttribute} onChange={(e) => setUsernameAttribute(e.target.value)} placeholder="cn" className="font-mono" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="wp-ldap-basedn">Base DN</Label>
                  <Input id="wp-ldap-basedn" value={baseDn} onChange={(e) => setBaseDn(e.target.value)} placeholder="dc=example,dc=com" className="font-mono" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="wp-ldap-binddn">Bind DN</Label>
                  <Input id="wp-ldap-binddn" value={bindDn} onChange={(e) => setBindDn(e.target.value)} placeholder="cn=admin,dc=example,dc=com" className="font-mono" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="wp-ldap-pass">Bind Password</Label>
                  <Input id="wp-ldap-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="wp-ldap-filter">Filter Expression</Label>
                  <Input id="wp-ldap-filter" value={filterExpression} onChange={(e) => setFilterExpression(e.target.value)} placeholder="(uid=%s)" className="font-mono" />
                </div>
              </div>
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="wp-ldap-ssl" checked={useSsl} onCheckedChange={(c) => setUseSsl(c === true)} />
                  <Label htmlFor="wp-ldap-ssl" className="cursor-pointer">Use SSL/TLS</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="wp-ldap-persist" checked={persistentConnection} onCheckedChange={(c) => setPersistentConnection(c === true)} />
                  <Label htmlFor="wp-ldap-persist" className="cursor-pointer">Persistent connection</Label>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Authentication"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
