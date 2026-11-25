"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowRight,
  Box,
  Download,
  FolderOpen,
  ImageOff,
  Pencil,
  Plus,
  RefreshCw,
  RotateCw,
  ScrollText,
  Trash2,
} from "lucide-react";
import {
  containerService,
  type ContainerCapabilities,
  type ContainerConfig,
  type ContainerInstance,
  type ContainerSSHResponse,
} from "@/lib/api/container";
import { removableVolumeDirs, VOLUME_BASE } from "@/lib/api/container-save-ops";
import type { ApiError } from "@/lib/types/api";
import { APP_CATALOG } from "@/lib/apps-catalog";
import { isProtectedStackContainer } from "@/lib/appliance";
import { isDisconnectError, stackRestartOrder, waitForBackend, waitForUi } from "@/lib/api-error";
import { useSessionStore } from "@/store/session-store";
import { ContainerModal } from "./ContainerModal";
import { ContainerFilesModal } from "./ContainerFilesModal";
import { DeleteContainerModal } from "./DeleteContainerModal";
import { SshOutputModal } from "./SshOutputModal";

interface Props {
  config: ContainerConfig;
  capabilities: ContainerCapabilities;
  hasWritePermission: boolean;
  /** A post-save reload is running; the config shown may be stale. */
  refreshing: boolean;
  onReload: () => Promise<void>;
}

interface SshState {
  open: boolean;
  title: string;
  loading: boolean;
  success: boolean | null;
  output?: string | null;
  error?: string | null;
  /** Progress text; only the stack update sets it. */
  busyLabel?: string;
}

/** A row or page action that changes the router, confirmed before it runs. */
type PendingAction =
  | { kind: "restart"; name: string }
  | { kind: "deleteImage"; name: string; image: string }
  | { kind: "updateStack" };

