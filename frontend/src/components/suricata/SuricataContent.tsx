"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { requestError, suricataService, type SuricataCapabilities } from "@/lib/api/suricata";
import { showService, type InterfaceName } from "@/lib/api/show";
import {
  blockers,
  cloneConfig,
  configsEqual,
  editorDraft,
  emptyConfig,
  type SuricataConfig,
} from "@/lib/suricata-model";
import { SuricataEditor } from "./SuricataEditor";
import { SuricataSetup } from "./SuricataSetup";

export function SuricataContent() {
  const { canWrite } = usePermissions();
  const hasWrite = canWrite(FeatureGroup.SURICATA);
  const searchParams = useSearchParams();

  const [capabilities, setCapabilities] = useState<SuricataCapabilities | null>(null);
  const [original, setOriginal] = useState<SuricataConfig | null>(null);
  const [draft, setDraft] = useState<SuricataConfig | null>(null);
  const [interfaces, setInterfaces] = useState<InterfaceName[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmRefresh, setConfirmRefresh] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const [caps, cfg, ifaces] = await Promise.all([
        suricataService.getCapabilities(),
        suricataService.getConfig(refresh),
        showService.getAllInterfaces().catch(() => ({ interfaces: [] as InterfaceName[] })),
      ]);
      setCapabilities(caps);
      setOriginal(cfg);
      setDraft(editorDraft(cfg));
      setInterfaces(ifaces.interfaces);
    } catch (err) {
      setError(requestError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    const section = searchParams.get("section");
    if (!section || loading) return;
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchParams, loading, original]);

  async function save(next: SuricataConfig, base: SuricataConfig) {
    const reasons = blockers(next);
    if (reasons.length > 0) {
      setError(reasons[0]);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await suricataService.save(base, next);
      await load(true);
    } catch (err) {
      setError(requestError(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError(null);
    setConfirmRemove(false);
    try {
      await suricataService.remove();
      await load(true);
    } catch (err) {
      setError(requestError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !original) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !original) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => void load(true)}>Retry</Button>
      </div>
    );
  }

  const supported = capabilities?.features.suricata.supported ?? false;
  const dirty = original && draft ? !configsEqual(original, draft) : false;
  const saveBlocked = draft ? blockers(draft) : [];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-6 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Suricata</h1>
                {!hasWrite ? <Badge variant="secondary">Read only</Badge> : null}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Inspect traffic and record matches. Tell Suricata which addresses are yours, then download rules.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {supported && original?.configured && hasWrite && dirty ? (
              <Button
                size="sm"
                disabled={saving || saveBlocked.length > 0}
                onClick={() => draft && original && save(draft, original)}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            ) : null}
            {supported && original?.configured && hasWrite && dirty ? (
              <Button size="sm" variant="outline" disabled={saving} onClick={() => original && setDraft(editorDraft(cloneConfig(original)))}>
                Discard
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (dirty) setConfirmRefresh(true);
                else void load(true);
              }}
              disabled={saving}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
        {dirty && saveBlocked.length > 0 ? (
          <p className="mt-3 text-sm text-destructive">{saveBlocked[0]}</p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-destructive whitespace-pre-wrap">{error}</p> : null}
      </div>

      <div className="flex-1 space-y-6 overflow-auto p-6">
        {!supported ? (
          <div className="mx-auto max-w-2xl rounded-md border p-6">
            <h2 className="text-lg font-semibold">This device does not include Suricata</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Intrusion detection is not available on the connected router. Switch to a device that includes it to configure watched interfaces, your network, and logging.
            </p>
          </div>
        ) : !original?.configured ? (
          <SuricataSetup
            interfaces={interfaces}
            hasWrite={hasWrite}
            saving={saving}
            onSave={(config) => void save(config, emptyConfig())}
          />
        ) : draft ? (
          <>
            <SuricataEditor
              draft={draft}
              onChange={setDraft}
              interfaces={interfaces}
              hasWrite={hasWrite}
              saving={saving}
            />
            {hasWrite ? (
              <div className="border-t pt-6">
                <Button type="button" variant="outline" disabled={saving} onClick={() => setConfirmRemove(true)}>
                  Remove Suricata
                </Button>
                <p className="mt-2 text-sm text-muted-foreground">
                  Stops inspection and deletes the interfaces, groups, and logging configured here. Downloaded rules are left on the router.
                </p>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Suricata?</AlertDialogTitle>
            <AlertDialogDescription>
              The router will stop inspecting traffic. This does not delete rules that were already downloaded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmRefresh} onOpenChange={setConfirmRefresh}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Refresh reloads Suricata from the router and drops the edits on this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmRefresh(false); void load(true); }}>
              Refresh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
