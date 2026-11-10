"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Network,
  RefreshCw,
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
  Users,
  Layers,
  Eye,
  Send,
  Radio,
  Terminal,
  Globe,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  snmpService,
  SNMPConfig,
  SNMPCapabilities,
  SNMPListenAddress,
  SNMPCommunity,
  SNMPTrapTarget,
  SNMPScriptExtension,
  SNMPv3User,
  SNMPv3Group,
  SNMPv3View,
  SNMPv3TrapTarget,
} from "@/lib/api/snmp";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { SNMPGeneralSettingsModal } from "./SNMPGeneralSettingsModal";
import { SNMPListenAddressModal } from "./SNMPListenAddressModal";
import { SNMPCommunityModal } from "./SNMPCommunityModal";
import { SNMPTrapTargetModal } from "./SNMPTrapTargetModal";
import { SNMPScriptExtensionModal } from "./SNMPScriptExtensionModal";
import { SNMPv3UserModal } from "./SNMPv3UserModal";
import { SNMPv3GroupModal } from "./SNMPv3GroupModal";
import { SNMPv3ViewModal } from "./SNMPv3ViewModal";
import { SNMPv3TrapTargetModal } from "./SNMPv3TrapTargetModal";
import { SNMPConfirmDeleteModal } from "./SNMPConfirmDeleteModal";

interface DeleteTarget {
  title: string;
  itemName: string;
  description?: string;
  onConfirm: () => Promise<void>;
}

function Dash() {
  return <span className="text-muted-foreground">—</span>;
}

