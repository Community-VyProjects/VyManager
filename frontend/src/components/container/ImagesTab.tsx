"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertCircle, ImageIcon, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { containerService, type ContainerConfig, type ContainerSSHResponse } from "@/lib/api/container";
import type { ApiError } from "@/lib/types/api";
import { isProtectedStackImage } from "@/lib/appliance";
import { useSessionStore } from "@/store/session-store";
import { SshOutputModal } from "./SshOutputModal";
import { AddImageModal } from "./AddImageModal";
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

interface Props {
  config: ContainerConfig;
  hasWritePermission: boolean;
  /** Re-reads the config (container update badges) after a pull or update. */
  onReload: () => Promise<void>;
}

interface SshState {
  open: boolean;
  title: string;
  loading: boolean;
  success: boolean | null;
  output?: string | null;
  error?: string | null;
}

function normalizeImage(s: string): string {
  const r = s.toLowerCase().trim();
  // A ref with no ":" has no explicit tag — treat as :latest (which is the implicit default)
  return r.includes(":") ? r : r + ":latest";
}

function imagesMatch(pulled: string, configured: string): boolean {
  const p = normalizeImage(pulled);
  const c = normalizeImage(configured);
  if (p === c) return true;
  if (p.endsWith("/" + c)) return true;
  if (c.endsWith("/" + p)) return true;
  return false;
}

export function ImagesTab({ config, hasWritePermission, onReload }: Props) {
  const t = useTranslations("containerResources");
  const tm = useTranslations("containers");
  const tc = useTranslations("common");
  const appliance = useSessionStore((s) => s.appliance);
  const [pulledImages, setPulledImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalKey, setAddModalKey] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [ssh, setSsh] = useState<SshState>({ open: false, title: "", loading: false, success: null });

  // State is set only after the request returns, so the mount effect sets none synchronously.
  const fetchImages = useCallback(async () => {
    try {
      setPulledImages(await containerService.getImages());
      setImagesError(null);
    } catch (err: unknown) {
      setPulledImages([]);
      setImagesError((err as ApiError).message || t("images.loadFailed"));
    } finally {
      setImagesLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchImages();
  }, [fetchImages]);

  const reloadImages = () => {
    setImagesLoading(true);
    void fetchImages();
  };

  /** `reload`: the action changed an image, so the container update badges are re-read after a success. */
  const runSsh = async (title: string, fn: () => Promise<ContainerSSHResponse>, reload = false) => {
    setSsh({ open: true, title, loading: true, success: null });
    try {
      const result = await fn();
      setSsh({ open: true, title, loading: false, success: result.success, output: result.output, error: result.error });
      if (result.success) {
        reloadImages();
        if (reload) void onReload();
      }
    } catch (err: unknown) {
      setSsh({ open: true, title, loading: false, success: false, error: (err as ApiError).message || tm("sshOutput.failed") });
    }
  };

  const usedByContainers = (img: string): string[] =>
    config.containers.filter((c) => c.image && imagesMatch(img, c.image)).map((c) => c.name);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {t("images.pulledImages")}
              {!imagesLoading && !imagesError && (
                <Badge variant="outline" className="font-normal">{pulledImages.length}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasWritePermission && (
                <Button
                  size="sm"
                  disabled={ssh.loading}
                  onClick={() => {
                    setAddModalKey((k) => k + 1);
                    setAddModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />{t("images.addImage")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={reloadImages} disabled={imagesLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${imagesLoading ? "animate-spin" : ""}`} />
                {tc("refresh")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {imagesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-6 py-8">
              <Loader2 className="h-4 w-4 animate-spin" />{t("images.loading")}
            </div>
          ) : imagesError ? (
            <div className="flex items-start gap-2 mx-6 mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive whitespace-pre-wrap">{imagesError}</p>
            </div>
          ) : pulledImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">{t("images.noImages")}</p>
            </div>
          ) : (
            <ScrollArea>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tm("modal.image")}</TableHead>
                    <TableHead>{t("images.usedBy")}</TableHead>
                    {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pulledImages.map((img) => {
                    const users = usedByContainers(img);
                    const inUse = users.length > 0;
                    const stackImage = isProtectedStackImage(appliance, img);
                    const deleteBlocked = inUse || stackImage;
                    return (
                      <TableRow key={img}>
                        <TableCell>
                          <span className="font-mono text-sm">{img}</span>
                        </TableCell>
                        <TableCell>
                          {inUse ? (
                            <div className="flex flex-wrap gap-1">
                              {users.map((u) => (
                                <Badge key={u} variant="outline" className="font-mono text-xs">{u}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {hasWritePermission && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                title={t("images.updateImage")}
                                aria-label={t("images.updateImage")}
                                disabled={ssh.loading}
                                onClick={() => runSsh(t("images.updateImageTitle", { image: img }), () => containerService.updateImageRef(img), true)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                title={
                                  stackImage
                                    ? t("images.cannotDeleteStack")
                                    : inUse
                                      ? t("images.cannotDeleteInUse", { containers: users.join(", ") })
                                      : t("images.deleteImage")
                                }
                                aria-label={t("images.deleteImage")}
                                disabled={deleteBlocked || ssh.loading}
                                onClick={() => {
                                  setDeleteConfirm(img);
                                  setDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <AddImageModal
        key={addModalKey}
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSubmit={(ref) => runSsh(t("images.addImageTitle", { image: ref }), () => containerService.pullImage(ref), true)}
      />

      <SshOutputModal
        open={ssh.open}
        onOpenChange={(open) => { if (!open) setSsh((s) => ({ ...s, open: false })); }}
        title={ssh.title}
        loading={ssh.loading}
        success={ssh.success}
        output={ssh.output}
        error={ssh.error}
      />

      {/* The delete runs in the output dialog, which shows its result. */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("images.deleteImage")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.rich("images.deleteConfirm", {
                image: deleteConfirm ?? "",
                mono: (chunks) => <span className="font-mono font-semibold">{chunks}</span>,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const img = deleteConfirm;
                setDeleteOpen(false);
                if (img) void runSsh(t("images.deleteImageTitle", { image: img }), () => containerService.deleteImageRef(img));
              }}
            >
              {t("images.deleteImage")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {ssh.loading && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg bg-background border shadow-lg px-4 py-2 text-sm z-50">
          <Loader2 className="h-4 w-4 animate-spin" />
          {ssh.title}…
        </div>
      )}
    </>
  );
}
