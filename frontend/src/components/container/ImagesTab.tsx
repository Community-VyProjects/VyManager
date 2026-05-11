"use client";

import { useState, useEffect, useCallback } from "react";
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
import { ImageIcon, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { containerService, type ContainerConfig } from "@/lib/api/container";
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

export function ImagesTab({ config, hasWritePermission }: Props) {
  const [pulledImages, setPulledImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [ssh, setSsh] = useState<SshState>({ open: false, title: "", loading: false, success: null });

  const loadImages = useCallback(async () => {
    setImagesLoading(true);
    try {
      const imgs = await containerService.getImages();
      setPulledImages(imgs);
    } catch {
      setPulledImages([]);
    } finally {
      setImagesLoading(false);
    }
  }, []);

  useEffect(() => { loadImages(); }, [loadImages]);

  const runSsh = async (
    title: string,
    fn: () => Promise<{ success: boolean; output?: string | null; error?: string | null }>,
  ) => {
    setSsh({ open: true, title, loading: true, success: null });
    try {
      const result = await fn();
      setSsh({ open: true, title, loading: false, success: result.success, output: result.output, error: result.error });
      if (result.success) loadImages();
    } catch (err: unknown) {
      setSsh({ open: true, title, loading: false, success: false, error: err instanceof Error ? err.message : "Command failed" });
    }
  };

  const usedByContainers = (img: string): string[] =>
    config.containers
      .filter(c => c.image && imagesMatch(img, c.image))
      .map(c => c.name);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              Pulled Images
              {!imagesLoading && (
                <Badge variant="outline" className="font-normal">{pulledImages.length}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasWritePermission && (
                <Button size="sm" onClick={() => setAddModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />Add Image
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={loadImages} disabled={imagesLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${imagesLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {imagesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-6 py-8">
              <Loader2 className="h-4 w-4 animate-spin" />Loading…
            </div>
          ) : pulledImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">No images found on this device</p>
            </div>
          ) : (
            <ScrollArea>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Used By</TableHead>
                    {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pulledImages.map(img => {
                    const users = usedByContainers(img);
                    const inUse = users.length > 0;
                    return (
                      <TableRow key={img}>
                        <TableCell>
                          <span className="font-mono text-sm">{img}</span>
                        </TableCell>
                        <TableCell>
                          {inUse ? (
                            <div className="flex flex-wrap gap-1">
                              {users.map(u => (
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
                                title="Update image"
                                onClick={() => runSsh(`Update Image — ${img}`, () => containerService.updateImageRef(img))}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                title={inUse ? `Cannot delete: in use by ${users.join(", ")}` : "Delete image"}
                                disabled={inUse}
                                onClick={() => setDeleteConfirm(img)}
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
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSubmit={ref => runSsh(`Add Image — ${ref}`, () => containerService.pullImage(ref))}
      />

      <SshOutputModal
        open={ssh.open}
        onOpenChange={open => { if (!open) setSsh(s => ({ ...s, open: false })); }}
        title={ssh.title}
        loading={ssh.loading}
        success={ssh.success}
        output={ssh.output}
        error={ssh.error}
      />

      <AlertDialog open={deleteConfirm !== null} onOpenChange={open => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-mono font-semibold">{deleteConfirm}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const img = deleteConfirm!;
                setDeleteConfirm(null);
                runSsh(`Delete Image — ${img}`, () => containerService.deleteImageRef(img));
              }}
            >
              Delete Image
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