export function SNMPContent() {
  const t = useTranslations("snmp");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWrite = canWrite(FeatureGroup.SNMP);

  const [config, setConfig] = useState<SNMPConfig | null>(null);
  const [capabilities, setCapabilities] = useState<SNMPCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [generalOpen, setGeneralOpen] = useState(false);
  const [listenModal, setListenModal] = useState<{ open: boolean; edit: SNMPListenAddress | null }>({ open: false, edit: null });
  const [communityModal, setCommunityModal] = useState<{ open: boolean; edit: SNMPCommunity | null }>({ open: false, edit: null });
  const [trapModal, setTrapModal] = useState<{ open: boolean; edit: SNMPTrapTarget | null }>({ open: false, edit: null });
  const [extModal, setExtModal] = useState<{ open: boolean; edit: SNMPScriptExtension | null }>({ open: false, edit: null });
  const [userModal, setUserModal] = useState<{ open: boolean; edit: SNMPv3User | null }>({ open: false, edit: null });
  const [groupModal, setGroupModal] = useState<{ open: boolean; edit: SNMPv3Group | null }>({ open: false, edit: null });
  const [viewModal, setViewModal] = useState<{ open: boolean; edit: SNMPv3View | null }>({ open: false, edit: null });
  const [v3TrapModal, setV3TrapModal] = useState<{ open: boolean; edit: SNMPv3TrapTarget | null }>({ open: false, edit: null });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [cfg, caps] = await Promise.all([
        snmpService.getConfig(refresh),
        capabilities ? Promise.resolve(capabilities) : snmpService.getCapabilities(),
      ]);
      setConfig(cfg);
      setCapabilities(caps);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("content.loadFailed"));
    } finally {
      setLoading(false);
    }
    // capabilities intentionally excluded — only fetched once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && (!config || !capabilities)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => loadData()}>
          {tc("retry")}
        </Button>
      </div>
    );
  }

  if (!config || !capabilities) return null;

  const v3 = config.v3;
  const groupNames = v3.groups.map((g) => g.name);
  const viewNames = v3.views.map((v) => v.name);
  const userNames = v3.users.map((u) => u.name);
  const v3Configured =
    !!v3.engineid ||
    v3.users.length > 0 ||
    v3.groups.length > 0 ||
    v3.views.length > 0 ||
    v3.trap_targets.length > 0;

  const refresh = () => loadData(true);

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <Network className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">SNMP</h1>
                  {!hasWrite && <Badge variant="secondary">{tc("readOnly")}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("content.subtitle")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasWrite && (
                <Button size="sm" onClick={() => setGeneralOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t("content.generalSettings")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={refresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {tc("refresh")}
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="whitespace-pre-wrap">{error}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 p-6 pt-4 overflow-auto">
          <Tabs defaultValue="general" className="w-full">
            <TabsList>
              <TabsTrigger value="general">{t("content.tabs.general")}</TabsTrigger>
              <TabsTrigger value="communities">
                {t("content.tabs.communities")}
                {config.communities.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{config.communities.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="traps">
                {t("content.tabs.trapTargets")}
                {config.trap_targets.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{config.trap_targets.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="v3">
                SNMPv3
                {v3Configured && <Badge variant="secondary" className="ml-2">{t("content.active")}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="extensions">
                {t("content.tabs.extensions")}
                {config.script_extensions.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{config.script_extensions.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ---------------------------------------------------- General */}
            <TabsContent value="general" className="space-y-6 mt-4">
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    {t("content.systemInformation")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <Field label={t("content.contact")} value={config.contact} />
                    <Field label={t("content.location")} value={config.location} />
                    <Field label={tc("description")} value={config.description} />
                    <Field
                      label={t("content.protocol")}
                      value={(config.protocol ?? capabilities.features.protocol.default).toUpperCase()}
                    />
                    <Field label={t("content.trapSource")} value={config.trap_source} mono />
                    <Field label="VRF" value={config.vrf} mono />
                    <Field label={t("content.engineId")} value={config.v3.engineid} mono />
                    <Field label={t("content.maxIfMibInterfaces")} value={config.mib_interface_max} />
                  </dl>

                  <div className="mt-4 space-y-3">
                    <BadgeRow label={t("content.enabledOids")} values={config.oid_enable} empty={tc("none")} />
                    <BadgeRow label={t("content.ifMibPrefixes")} values={config.mib_interfaces} empty={t("content.allInterfaces")} />
                    <BadgeRow label={t("content.smuxPeers")} values={config.smux_peers} empty={tc("none")} />
                  </div>
                </CardContent>
              </Card>

              <SectionCard
                icon={<Radio className="h-4 w-4" />}
                title={t("content.listenAddresses")}
                count={config.listen_addresses.length}
                hasWrite={hasWrite}
                onAdd={() => setListenModal({ open: true, edit: null })}
                emptyText={t("content.listenAddressesEmpty")}
                isEmpty={config.listen_addresses.length === 0}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("content.address")}</TableHead>
                      <TableHead>{t("content.port")}</TableHead>
                      {hasWrite && <TableHead className="w-[80px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.listen_addresses.map((a) => (
                      <TableRow key={a.address}>
                        <TableCell className="font-mono font-medium">{a.address}</TableCell>
                        <TableCell>{a.port ?? <Dash />}</TableCell>
                        {hasWrite && (
                          <RowActions
                            onEdit={() => setListenModal({ open: true, edit: a })}
                            onDelete={() =>
                              setDeleteTarget({
                                title: t("content.removeListenAddress"),
                                itemName: a.address,
                                onConfirm: () => snmpService.deleteListenAddress(a.address).then(() => {}),
                              })
                            }
                          />
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>
            </TabsContent>

            {/* ------------------------------------------------ Communities */}
            <TabsContent value="communities" className="mt-4">
              <SectionCard
                icon={<Users className="h-4 w-4" />}
                title={t("content.communitiesTitle")}
                count={config.communities.length}
                hasWrite={hasWrite}
                onAdd={() => setCommunityModal({ open: true, edit: null })}
                emptyText={t("content.communitiesEmpty")}
                isEmpty={config.communities.length === 0}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc("name")}</TableHead>
                      <TableHead>{t("content.authorization")}</TableHead>
                      <TableHead>{t("content.clients")}</TableHead>
                      <TableHead>{t("content.networks")}</TableHead>
                      {hasWrite && <TableHead className="w-[80px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.communities.map((c) => (
                      <TableRow key={c.name}>
                        <TableCell className="font-mono font-medium">{c.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {(c.authorization ?? capabilities.features.community.default_authorization) === "rw"
                              ? t("content.readWrite")
                              : t("content.readOnlyAuth")}
                          </Badge>
                        </TableCell>
                        <TableCell>{c.clients.length > 0 ? c.clients.length : <Dash />}</TableCell>
                        <TableCell>{c.networks.length > 0 ? c.networks.length : <Dash />}</TableCell>
                        {hasWrite && (
                          <RowActions
                            onEdit={() => setCommunityModal({ open: true, edit: c })}
                            onDelete={() =>
                              setDeleteTarget({
                                title: t("content.removeCommunity"),
                                itemName: c.name,
                                onConfirm: () => snmpService.deleteCommunity(c.name).then(() => {}),
                              })
                            }
                          />
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>
            </TabsContent>

            {/* ----------------------------------------------- Trap targets */}
            <TabsContent value="traps" className="mt-4">
              <SectionCard
                icon={<Send className="h-4 w-4" />}
                title={t("content.trapTargetsV2Title")}
                count={config.trap_targets.length}
                hasWrite={hasWrite}
                onAdd={() => setTrapModal({ open: true, edit: null })}
                emptyText={t("content.trapTargetsEmpty")}
                isEmpty={config.trap_targets.length === 0}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("content.address")}</TableHead>
                      <TableHead>{t("content.community")}</TableHead>
                      <TableHead>{t("content.port")}</TableHead>
                      {hasWrite && <TableHead className="w-[80px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.trap_targets.map((tt) => (
                      <TableRow key={tt.address}>
                        <TableCell className="font-mono font-medium">{tt.address}</TableCell>
                        <TableCell className="font-mono">{tt.community ?? <Dash />}</TableCell>
                        <TableCell>{tt.port ?? <Dash />}</TableCell>
                        {hasWrite && (
                          <RowActions
                            onEdit={() => setTrapModal({ open: true, edit: tt })}
                            onDelete={() =>
                              setDeleteTarget({
                                title: t("content.removeTrapTarget"),
                                itemName: tt.address,
                                onConfirm: () => snmpService.deleteTrapTarget(tt.address).then(() => {}),
                              })
                            }
                          />
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>
            </TabsContent>

            {/* ---------------------------------------------------- SNMPv3 */}
            <TabsContent value="v3" className="space-y-6 mt-4">
              {/* Users */}
              <SectionCard
                icon={<Users className="h-4 w-4" />}
                title={t("content.users")}
                count={v3.users.length}
                hasWrite={hasWrite}
                onAdd={() => setUserModal({ open: true, edit: null })}
                emptyText={t("content.usersEmpty")}
                isEmpty={v3.users.length === 0}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("content.username")}</TableHead>
                      <TableHead>{t("content.group")}</TableHead>
                      <TableHead>{t("content.mode")}</TableHead>
                      <TableHead>{t("content.auth")}</TableHead>
                      <TableHead>{t("content.privacy")}</TableHead>
                      {hasWrite && <TableHead className="w-[80px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {v3.users.map((u) => (
                      <TableRow key={u.name}>
                        <TableCell className="font-mono font-medium">{u.name}</TableCell>
                        <TableCell className="font-mono">{u.group ?? <Dash />}</TableCell>
                        <TableCell>{u.mode ? u.mode.toUpperCase() : <Dash />}</TableCell>
                        <TableCell><CredBadge type={u.auth?.type} /></TableCell>
                        <TableCell><CredBadge type={u.privacy?.type} /></TableCell>
                        {hasWrite && (
                          <RowActions
                            onEdit={() => setUserModal({ open: true, edit: u })}
                            onDelete={() =>
                              setDeleteTarget({
                                title: t("content.removeUser"),
                                itemName: u.name,
                                onConfirm: () => snmpService.deleteV3User(u.name).then(() => {}),
                              })
                            }
                          />
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>

              {/* Groups */}
              <SectionCard
                icon={<Layers className="h-4 w-4" />}
                title={t("content.groups")}
                count={v3.groups.length}
                hasWrite={hasWrite}
                onAdd={() => setGroupModal({ open: true, edit: null })}
                emptyText={t("content.groupsEmpty")}
                isEmpty={v3.groups.length === 0}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc("name")}</TableHead>
                      <TableHead>{t("content.mode")}</TableHead>
                      <TableHead>{t("content.securityLevel")}</TableHead>
                      <TableHead>{t("content.view")}</TableHead>
                      {hasWrite && <TableHead className="w-[80px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {v3.groups.map((g) => (
                      <TableRow key={g.name}>
                        <TableCell className="font-mono font-medium">{g.name}</TableCell>
                        <TableCell>{g.mode ? g.mode.toUpperCase() : <Dash />}</TableCell>
                        <TableCell>{g.seclevel ?? <Dash />}</TableCell>
                        <TableCell className="font-mono">{g.view ?? <Dash />}</TableCell>
                        {hasWrite && (
                          <RowActions
                            onEdit={() => setGroupModal({ open: true, edit: g })}
                            onDelete={() =>
                              setDeleteTarget({
                                title: t("content.removeGroup"),
                                itemName: g.name,
                                onConfirm: () => snmpService.deleteV3Group(g.name).then(() => {}),
                              })
                            }
                          />
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>

              {/* Views */}
              <SectionCard
                icon={<Eye className="h-4 w-4" />}
                title={t("content.views")}
                count={v3.views.length}
                hasWrite={hasWrite}
                onAdd={() => setViewModal({ open: true, edit: null })}
                emptyText={t("content.viewsEmpty")}
                isEmpty={v3.views.length === 0}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc("name")}</TableHead>
                      <TableHead>{t("content.oidSubtrees")}</TableHead>
                      {hasWrite && <TableHead className="w-[80px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {v3.views.map((v) => (
                      <TableRow key={v.name}>
                        <TableCell className="font-mono font-medium">{v.name}</TableCell>
                        <TableCell>
                          {v.oids.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {v.oids.map((o) => (
                                <Badge key={o.oid} variant="secondary" className="font-mono text-xs">
                                  {o.oid}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <Dash />
                          )}
                        </TableCell>
                        {hasWrite && (
                          <RowActions
                            onEdit={() => setViewModal({ open: true, edit: v })}
                            onDelete={() =>
                              setDeleteTarget({
                                title: t("content.removeView"),
                                itemName: v.name,
                                onConfirm: () => snmpService.deleteV3View(v.name).then(() => {}),
                              })
                            }
                          />
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>

              {/* v3 trap targets */}
              <SectionCard
                icon={<Send className="h-4 w-4" />}
                title={t("content.tabs.trapTargets")}
                count={v3.trap_targets.length}
                hasWrite={hasWrite}
                onAdd={() => setV3TrapModal({ open: true, edit: null })}
                emptyText={t("content.v3TrapTargetsEmpty")}
                isEmpty={v3.trap_targets.length === 0}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("content.address")}</TableHead>
                      <TableHead>{t("content.user")}</TableHead>
                      <TableHead>{t("content.type")}</TableHead>
                      <TableHead>{t("content.protocol")}</TableHead>
                      <TableHead>{t("content.port")}</TableHead>
                      {hasWrite && <TableHead className="w-[80px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {v3.trap_targets.map((tt) => (
                      <TableRow key={tt.address}>
                        <TableCell className="font-mono font-medium">{tt.address}</TableCell>
                        <TableCell className="font-mono">{tt.user ?? <Dash />}</TableCell>
                        <TableCell>{tt.type ?? <Dash />}</TableCell>
                        <TableCell>{tt.protocol ? tt.protocol.toUpperCase() : <Dash />}</TableCell>
                        <TableCell>{tt.port ?? <Dash />}</TableCell>
                        {hasWrite && (
                          <RowActions
                            onEdit={() => setV3TrapModal({ open: true, edit: tt })}
                            onDelete={() =>
                              setDeleteTarget({
                                title: t("content.removeV3TrapTarget"),
                                itemName: tt.address,
                                onConfirm: () => snmpService.deleteV3TrapTarget(tt.address).then(() => {}),
                              })
                            }
                          />
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>
            </TabsContent>

            {/* ------------------------------------------------- Extensions */}
            <TabsContent value="extensions" className="mt-4">
              <SectionCard
                icon={<Terminal className="h-4 w-4" />}
                title={t("content.scriptExtensions")}
                count={config.script_extensions.length}
                hasWrite={hasWrite}
                onAdd={() => setExtModal({ open: true, edit: null })}
                emptyText={t("content.scriptExtensionsEmpty")}
                isEmpty={config.script_extensions.length === 0}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc("name")}</TableHead>
                      <TableHead>{t("content.script")}</TableHead>
                      {hasWrite && <TableHead className="w-[80px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.script_extensions.map((e) => (
                      <TableRow key={e.name}>
                        <TableCell className="font-mono font-medium">{e.name}</TableCell>
                        <TableCell className="font-mono">{e.script ?? <Dash />}</TableCell>
                        {hasWrite && (
                          <RowActions
                            onEdit={() => setExtModal({ open: true, edit: e })}
                            onDelete={() =>
                              setDeleteTarget({
                                title: t("content.removeScriptExtension"),
                                itemName: e.name,
                                onConfirm: () => snmpService.deleteScriptExtension(e.name).then(() => {}),
                              })
                            }
                          />
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      {generalOpen && (
        <SNMPGeneralSettingsModal
          open={generalOpen}
          onOpenChange={setGeneralOpen}
          config={config}
          capabilities={capabilities}
          onSuccess={refresh}
        />
      )}
      {listenModal.open && (
        <SNMPListenAddressModal
          open={listenModal.open}
          onOpenChange={(o) => setListenModal((p) => ({ ...p, open: o }))}
          existing={listenModal.edit}
          existingAddresses={config.listen_addresses.map((a) => a.address)}
          defaultPort={capabilities.features.listen_address.default_port}
          onSuccess={refresh}
        />
      )}
      {communityModal.open && (
        <SNMPCommunityModal
          open={communityModal.open}
          onOpenChange={(o) => setCommunityModal((p) => ({ ...p, open: o }))}
          existing={communityModal.edit}
          existingNames={config.communities.map((c) => c.name)}
          capabilities={capabilities}
          onSuccess={refresh}
        />
      )}
      {trapModal.open && (
        <SNMPTrapTargetModal
          open={trapModal.open}
          onOpenChange={(o) => setTrapModal((p) => ({ ...p, open: o }))}
          existing={trapModal.edit}
          existingAddresses={config.trap_targets.map((t) => t.address)}
          defaultPort={capabilities.features.trap_target.default_port}
          onSuccess={refresh}
        />
      )}
      {extModal.open && (
        <SNMPScriptExtensionModal
          open={extModal.open}
          onOpenChange={(o) => setExtModal((p) => ({ ...p, open: o }))}
          existing={extModal.edit}
          existingNames={config.script_extensions.map((e) => e.name)}
          onSuccess={refresh}
        />
      )}
      {userModal.open && (
        <SNMPv3UserModal
          open={userModal.open}
          onOpenChange={(o) => setUserModal((p) => ({ ...p, open: o }))}
          existing={userModal.edit}
          existingNames={userNames}
          groupNames={groupNames}
          capabilities={capabilities}
          onSuccess={refresh}
        />
      )}
      {groupModal.open && (
        <SNMPv3GroupModal
          open={groupModal.open}
          onOpenChange={(o) => setGroupModal((p) => ({ ...p, open: o }))}
          existing={groupModal.edit}
          existingNames={groupNames}
          viewNames={viewNames}
          capabilities={capabilities}
          onSuccess={refresh}
        />
      )}
      {viewModal.open && (
        <SNMPv3ViewModal
          open={viewModal.open}
          onOpenChange={(o) => setViewModal((p) => ({ ...p, open: o }))}
          existing={viewModal.edit}
          existingNames={viewNames}
          onSuccess={refresh}
        />
      )}
      {v3TrapModal.open && (
        <SNMPv3TrapTargetModal
          open={v3TrapModal.open}
          onOpenChange={(o) => setV3TrapModal((p) => ({ ...p, open: o }))}
          existing={v3TrapModal.edit}
          existingAddresses={v3.trap_targets.map((t) => t.address)}
          userNames={userNames}
          capabilities={capabilities}
          onSuccess={refresh}
        />
      )}
      {deleteTarget && (
        <SNMPConfirmDeleteModal
          open={!!deleteTarget}
          onOpenChange={(o) => {
            if (!o) setDeleteTarget(null);
          }}
          title={deleteTarget.title}
          itemName={deleteTarget.itemName}
          description={deleteTarget.description}
          onConfirm={deleteTarget.onConfirm}
          onSuccess={refresh}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------- helpers

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-sm ${mono ? "font-mono" : ""}`}>
        {value ? value : <Dash />}
      </dd>
    </div>
  );
}

function BadgeRow({ label, values, empty }: { label: string; values: string[]; empty: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="font-mono text-xs">{v}</Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function CredBadge({ type }: { type?: string | null }) {
  if (!type) return <Dash />;
  return (
    <Badge variant="secondary" className="uppercase text-xs">{type}</Badge>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <TableCell>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </TableCell>
  );
}

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  hasWrite: boolean;
  onAdd: () => void;
  emptyText: string;
  isEmpty: boolean;
  children: React.ReactNode;
}

function SectionCard({ icon, title, count, hasWrite, onAdd, emptyText, isEmpty, children }: SectionCardProps) {
  const tc = useTranslations("common");
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            {icon}
            {title}
            {count > 0 && <Badge variant="secondary">{count}</Badge>}
          </CardTitle>
          {hasWrite && (
            <Button size="sm" variant="outline" onClick={onAdd}>
              <Plus className="h-4 w-4 mr-1" />
              {tc("add")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{emptyText}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
