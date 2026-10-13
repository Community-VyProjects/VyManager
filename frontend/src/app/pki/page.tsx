"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { ShieldCheck, Plus, RefreshCw, Loader2, AlertCircle, Pencil, Trash2, FileText, Key, Terminal, Lock, Eye } from "lucide-react";
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

function PKIPageInner() {
  const t = useTranslations("pki");
  const tc = useTranslations("common");
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
      setError(err instanceof Error ? err.message : t("page.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRead) fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load when read access is known; a language switch re-renders via router.refresh()
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
            <p className="text-muted-foreground">{t("page.loading")}</p>
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
            <p className="text-destructive font-medium">{t("page.failedToLoadConfig")}</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => fetchConfig(true)}>
              <RefreshCw className="h-4 w-4 mr-2" /> {tc("retry")}
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
                  <h1 className="text-2xl font-bold">{t("page.title")}</h1>
                  {config?.configured ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("page.configured")}</Badge>
                  ) : (
                    <Badge variant="secondary">{t("page.notConfigured")}</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {t("page.subtitle")}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchConfig(true)} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              {tc("refresh")}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-6 gap-3 mt-4">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("page.statCAs")}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totals?.ca ?? 0}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("page.certificates")}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totals?.certificates ?? 0}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("page.statDHParams")}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totals?.dh ?? 0}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("page.keyPairs")}</span>
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
              <TabsTrigger value="certificates">{t("page.certificates")}</TabsTrigger>
              <TabsTrigger value="ca">{t("page.certificateAuthorities")}</TabsTrigger>
              <TabsTrigger value="keypairs">{t("page.keyPairs")}</TabsTrigger>
              <TabsTrigger value="dh">{t("shared.dhParameters")}</TabsTrigger>
              <TabsTrigger value="openssh">OpenSSH</TabsTrigger>
              <TabsTrigger value="openvpn">OpenVPN</TabsTrigger>
              <TabsTrigger value="x509">{t("page.x509Defaults")}</TabsTrigger>
            </TabsList>

            {/* Certificates Tab */}
            <TabsContent value="certificates" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">{t("page.certificates")}</h2>
                {hasWrite && (
                  <Button size="sm" onClick={() => { setEditingCert(null); setShowCertModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> {t("page.addCertificate")}
                  </Button>
                )}
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc("name")}</TableHead>
                      <TableHead>{t("page.colType")}</TableHead>
                      <TableHead>{t("shared.certificate")}</TableHead>
                      <TableHead>{t("shared.privateKey")}</TableHead>
                      <TableHead>{tc("description")}</TableHead>
                      <TableHead>{tc("status")}</TableHead>
                      <TableHead className="w-[120px]">{tc("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(config?.certificates || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {t("page.noCertificates")}
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
                              <Badge variant="secondary">{t("shared.manual")}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {cert.certificate ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("shared.present")}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">{tc("notSet")}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {cert.private_key ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("shared.present")}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">{tc("notSet")}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{cert.description || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {cert.revoke && <Badge variant="destructive">{t("shared.revoked")}</Badge>}
                              {cert.password_protected && <Badge variant="outline">{t("shared.protected")}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setViewingItem({ type: "certificate", item: cert })} title={t("shared.viewDetails")}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {hasWrite && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => { setEditingCert(cert); setShowCertModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({
                                    type: t("itemTypes.certificate"),
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
                <h2 className="text-lg font-semibold">{t("page.certificateAuthorities")}</h2>
                {hasWrite && (
                  <Button size="sm" onClick={() => { setEditingCA(null); setShowCAModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> {t("page.addCA")}
                  </Button>
                )}
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc("name")}</TableHead>
                      <TableHead>{t("shared.certificate")}</TableHead>
                      <TableHead>{t("shared.privateKey")}</TableHead>
                      <TableHead>{tc("description")}</TableHead>
                      <TableHead>{tc("status")}</TableHead>
                      <TableHead className="w-[120px]">{tc("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(config?.ca || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {t("page.noCAs")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      config?.ca.map((ca) => (
                        <TableRow key={ca.name}>
                          <TableCell className="font-medium">{ca.name}</TableCell>
                          <TableCell>
                            {ca.certificate ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("shared.present")}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">{tc("notSet")}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {ca.private_key ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("shared.present")}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">{tc("notSet")}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{ca.description || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {ca.revoke && <Badge variant="destructive">{t("shared.revoked")}</Badge>}
                              {ca.system_install && <Badge variant="outline">{t("shared.systemInstall")}</Badge>}
                              {ca.password_protected && <Badge variant="outline">{t("shared.protected")}</Badge>}
                              {ca.crl?.length > 0 && <Badge variant="outline">{t("shared.crlCount", { count: ca.crl.length })}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setViewingItem({ type: "ca", item: ca })} title={t("shared.viewDetails")}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {hasWrite && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => { setEditingCA(ca); setShowCAModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({
                                    type: t("itemTypes.ca"),
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
                <h2 className="text-lg font-semibold">{t("page.keyPairs")}</h2>
                {hasWrite && (
                  <Button size="sm" onClick={() => { setEditingKeyPair(null); setShowKeyPairModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> {t("page.addKeyPair")}
                  </Button>
                )}
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc("name")}</TableHead>
                      <TableHead>{t("shared.privateKey")}</TableHead>
                      <TableHead>{t("shared.publicKey")}</TableHead>
                      <TableHead>{tc("status")}</TableHead>
                      <TableHead className="w-[120px]">{tc("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(config?.key_pairs || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {t("page.noKeyPairs")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      config?.key_pairs.map((kp) => (
                        <TableRow key={kp.name}>
                          <TableCell className="font-medium">{kp.name}</TableCell>
                          <TableCell>
                            {kp.private_key ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("shared.present")}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">{tc("notSet")}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {kp.public_key ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("shared.present")}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">{tc("notSet")}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {kp.password_protected && <Badge variant="outline">{t("shared.protected")}</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setViewingItem({ type: "key_pair", item: kp })} title={t("shared.viewDetails")}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {hasWrite && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => { setEditingKeyPair(kp); setShowKeyPairModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({
                                    type: t("itemTypes.keyPair"),
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
                <h2 className="text-lg font-semibold">{t("shared.dhParameters")}</h2>
                {hasWrite && (
                  <Button size="sm" onClick={() => { setEditingDH(null); setShowDHModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> {t("page.addDHParameters")}
                  </Button>
                )}
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc("name")}</TableHead>
                      <TableHead>{t("page.colParameters")}</TableHead>
                      <TableHead className="w-[120px]">{tc("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(config?.dh || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          {t("page.noDH")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      config?.dh.map((dh) => (
                        <TableRow key={dh.name}>
                          <TableCell className="font-medium">{dh.name}</TableCell>
                          <TableCell>
                            {dh.parameters ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("shared.present")}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">{tc("notSet")}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setViewingItem({ type: "dh", item: dh })} title={t("shared.viewDetails")}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {hasWrite && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => { setEditingDH(dh); setShowDHModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({
                                    type: t("itemTypes.dhParameters"),
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
                <h2 className="text-lg font-semibold">{t("page.openSSHKeys")}</h2>
                {hasWrite && (
                  <Button size="sm" onClick={() => { setEditingOpenSSH(null); setShowOpenSSHModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> {t("page.addOpenSSHKey")}
                  </Button>
                )}
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc("name")}</TableHead>
                      <TableHead>{t("shared.privateKey")}</TableHead>
                      <TableHead>{t("shared.publicKey")}</TableHead>
                      <TableHead>{t("page.colType")}</TableHead>
                      <TableHead>{tc("status")}</TableHead>
                      <TableHead className="w-[120px]">{tc("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(config?.openssh || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {t("page.noOpenSSH")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      config?.openssh.map((ssh) => (
                        <TableRow key={ssh.name}>
                          <TableCell className="font-medium">{ssh.name}</TableCell>
                          <TableCell>
                            {ssh.private_key ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("shared.present")}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">{tc("notSet")}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {ssh.public_key ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("shared.present")}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">{tc("notSet")}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{ssh.public_type || "—"}</TableCell>
                          <TableCell>
                            {ssh.password_protected && <Badge variant="outline">{t("shared.protected")}</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setViewingItem({ type: "openssh", item: ssh })} title={t("shared.viewDetails")}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {hasWrite && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => { setEditingOpenSSH(ssh); setShowOpenSSHModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({
                                    type: t("itemTypes.openSSHKey"),
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
                <h2 className="text-lg font-semibold">{t("page.openVPNSecrets")}</h2>
                {hasWrite && (
                  <Button size="sm" onClick={() => { setEditingOpenVPN(null); setShowOpenVPNModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> {t("page.addSharedSecret")}
                  </Button>
                )}
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc("name")}</TableHead>
                      <TableHead>{t("shared.key")}</TableHead>
                      <TableHead>{t("shared.version")}</TableHead>
                      <TableHead className="w-[120px]">{tc("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(config?.openvpn_shared_secrets || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          {t("page.noOpenVPN")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      config?.openvpn_shared_secrets.map((secret) => (
                        <TableRow key={secret.name}>
                          <TableCell className="font-medium">{secret.name}</TableCell>
                          <TableCell>
                            {secret.key ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("shared.present")}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">{tc("notSet")}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{secret.version || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setViewingItem({ type: "openvpn", item: secret })} title={t("shared.viewDetails")}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {hasWrite && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => { setEditingOpenVPN(secret); setShowOpenVPNModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({
                                    type: t("itemTypes.sharedSecret"),
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
                <h2 className="text-lg font-semibold">{t("page.x509Defaults")}</h2>
                {hasWrite && (
                  <Button size="sm" variant="outline" onClick={() => setShowX509Modal(true)}>
                    <Pencil className="h-4 w-4 mr-2" /> {t("page.editDefaults")}
                  </Button>
                )}
              </div>
              <Card className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("shared.country")}</p>
                    <p className="mt-1">{config?.x509_defaults?.country || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("shared.state")}</p>
                    <p className="mt-1">{config?.x509_defaults?.state || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("shared.locality")}</p>
                    <p className="mt-1">{config?.x509_defaults?.locality || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("shared.organization")}</p>
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

export default function PKIPage() {
  return (
    <Suspense>
      <PKIPageInner />
    </Suspense>
  );
}