export function ContainersTab({ config, capabilities, hasWritePermission, refreshing, onReload }: Props) {
  const t = useTranslations("containers");
  const tr = useTranslations("containerResources");
  const tc = useTranslations("common");
  const appliance = useSessionStore((s) => s.appliance);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [editingContainer, setEditingContainer] = useState<ContainerInstance | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingContainer, setDeletingContainer] = useState<ContainerInstance | null>(null);
  const [filesContainer, setFilesContainer] = useState<ContainerInstance | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [ssh, setSsh] = useState<SshState>({ open: false, title: "", loading: false, success: null });
  const [pulledImages, setPulledImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);

  const getCatalogApp = (c: ContainerInstance) => {
    const appId = c.labels.find((l) => l.name === "com.vymanager.app")?.value;
    if (!appId) return null;
    return APP_CATALOG.find((a) => a.id === appId) ?? null;
  };

  const containers = config.containers;
  const stackContainers = containers.filter((c) => isProtectedStackContainer(appliance, c.name));
  const writeDisabled = refreshing || ssh.loading;

  const openModal = async (container: ContainerInstance | null) => {
    setEditingContainer(container);
    setModalKey((k) => k + 1);
    setModalOpen(true);
    setImagesLoading(true);
    setImagesError(null);
    try {
      setPulledImages(await containerService.getImages());
    } catch (err: unknown) {
      setPulledImages([]);
      setImagesError((err as ApiError).message || tr("images.loadFailed"));
    } finally {
      setImagesLoading(false);
    }
  };

  const handleSubmit = async (draft: ContainerInstance) => {
    await containerService.saveContainer(editingContainer, draft, capabilities.features);
    void onReload();
  };

  const openDelete = (container: ContainerInstance) => {
    setDeletingContainer(container);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingContainer) return;
    if (isProtectedStackContainer(appliance, deletingContainer.name)) throw new Error(t("tab.stackProtected"));
    await containerService.deleteContainer(deletingContainer.name);
    // Best-effort: remove the container's directory tree after a successful commit,
    // unless another container mounts a path inside it (or a path containing it).
    const otherSources = containers
      .filter((c) => c.name !== deletingContainer.name)
      .flatMap((c) => c.volumes.map((v) => v.source ?? ""));
    for (const dir of removableVolumeDirs([`${VOLUME_BASE}${deletingContainer.name}`], otherSources)) {
      try {
        await containerService.removeContainerDir(dir);
      } catch {
        /* the VyOS config is already saved */
      }
    }
    void onReload();
  };

  /** `reload`: the action changed the image, so the update badge is re-read after a success. */
  const runSsh = async (title: string, fn: () => Promise<ContainerSSHResponse>, reload = false) => {
    setSsh({ open: true, title, loading: true, success: null });
    try {
      const result = await fn();
      setSsh({ open: true, title, loading: false, success: result.success, output: result.output, error: result.error });
      if (result.success && reload) void onReload();
    } catch (err: unknown) {
      setSsh({ open: true, title, loading: false, success: false, error: (err as ApiError).message || t("sshOutput.failed") });
    }
  };

  const confirmAction = (action: PendingAction) => {
    setPending(action);
    setPendingOpen(true);
  };

  const updateStack = () => {
    void (async () => {
      const lines: string[] = [];
      const show = (loading: boolean, extra?: { success?: boolean | null; error?: string | null }) => {
        setSsh({
          open: true,
          title: t("tab.updateVyManager"),
          loading,
          success: extra?.success ?? (loading ? null : true),
          output: lines.join("\n") || null,
          error: extra?.error ?? null,
          busyLabel: t("tab.updateInProgress"),
        });
      };
      show(true);
      try {
        for (const c of stackContainers) {
          lines.push(t("tab.pulling", { name: c.name }));
          show(true);
          const pulled = await containerService.updateImage(c.name);
          if (!pulled.success) {
            show(false, { success: false, error: pulled.error || t("tab.pullFailed", { name: c.name }) });
            return;
          }
          lines[lines.length - 1] = t("tab.pulled", { name: c.name });
          show(true);
        }

        const restartOrder = [...stackContainers].sort(
          (a, b) => stackRestartOrder(a.name) - stackRestartOrder(b.name),
        );
        for (const c of restartOrder) {
          lines.push(t("tab.restarting", { name: c.name }));
          show(true);
          try {
            const restarted = await containerService.restartContainer(c.name);
            if (!restarted.success && !isDisconnectError({ message: restarted.error || "" })) {
              show(false, { success: false, error: restarted.error || t("tab.restartFailed", { name: c.name }) });
              return;
            }
          } catch (err: unknown) {
            if (!isDisconnectError(err)) throw err;
          }
          if (c.name !== "vymanager-frontend") {
            lines.push(t("tab.waitingApi"));
            show(true);
            const up = await waitForBackend();
            lines[lines.length - 1] = up ? t("tab.apiBack") : t("tab.apiNotAnswering");
            show(true);
          } else {
            lines.push(t("tab.waitingUi"));
            show(true);
            const up = await waitForUi();
            lines[lines.length - 1] = up ? t("tab.uiBack") : t("tab.uiNotAnswering");
            show(true);
            if (!up) {
              show(false, { success: true });
              return;
            }
          }
        }
        lines.push(t("tab.reloading"));
        show(true);
        window.location.reload();
      } catch (err: unknown) {
        if (isDisconnectError(err)) {
          lines.push(t("tab.waitingUi"));
          show(true);
          const up = await waitForUi();
          if (up) {
            window.location.reload();
            return;
          }
          lines.push(t("tab.refreshSoon"));
          show(false, { success: true });
          return;
        }
        show(false, { success: false, error: (err as ApiError).message || t("sshOutput.failed") });
      }
    })();
  };

  const runPending = () => {
    setPendingOpen(false);
    if (!pending) return;
    if (pending.kind === "restart") {
      const name = pending.name;
      void runSsh(t("tab.restartTitle", { name }), () => containerService.restartContainer(name));
    } else if (pending.kind === "deleteImage") {
      const name = pending.name;
      void runSsh(tr("images.deleteImageTitle", { image: pending.image }), () => containerService.deleteImage(name));
    } else {
      updateStack();
    }
  };

  const pendingTitle =
    pending?.kind === "restart"
      ? t("tab.restartTitle", { name: pending.name })
      : pending?.kind === "deleteImage"
        ? tr("images.deleteImageTitle", { image: pending.image })
        : t("tab.updateVyManager");
  const pendingText =
    pending?.kind === "restart"
      ? t("tab.restartConfirm", { name: pending.name })
      : pending?.kind === "deleteImage"
        ? t("tab.deleteImageConfirm", { name: pending.name, image: pending.image })
        : t("tab.updateStackConfirm");

  return (
    <>
      {containers.length > 0 && hasWritePermission && (
        <div className="flex justify-end mb-4 gap-2">
          {stackContainers.length > 0 && (
            <Button size="sm" variant="outline" disabled={writeDisabled} onClick={() => confirmAction({ kind: "updateStack" })}>
              <RefreshCw className="h-4 w-4 mr-2" />{t("tab.updateVyManager")}
            </Button>
          )}
          <Button size="sm" disabled={writeDisabled} onClick={() => openModal(null)}>
            <Plus className="h-4 w-4 mr-2" />{t("tab.addContainer")}
          </Button>
        </div>
      )}
      {stackContainers.length > 0 && (
        <p className="text-sm text-muted-foreground mb-4">{t("tab.stackNotice")}</p>
      )}

      {containers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Box className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">{t("tab.noContainers")}</p>
            {hasWritePermission && (
              <Button size="sm" disabled={writeDisabled} onClick={() => openModal(null)}>
                <Plus className="h-4 w-4 mr-2" />{t("tab.addContainer")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ScrollArea>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc("name")}</TableHead>
                  <TableHead>{t("modal.image")}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                  <TableHead>{t("tab.networks")}</TableHead>
                  <TableHead>{t("tab.ports")}</TableHead>
                  <TableHead className="text-right">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {containers.map((c) => {
                  const stack = isProtectedStackContainer(appliance, c.name);
                  const app = getCatalogApp(c);
                  return (
                    <TableRow key={c.name}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{c.name}</Badge>
                      </TableCell>
                      <TableCell>
                        {c.image
                          ? <span className="font-mono text-xs">{c.image}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          {c.disabled
                            ? <Badge variant="secondary" className="bg-muted text-muted-foreground">{tc("disabled")}</Badge>
                            : <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("tab.active")}</Badge>}
                          {c.update_status?.available && (
                            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                              {t("tab.updateAvailable")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.allow_host_networks ? (
                          <Badge variant="secondary" className="text-xs">{tr("wizard.host")}</Badge>
                        ) : c.networks.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.networks.map((n) => (
                              <Badge key={n.name} variant="secondary" className="font-mono text-xs">{n.name}</Badge>
                            ))}
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {c.ports.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            <span className="font-mono text-xs flex items-center gap-1">
                              {c.ports[0].source}
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              {c.ports[0].destination}{c.ports[0].protocol ? `/${c.ports[0].protocol}` : ""}
                            </span>
                            {c.ports.length > 1 && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">+{c.ports.length - 1}</Badge>
                            )}
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {hasWritePermission && (
                            <>
                              {app?.installConfig?.editableFiles?.length ? (
                                <Button variant="ghost" size="icon" className="h-8 w-8" title={t("tab.editFiles")} aria-label={t("tab.editFiles")} disabled={writeDisabled} onClick={() => setFilesContainer(c)}>
                                  <FolderOpen className="h-4 w-4" />
                                </Button>
                              ) : null}
                              {!stack && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" title={tc("edit")} aria-label={tc("edit")} disabled={writeDisabled} onClick={() => openModal(c)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8" title={t("tab.pullImage")} aria-label={t("tab.pullImage")} disabled={writeDisabled} onClick={() => runSsh(t("tab.pullImageTitle", { name: c.name }), () => containerService.addImage(c.name), true)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title={tr("images.updateImage")} aria-label={tr("images.updateImage")} disabled={writeDisabled} onClick={() => runSsh(t("tab.updateImageTitle", { name: c.name }), () => containerService.updateImage(c.name), true)}>
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              {!stack && c.image && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" title={tr("images.deleteImage")} aria-label={tr("images.deleteImage")} disabled={writeDisabled} onClick={() => confirmAction({ kind: "deleteImage", name: c.name, image: c.image ?? "" })}>
                                  <ImageOff className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8" title={t("tab.restart")} aria-label={t("tab.restart")} disabled={writeDisabled} onClick={() => confirmAction({ kind: "restart", name: c.name })}>
                                <RotateCw className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" title={t("tab.viewLogs")} aria-label={t("tab.viewLogs")} disabled={ssh.loading} onClick={() => runSsh(t("tab.logsTitle", { name: c.name }), () => containerService.getContainerLog(c.name))}>
                            <ScrollText className="h-4 w-4" />
                          </Button>
                          {hasWritePermission && !stack && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title={tc("delete")} aria-label={tc("delete")} disabled={writeDisabled} onClick={() => openDelete(c)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      <ContainerModal
        key={modalKey}
        open={modalOpen}
        onOpenChange={setModalOpen}
        container={editingContainer}
        capabilities={capabilities}
        availableNetworks={config.networks}
        containers={containers}
        availableImages={pulledImages}
        imagesLoading={imagesLoading}
        imagesError={imagesError}
        onSubmit={handleSubmit}
      />

      {filesContainer && getCatalogApp(filesContainer) && (
        <ContainerFilesModal
          open={!!filesContainer}
          onOpenChange={(open) => { if (!open) setFilesContainer(null); }}
          containerName={filesContainer.name}
          app={getCatalogApp(filesContainer)!}
        />
      )}

      <DeleteContainerModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        container={deletingContainer}
        onConfirm={handleDelete}
      />

      <AlertDialog open={pendingOpen} onOpenChange={setPendingOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingTitle}</AlertDialogTitle>
            <AlertDialogDescription>{pendingText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={runPending}>{t("tab.apply")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SshOutputModal
        open={ssh.open}
        onOpenChange={(open) => { if (!open) setSsh((s) => ({ ...s, open: false })); }}
        title={ssh.title}
        loading={ssh.loading}
        success={ssh.success}
        output={ssh.output}
        error={ssh.error}
        busyLabel={ssh.busyLabel}
      />
    </>
  );
}
