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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import type { AuthoritativeDomain, AuthDomainRecords, MXServer } from "@/lib/api/dns-forwarding";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authDomain: AuthoritativeDomain | null;
  onSubmit: (domain: string, disabled: boolean, records: AuthDomainRecords) => Promise<void>;
}

function emptyRecords(): AuthDomainRecords {
  return { a: [], aaaa: [], cname: [], mx: [], txt: [], ns: [], ptr: [] };
}

export function DNSForwardingAuthDomainModal({ open, onOpenChange, authDomain, onSubmit }: Props) {
  const isEdit = !!authDomain;

  const [domain, setDomain] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [records, setRecords] = useState<AuthDomainRecords>(emptyRecords());

  // Add-record form state per type
  const [newA, setNewA] = useState({ hostname: "", address: "", ttl: "", disabled: false });
  const [newAAAA, setNewAAAA] = useState({ hostname: "", address: "", ttl: "", disabled: false });
  const [newCNAME, setNewCNAME] = useState({ hostname: "", target: "", ttl: "", disabled: false });
  const [newMX, setNewMX] = useState({ hostname: "", server: "", priority: "", ttl: "", disabled: false });
  const [newTXT, setNewTXT] = useState({ hostname: "", value: "", ttl: "", disabled: false });
  const [newNS, setNewNS] = useState({ hostname: "", target: "", ttl: "", disabled: false });
  const [newPTR, setNewPTR] = useState({ hostname: "", target: "", ttl: "", disabled: false });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (authDomain) {
        setDomain(authDomain.domain);
        setDisabled(authDomain.disabled);
        setRecords({
          a: authDomain.records.a.map((r) => ({ ...r })),
          aaaa: authDomain.records.aaaa.map((r) => ({ ...r })),
          cname: authDomain.records.cname.map((r) => ({ ...r })),
          mx: authDomain.records.mx.map((r) => ({ ...r, servers: r.servers.map((s) => ({ ...s })) })),
          txt: authDomain.records.txt.map((r) => ({ ...r })),
          ns: authDomain.records.ns.map((r) => ({ ...r })),
          ptr: authDomain.records.ptr.map((r) => ({ ...r })),
        });
      } else {
        setDomain("");
        setDisabled(false);
        setRecords(emptyRecords());
      }
      setError(null);
    }
  }, [open, authDomain]);

  const handleSubmit = async () => {
    if (!isEdit && !domain.trim()) {
      setError("Zone name is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(isEdit ? authDomain!.domain : domain.trim(), disabled, records);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const addA = () => {
    if (!newA.hostname) return;
    setRecords((r) => ({ ...r, a: [...r.a, { hostname: newA.hostname, address: newA.address || null, ttl: newA.ttl ? parseInt(newA.ttl) : null, disabled: newA.disabled }] }));
    setNewA({ hostname: "", address: "", ttl: "", disabled: false });
  };
  const addAAAA = () => {
    if (!newAAAA.hostname) return;
    setRecords((r) => ({ ...r, aaaa: [...r.aaaa, { hostname: newAAAA.hostname, address: newAAAA.address || null, ttl: newAAAA.ttl ? parseInt(newAAAA.ttl) : null, disabled: newAAAA.disabled }] }));
    setNewAAAA({ hostname: "", address: "", ttl: "", disabled: false });
  };
  const addCNAME = () => {
    if (!newCNAME.hostname) return;
    setRecords((r) => ({ ...r, cname: [...r.cname, { hostname: newCNAME.hostname, target: newCNAME.target || null, ttl: newCNAME.ttl ? parseInt(newCNAME.ttl) : null, disabled: newCNAME.disabled }] }));
    setNewCNAME({ hostname: "", target: "", ttl: "", disabled: false });
  };
  const addMX = () => {
    if (!newMX.hostname || !newMX.server) return;
    const srv: MXServer = { server: newMX.server, priority: newMX.priority ? parseInt(newMX.priority) : null };
    setRecords((r) => ({ ...r, mx: [...r.mx, { hostname: newMX.hostname, servers: [srv], ttl: newMX.ttl ? parseInt(newMX.ttl) : null, disabled: newMX.disabled }] }));
    setNewMX({ hostname: "", server: "", priority: "", ttl: "", disabled: false });
  };
  const addTXT = () => {
    if (!newTXT.hostname) return;
    setRecords((r) => ({ ...r, txt: [...r.txt, { hostname: newTXT.hostname, value: newTXT.value || null, ttl: newTXT.ttl ? parseInt(newTXT.ttl) : null, disabled: newTXT.disabled }] }));
    setNewTXT({ hostname: "", value: "", ttl: "", disabled: false });
  };
  const addNS = () => {
    if (!newNS.hostname) return;
    setRecords((r) => ({ ...r, ns: [...r.ns, { hostname: newNS.hostname, target: newNS.target || null, ttl: newNS.ttl ? parseInt(newNS.ttl) : null, disabled: newNS.disabled }] }));
    setNewNS({ hostname: "", target: "", ttl: "", disabled: false });
  };
  const addPTR = () => {
    if (!newPTR.hostname) return;
    setRecords((r) => ({ ...r, ptr: [...r.ptr, { hostname: newPTR.hostname, target: newPTR.target || null, ttl: newPTR.ttl ? parseInt(newPTR.ttl) : null, disabled: newPTR.disabled }] }));
    setNewPTR({ hostname: "", target: "", ttl: "", disabled: false });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Authoritative Zone" : "Add Authoritative Zone"}</DialogTitle>
          <DialogDescription>Manage a local DNS zone with resource records.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="ad-domain">Zone Name</Label>
              <Input
                id="ad-domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. internal.example.com"
                disabled={isEdit}
                className={isEdit ? "bg-muted font-mono" : "font-mono"}
              />
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              <Checkbox
                id="ad-disabled"
                checked={disabled}
                onCheckedChange={(c) => setDisabled(c === true)}
              />
              <Label htmlFor="ad-disabled" className="cursor-pointer">Disable Zone</Label>
            </div>
          </div>

          <Tabs defaultValue="a">
            <TabsList className="w-full">
              <TabsTrigger value="a" className="flex-1">A</TabsTrigger>
              <TabsTrigger value="aaaa" className="flex-1">AAAA</TabsTrigger>
              <TabsTrigger value="cname" className="flex-1">CNAME</TabsTrigger>
              <TabsTrigger value="mx" className="flex-1">MX</TabsTrigger>
              <TabsTrigger value="txt" className="flex-1">TXT</TabsTrigger>
              <TabsTrigger value="ns" className="flex-1">NS</TabsTrigger>
              <TabsTrigger value="ptr" className="flex-1">PTR</TabsTrigger>
            </TabsList>

            {/* A Records */}
            <TabsContent value="a">
              <ScrollArea className="h-52">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hostname</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>TTL</TableHead>
                      <TableHead>Disabled</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.a.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{r.hostname}</TableCell>
                        <TableCell className="font-mono">{r.address ?? "—"}</TableCell>
                        <TableCell>{r.ttl ?? "—"}</TableCell>
                        <TableCell>{r.disabled ? <Badge variant="secondary">Yes</Badge> : "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setRecords((rec) => ({ ...rec, a: rec.a.filter((_, j) => j !== i) }))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell><Input value={newA.hostname} onChange={(e) => setNewA({ ...newA, hostname: e.target.value })} placeholder="hostname" className="h-7 font-mono" /></TableCell>
                      <TableCell><Input value={newA.address} onChange={(e) => setNewA({ ...newA, address: e.target.value })} placeholder="IPv4" className="h-7 font-mono" /></TableCell>
                      <TableCell><Input value={newA.ttl} onChange={(e) => setNewA({ ...newA, ttl: e.target.value })} placeholder="TTL" type="number" className="h-7 w-20" /></TableCell>
                      <TableCell><Checkbox checked={newA.disabled} onCheckedChange={(c) => setNewA({ ...newA, disabled: c === true })} /></TableCell>
                      <TableCell><Button variant="outline" size="icon" className="h-7 w-7" onClick={addA} disabled={!newA.hostname}><Plus className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* AAAA Records */}
            <TabsContent value="aaaa">
              <ScrollArea className="h-52">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hostname</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>TTL</TableHead>
                      <TableHead>Disabled</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.aaaa.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{r.hostname}</TableCell>
                        <TableCell className="font-mono">{r.address ?? "—"}</TableCell>
                        <TableCell>{r.ttl ?? "—"}</TableCell>
                        <TableCell>{r.disabled ? <Badge variant="secondary">Yes</Badge> : "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setRecords((rec) => ({ ...rec, aaaa: rec.aaaa.filter((_, j) => j !== i) }))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell><Input value={newAAAA.hostname} onChange={(e) => setNewAAAA({ ...newAAAA, hostname: e.target.value })} placeholder="hostname" className="h-7 font-mono" /></TableCell>
                      <TableCell><Input value={newAAAA.address} onChange={(e) => setNewAAAA({ ...newAAAA, address: e.target.value })} placeholder="IPv6" className="h-7 font-mono" /></TableCell>
                      <TableCell><Input value={newAAAA.ttl} onChange={(e) => setNewAAAA({ ...newAAAA, ttl: e.target.value })} placeholder="TTL" type="number" className="h-7 w-20" /></TableCell>
                      <TableCell><Checkbox checked={newAAAA.disabled} onCheckedChange={(c) => setNewAAAA({ ...newAAAA, disabled: c === true })} /></TableCell>
                      <TableCell><Button variant="outline" size="icon" className="h-7 w-7" onClick={addAAAA} disabled={!newAAAA.hostname}><Plus className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* CNAME Records */}
            <TabsContent value="cname">
              <ScrollArea className="h-52">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hostname</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>TTL</TableHead>
                      <TableHead>Disabled</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.cname.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{r.hostname}</TableCell>
                        <TableCell className="font-mono">{r.target ?? "—"}</TableCell>
                        <TableCell>{r.ttl ?? "—"}</TableCell>
                        <TableCell>{r.disabled ? <Badge variant="secondary">Yes</Badge> : "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setRecords((rec) => ({ ...rec, cname: rec.cname.filter((_, j) => j !== i) }))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell><Input value={newCNAME.hostname} onChange={(e) => setNewCNAME({ ...newCNAME, hostname: e.target.value })} placeholder="hostname" className="h-7 font-mono" /></TableCell>
                      <TableCell><Input value={newCNAME.target} onChange={(e) => setNewCNAME({ ...newCNAME, target: e.target.value })} placeholder="target FQDN" className="h-7 font-mono" /></TableCell>
                      <TableCell><Input value={newCNAME.ttl} onChange={(e) => setNewCNAME({ ...newCNAME, ttl: e.target.value })} placeholder="TTL" type="number" className="h-7 w-20" /></TableCell>
                      <TableCell><Checkbox checked={newCNAME.disabled} onCheckedChange={(c) => setNewCNAME({ ...newCNAME, disabled: c === true })} /></TableCell>
                      <TableCell><Button variant="outline" size="icon" className="h-7 w-7" onClick={addCNAME} disabled={!newCNAME.hostname}><Plus className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* MX Records */}
            <TabsContent value="mx">
              <ScrollArea className="h-52">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hostname</TableHead>
                      <TableHead>Server</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>TTL</TableHead>
                      <TableHead>Disabled</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.mx.map((r, i) =>
                      r.servers.map((srv, j) => (
                        <TableRow key={`${i}-${j}`}>
                          <TableCell className="font-mono">{r.hostname}</TableCell>
                          <TableCell className="font-mono">{srv.server}</TableCell>
                          <TableCell>{srv.priority ?? "—"}</TableCell>
                          <TableCell>{r.ttl ?? "—"}</TableCell>
                          <TableCell>{r.disabled ? <Badge variant="secondary">Yes</Badge> : "—"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setRecords((rec) => ({ ...rec, mx: rec.mx.filter((_, k) => k !== i) }))}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    <TableRow>
                      <TableCell><Input value={newMX.hostname} onChange={(e) => setNewMX({ ...newMX, hostname: e.target.value })} placeholder="hostname" className="h-7 font-mono" /></TableCell>
                      <TableCell><Input value={newMX.server} onChange={(e) => setNewMX({ ...newMX, server: e.target.value })} placeholder="mail.example.com" className="h-7 font-mono" /></TableCell>
                      <TableCell><Input value={newMX.priority} onChange={(e) => setNewMX({ ...newMX, priority: e.target.value })} placeholder="10" type="number" className="h-7 w-16" /></TableCell>
                      <TableCell><Input value={newMX.ttl} onChange={(e) => setNewMX({ ...newMX, ttl: e.target.value })} placeholder="TTL" type="number" className="h-7 w-20" /></TableCell>
                      <TableCell><Checkbox checked={newMX.disabled} onCheckedChange={(c) => setNewMX({ ...newMX, disabled: c === true })} /></TableCell>
                      <TableCell><Button variant="outline" size="icon" className="h-7 w-7" onClick={addMX} disabled={!newMX.hostname || !newMX.server}><Plus className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* TXT Records */}
            <TabsContent value="txt">
              <ScrollArea className="h-52">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hostname</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>TTL</TableHead>
                      <TableHead>Disabled</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.txt.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{r.hostname}</TableCell>
                        <TableCell className="font-mono text-xs max-w-xs truncate">{r.value ?? "—"}</TableCell>
                        <TableCell>{r.ttl ?? "—"}</TableCell>
                        <TableCell>{r.disabled ? <Badge variant="secondary">Yes</Badge> : "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setRecords((rec) => ({ ...rec, txt: rec.txt.filter((_, j) => j !== i) }))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell><Input value={newTXT.hostname} onChange={(e) => setNewTXT({ ...newTXT, hostname: e.target.value })} placeholder="hostname" className="h-7 font-mono" /></TableCell>
                      <TableCell><Input value={newTXT.value} onChange={(e) => setNewTXT({ ...newTXT, value: e.target.value })} placeholder="text value" className="h-7 font-mono" /></TableCell>
                      <TableCell><Input value={newTXT.ttl} onChange={(e) => setNewTXT({ ...newTXT, ttl: e.target.value })} placeholder="TTL" type="number" className="h-7 w-20" /></TableCell>
                      <TableCell><Checkbox checked={newTXT.disabled} onCheckedChange={(c) => setNewTXT({ ...newTXT, disabled: c === true })} /></TableCell>
                      <TableCell><Button variant="outline" size="icon" className="h-7 w-7" onClick={addTXT} disabled={!newTXT.hostname}><Plus className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* NS Records */}
            <TabsContent value="ns">
              <ScrollArea className="h-52">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hostname</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>TTL</TableHead>
                      <TableHead>Disabled</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.ns.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{r.hostname}</TableCell>
                        <TableCell className="font-mono">{r.target ?? "—"}</TableCell>
                        <TableCell>{r.ttl ?? "—"}</TableCell>
                        <TableCell>{r.disabled ? <Badge variant="secondary">Yes</Badge> : "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setRecords((rec) => ({ ...rec, ns: rec.ns.filter((_, j) => j !== i) }))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell><Input value={newNS.hostname} onChange={(e) => setNewNS({ ...newNS, hostname: e.target.value })} placeholder="hostname" className="h-7 font-mono" /></TableCell>
                      <TableCell><Input value={newNS.target} onChange={(e) => setNewNS({ ...newNS, target: e.target.value })} placeholder="ns.example.com" className="h-7 font-mono" /></TableCell>
                      <TableCell><Input value={newNS.ttl} onChange={(e) => setNewNS({ ...newNS, ttl: e.target.value })} placeholder="TTL" type="number" className="h-7 w-20" /></TableCell>
                      <TableCell><Checkbox checked={newNS.disabled} onCheckedChange={(c) => setNewNS({ ...newNS, disabled: c === true })} /></TableCell>
                      <TableCell><Button variant="outline" size="icon" className="h-7 w-7" onClick={addNS} disabled={!newNS.hostname}><Plus className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* PTR Records */}
            <TabsContent value="ptr">
              <ScrollArea className="h-52">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hostname</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>TTL</TableHead>
                      <TableHead>Disabled</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.ptr.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{r.hostname}</TableCell>
                        <TableCell className="font-mono">{r.target ?? "—"}</TableCell>
                        <TableCell>{r.ttl ?? "—"}</TableCell>
                        <TableCell>{r.disabled ? <Badge variant="secondary">Yes</Badge> : "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setRecords((rec) => ({ ...rec, ptr: rec.ptr.filter((_, j) => j !== i) }))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell><Input value={newPTR.hostname} onChange={(e) => setNewPTR({ ...newPTR, hostname: e.target.value })} placeholder="hostname" className="h-7 font-mono" /></TableCell>
                      <TableCell><Input value={newPTR.target} onChange={(e) => setNewPTR({ ...newPTR, target: e.target.value })} placeholder="target FQDN" className="h-7 font-mono" /></TableCell>
                      <TableCell><Input value={newPTR.ttl} onChange={(e) => setNewPTR({ ...newPTR, ttl: e.target.value })} placeholder="TTL" type="number" className="h-7 w-20" /></TableCell>
                      <TableCell><Checkbox checked={newPTR.disabled} onCheckedChange={(c) => setNewPTR({ ...newPTR, disabled: c === true })} /></TableCell>
                      <TableCell><Button variant="outline" size="icon" className="h-7 w-7" onClick={addPTR} disabled={!newPTR.hostname}><Plus className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Saving..." : "Adding..."}</> : isEdit ? "Save Changes" : "Add Zone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
