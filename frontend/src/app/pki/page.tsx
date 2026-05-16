"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  FileText,
  Key,
  Terminal,
  Lock,
  Settings,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  pkiService,
  type PKIConfigResponse,
  type PKICapabilities,
  type PKICA,
  type PKICertificate,
  type PKIDH,
  type PKIKeyPair,
  type PKIOpenSSH,
  type PKIOpenVPNSharedSecret,
} from "@/lib/api/pki";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import {
  CAModal,
  CertificateModal,
  DHModal,
  KeyPairModal,
  OpenSSHModal,
  OpenVPNSecretModal,
  X509DefaultsModal,
  DeletePKIItemModal,
  PKIDetailSheet,
  type PKIViewingItem,
} from "@/components/pki";

export default function PKIPage() {
  const searchParams = useSearchParams();
  const { canRead, canWrite } = usePermissions();
  const hasRead = canRead(FeatureGroup.PKI);
  const hasWrite = canWrite(FeatureGroup.PKI);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<PKIConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<PKICapabilities | null>(null);
  const [activeTab, setActiveTab] = useState("certificates");

  // Modal state - CA
  const [showCAModal, setShowCAModal] = useState(false);
  const [editingCA, setEditingCA] = useState<PKICA | null>(null);

  // Modal state - Certificate
  const [showCertModal, setShowCertModal] = useState(false);
  const [editingCert, setEditingCert] = useState<PKICertificate | null>(null);

  // Modal state - DH
  const [showDHModal, setShowDHModal] = useState(false);
  const [editingDH, setEditingDH] = useState<PKIDH | null>(null);

  // Modal state - Key Pair
  const [showKeyPairModal, setShowKeyPairModal] = useState(false);
  const [editingKeyPair, setEditingKeyPair] = useState<PKIKeyPair | null>(null);

  // Modal state - OpenSSH
  const [showOpenSSHModal, setShowOpenSSHModal] = useState(false);
  const [editingOpenSSH, setEditingOpenSSH] = useState<PKIOpenSSH | null>(null);

  // Modal state - OpenVPN
  const [showOpenVPNModal, setShowOpenVPNModal] = useState(false);
  const [editingOpenVPN, setEditingOpenVPN] = useState<PKIOpenVPNSharedSecret | null>(null);

  // Modal state - X509
  const [showX509Modal, setShowX509Modal] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<{
    type: string;
    name: string;
    onDelete: () => Promise<import("@/lib/api/pki").VyOSResponse>;
  } | null>(null);

  // Detail sheet
  const [viewingItem, setViewingItem] = useState<PKIViewingItem | null>(null);

  const fetchConfig = async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData] = await Promise.all([
        pkiService.getConfig(refresh),
        pkiService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PKI configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRead) fetchConfig();
  }, [hasRead]);

  useEffect(() => {
    setActiveTab(searchParams.get("tab") ?? "certificates");
  }, [searchParams]);

  const onSuccess = () => fetchConfig(true);

  // Loading state
  if (loading && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading PKI configuration...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-destructive font-medium">Failed to load configuration</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => fetchConfig(true)}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const totals = config?.totals;

  return (
    <AppLayout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">PKI Management</h1>
                  {config?.configured ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">Configured</Badge>
                  ) : (
                    <Badge variant="secondary">Not Configured</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  Manage certificates, keys, and PKI infrastructure
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchConfig(true)} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-6 gap-3 mt-4">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">CAs</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totals?.ca ?? 0}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Certificates</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totals?.certificates ?? 0}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">DH Params</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totals?.dh ?? 0}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Key Pairs</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totals?.key_pairs ?? 0}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">OpenSSH</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totals?.openssh ?? 0}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">OpenVPN</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totals?.openvpn_shared_secrets ?? 0}</p>
            </Card>
          </div>
        </div>

        {/* Tabs Content */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="certificates">Certificates</TabsTrigger>
              <TabsTrigger value="ca">Certificate Authorities</TabsTrigger>
              <TabsTrigger value="keypairs">Key Pairs</TabsTrigger>
              <TabsTrigger value="dh">DH Parameters</TabsTrigger>
              <TabsTrigger value="openssh">OpenSSH</TabsTrigger>
              <TabsTrigger value="openvpn">OpenVPN</TabsTrigger>
              <TabsTrigger value="x509">X509 Defaults</TabsTrigger>
            </TabsList>

            {/* Certificates Tab */}
            <TabsContent value="certificates" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Certificates</h2>
                {hasWrite && (
                  <Button size="sm" onClick={() => { setEditingCert(null); setShowCertModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Certificate
                  </Button>
                )}
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Certificate</TableHead>
                      <TableHead>Private Key</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(config?.certificates || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No certificates configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      config?.certificates.map((cert) => (
                        <TableRow key={cert.name}>
                          <TableCell className="font-medium">{cert.name}</TableCell>
                          <TableCell>
                            {cert.acme ? (
                              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">ACME</Badge>
                            ) : (
                              <Badge variant="secondary">Manual</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {cert.certificate ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">Present</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not set</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {cert.private_key ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">Present</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not set</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{cert.description || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {cert.revoke && <Badge variant="destructive">Revoked</Badge>}
                              {cert.password_protected && <Badge variant="outline">Protected</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setViewingItem({ type: "certificate", item: cert })} title="View details">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {hasWrite && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => { setEditingCert(cert); setShowCertModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({
                                    type: "Certificate",
                                    name: cert.name,
                                    onDelete: () => pkiService.deleteCertificate(cert.name),
                                  })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* Certificate Authorities Tab */}
            <TabsContent value="ca" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Certificate Authorities</h2>
                {hasWrite && (
                  <Button size="sm" onClick={() => { setEditingCA(null); setShowCAModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add CA
                  </Button>
                )}
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Certificate</TableHead>
                      <TableHead>Private Key</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(config?.ca || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No certificate authorities configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      config?.ca.map((ca) => (
                        <TableRow key={ca.name}>
                          <TableCell className="font-medium">{ca.name}</TableCell>
                          <TableCell>
                            {ca.certificate ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">Present</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not set</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {ca.private_key ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">Present</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not set</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{ca.description || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {ca.revoke && <Badge variant="destructive">Revoked</Badge>}
                              {ca.system_install && <Badge variant="outline">System Install</Badge>}
                              {ca.password_protected && <Badge variant="outline">Protected</Badge>}
                              {ca.crl?.length > 0 && <Badge variant="outline">CRL ({ca.crl.length})</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setViewingItem({ type: "ca", item: ca })} title="View details">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {hasWrite && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => { setEditingCA(ca); setShowCAModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({
                                    type: "CA",
                                    name: ca.name,
                                    onDelete: () => pkiService.deleteCA(ca.name),
                                  })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* Key Pairs Tab */}
            <TabsContent value="keypairs" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Key Pairs</h2>
                {hasWrite && (
                  <Button size="sm" onClick={() => { setEditingKeyPair(null); setShowKeyPairModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Key Pair
                  </Button>
                )}
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Private Key</TableHead>
                      <TableHead>Public Key</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(config?.key_pairs || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No key pairs configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      config?.key_pairs.map((kp) => (
                        <TableRow key={kp.name}>
                          <TableCell className="font-medium">{kp.name}</TableCell>
                          <TableCell>
                            {kp.private_key ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">Present</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not set</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {kp.public_key ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">Present</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not set</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {kp.password_protected && <Badge variant="outline">Protected</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setViewingItem({ type: "key_pair", item: kp })} title="View details">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {hasWrite && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => { setEditingKeyPair(kp); setShowKeyPairModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({
                                    type: "Key Pair",
                                    name: kp.name,
                                    onDelete: () => pkiService.deleteKeyPair(kp.name),
                                  })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* DH Parameters Tab */}
            <TabsContent value="dh" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">DH Parameters</h2>
                {hasWrite && (
                  <Button size="sm" onClick={() => { setEditingDH(null); setShowDHModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add DH Parameters
                  </Button>
                )}
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Parameters</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(config?.dh || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No DH parameters configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      config?.dh.map((dh) => (
                        <TableRow key={dh.name}>
                          <TableCell className="font-medium">{dh.name}</TableCell>
                          <TableCell>
                            {dh.parameters ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">Present</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not set</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setViewingItem({ type: "dh", item: dh })} title="View details">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {hasWrite && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => { setEditingDH(dh); setShowDHModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({
                                    type: "DH Parameters",
                                    name: dh.name,
                                    onDelete: () => pkiService.deleteDH(dh.name),
                                  })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* OpenSSH Tab */}
            <TabsContent value="openssh" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">OpenSSH Keys</h2>
                {hasWrite && (
                  <Button size="sm" onClick={() => { setEditingOpenSSH(null); setShowOpenSSHModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add OpenSSH Key
                  </Button>
                )}
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Private Key</TableHead>
                      <TableHead>Public Key</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(config?.openssh || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No OpenSSH keys configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      config?.openssh.map((ssh) => (
                        <TableRow key={ssh.name}>
                          <TableCell className="font-medium">{ssh.name}</TableCell>
                          <TableCell>
                            {ssh.private_key ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">Present</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not set</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {ssh.public_key ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">Present</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not set</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{ssh.public_type || "—"}</TableCell>
                          <TableCell>
                            {ssh.password_protected && <Badge variant="outline">Protected</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setViewingItem({ type: "openssh", item: ssh })} title="View details">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {hasWrite && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => { setEditingOpenSSH(ssh); setShowOpenSSHModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({
                                    type: "OpenSSH Key",
                                    name: ssh.name,
                                    onDelete: () => pkiService.deleteOpenSSH(ssh.name),
                                  })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* OpenVPN Tab */}
            <TabsContent value="openvpn" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">OpenVPN Shared Secrets</h2>
                {hasWrite && (
                  <Button size="sm" onClick={() => { setEditingOpenVPN(null); setShowOpenVPNModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Shared Secret
                  </Button>
                )}
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(config?.openvpn_shared_secrets || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No OpenVPN shared secrets configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      config?.openvpn_shared_secrets.map((secret) => (
                        <TableRow key={secret.name}>
                          <TableCell className="font-medium">{secret.name}</TableCell>
                          <TableCell>
                            {secret.key ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">Present</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not set</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{secret.version || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setViewingItem({ type: "openvpn", item: secret })} title="View details">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {hasWrite && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => { setEditingOpenVPN(secret); setShowOpenVPNModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({
                                    type: "Shared Secret",
                                    name: secret.name,
                                    onDelete: () => pkiService.deleteOpenVPNSecret(secret.name),
                                  })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* X509 Defaults Tab */}
            <TabsContent value="x509" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">X509 Defaults</h2>
                {hasWrite && (
                  <Button size="sm" variant="outline" onClick={() => setShowX509Modal(true)}>
                    <Pencil className="h-4 w-4 mr-2" /> Edit Defaults
                  </Button>
                )}
              </div>
              <Card className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Country</p>
                    <p className="mt-1">{config?.x509_defaults?.country || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">State</p>
                    <p className="mt-1">{config?.x509_defaults?.state || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Locality</p>
                    <p className="mt-1">{config?.x509_defaults?.locality || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Organization</p>
                    <p className="mt-1">{config?.x509_defaults?.organization || "—"}</p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Detail Sheet */}
      <PKIDetailSheet viewing={viewingItem} onClose={() => setViewingItem(null)} />

      {/* Modals */}
      <CAModal
        open={showCAModal}
        onOpenChange={(v) => { setShowCAModal(v); if (!v) setEditingCA(null); }}
        onSuccess={onSuccess}
        existingCA={editingCA}
        x509Defaults={config?.x509_defaults || {}}
      />

      <CertificateModal
        open={showCertModal}
        onOpenChange={(v) => { setShowCertModal(v); if (!v) setEditingCert(null); }}
        onSuccess={onSuccess}
        existingCert={editingCert}
        capabilities={capabilities}
        availableCAs={config?.ca || []}
        x509Defaults={config?.x509_defaults || {}}
      />

      <DHModal
        open={showDHModal}
        onOpenChange={(v) => { setShowDHModal(v); if (!v) setEditingDH(null); }}
        onSuccess={onSuccess}
        existingDH={editingDH}
      />

      <KeyPairModal
        open={showKeyPairModal}
        onOpenChange={(v) => { setShowKeyPairModal(v); if (!v) setEditingKeyPair(null); }}
        onSuccess={onSuccess}
        existingKeyPair={editingKeyPair}
      />

      <OpenSSHModal
        open={showOpenSSHModal}
        onOpenChange={(v) => { setShowOpenSSHModal(v); if (!v) setEditingOpenSSH(null); }}
        onSuccess={onSuccess}
        existingKey={editingOpenSSH}
      />

      <OpenVPNSecretModal
        open={showOpenVPNModal}
        onOpenChange={(v) => { setShowOpenVPNModal(v); if (!v) setEditingOpenVPN(null); }}
        onSuccess={onSuccess}
        existingSecret={editingOpenVPN}
      />

      <X509DefaultsModal
        open={showX509Modal}
        onOpenChange={setShowX509Modal}
        onSuccess={onSuccess}
        current={config?.x509_defaults || {}}
      />

      {deleteTarget && (
        <DeletePKIItemModal
          open={!!deleteTarget}
          onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
          onSuccess={onSuccess}
          itemType={deleteTarget.type}
          itemName={deleteTarget.name}
          onDelete={deleteTarget.onDelete}
        />
      )}
    </AppLayout>
  );
}
