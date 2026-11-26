"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import type { Pim6Capabilities, Pim6Interface, Pim6MldJoin, Pim6RangeKey } from "@/lib/api/pim6";
import { pimProblemArgs, pimRange, pimText } from "@/lib/api/pim-save-ops";
import {
  pim6InterfaceProblem,
  pim6JoinSourcesWithDraft,
  pim6JoinsWithDraft,
  type Pim6InterfaceDraft,
  type Pim6Problem,
} from "@/lib/api/pim6-save-ops";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { NONE_SENTINEL } from "@/lib/named-list-select-options";
import type { ApiError } from "@/lib/types/api";

interface Pim6InterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (iface: Pim6InterfaceDraft) => Promise<void>;
  existingInterface?: Pim6Interface | null;
  /** Interfaces that already have a PIMv6 node; Add offers only the others. */
  configuredInterfaces: string[];
  capabilities: Pick<Pim6Capabilities, "ranges"> | null;
}

const str = (value: number | string | null | undefined) => pimText(value);

// Problems whose field sits on the MLD tab; every other problem is on the PIMv6 tab.
const MLD_PROBLEMS: ReadonlySet<Pim6Problem["key"]> = new Set<Pim6Problem["key"]>([
  "mldIntervalRange",
  "lastMemberQueryCountRange",
  "mldVersionRange",
  "joinGroupInvalid",
  "joinExists",
  "joinSourceInvalid",
  "joinSourceExists",
]);

/** The modal tab that holds the field a problem is about. */
export function pim6ProblemTab(problem: Pim6Problem): "pim6" | "mld" {
  return MLD_PROBLEMS.has(problem.key) ? "mld" : "pim6";
}

/** Seeded from props on mount; the page remounts it with a new key on every open. */
export function Pim6InterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
  configuredInterfaces,
  capabilities,
}: Pim6InterfaceModalProps) {
  const t = useTranslations("pim6");
  const tc = useTranslations("common");
  const isEditMode = !!existingInterface;
  const existing = existingInterface ?? null;
  const mld = existing?.mld ?? null;

  // PIMv6 form state
  const [name, setName] = useState(existing?.name ?? "");
  const [drPriority, setDrPriority] = useState(str(existing?.dr_priority));
  const [hello, setHello] = useState(str(existing?.hello));
  const [passive, setPassive] = useState(existing?.passive ?? false);
  const [noBsm, setNoBsm] = useState(existing?.no_bsm ?? false);
  const [noUnicastBsm, setNoUnicastBsm] = useState(existing?.no_unicast_bsm ?? false);

  // MLD form state
  const [mldEnabled, setMldEnabled] = useState(mld !== null);
  const [mldDisabled, setMldDisabled] = useState(mld?.disabled ?? false);
  const [mldInterval, setMldInterval] = useState(str(mld?.interval));
  const [mldLastMemberQueryCount, setMldLastMemberQueryCount] = useState(str(mld?.last_member_query_count));
  // No value for these two can commit on VyOS (READ_ONLY_MLD_LEAVES): a loaded one is shown read-only and can be removed.
  const loadedLmqi = str(mld?.last_member_query_interval);
  const loadedMaxResponse = str(mld?.max_response_time);
  const [removeLmqi, setRemoveLmqi] = useState(false);
  const [removeMaxResponse, setRemoveMaxResponse] = useState(false);
  const [mldVersion, setMldVersion] = useState(str(mld?.version));
  const [mldJoins, setMldJoins] = useState<Pim6MldJoin[]>(
    mld?.joins.map((j) => ({ group: j.group, sources: [...j.sources] })) ?? [],
  );
  const [newJoinGroup, setNewJoinGroup] = useState("");
  // Typed source address per join row (by row index).
  const [sourceDrafts, setSourceDrafts] = useState<Record<number, string>>({});

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pim6");

  const rangeText = (key: Pim6RangeKey) => {
    const range = pimRange(capabilities, key);
    return range ? `${range.min}-${range.max}` : "";
  };

  const problemText = (problem: Pim6Problem) => t(`validation.${problem.key}`, pimProblemArgs(problem));

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  // MLD join management (draft edits, saved with the form)
  const handleAddJoin = () => {
    if (loading) return;
    const { joins, problem } = pim6JoinsWithDraft(mldJoins, newJoinGroup);
    if (problem) {
      setError(problemText(problem));
      return;
    }
    setMldJoins(joins);
    setNewJoinGroup("");
    setError(null);
  };

  const handleRemoveJoin = (index: number) => {
    if (loading) return;
    setMldJoins(mldJoins.filter((_, i) => i !== index));
    // Row drafts follow their row.
    setSourceDrafts((prev) => {
      const next: Record<number, string> = {};
      for (const [key, value] of Object.entries(prev)) {
        const i = Number(key);
        if (i < index) next[i] = value;
        else if (i > index) next[i - 1] = value;
      }
      return next;
    });
  };

  const handleAddJoinSource = (joinIndex: number) => {
    if (loading) return;
    const { join, problem } = pim6JoinSourcesWithDraft(mldJoins[joinIndex], sourceDrafts[joinIndex] ?? "");
    if (problem) {
      setError(problemText(problem));
      return;
    }
    setMldJoins(mldJoins.map((j, i) => (i === joinIndex ? join : j)));
    setSourceDrafts((prev) => ({ ...prev, [joinIndex]: "" }));
    setError(null);
  };

  const handleRemoveJoinSource = (joinIndex: number, sourceIndex: number) => {
    if (loading) return;
    setMldJoins(mldJoins.map((j, i) => (
      i === joinIndex ? { ...j, sources: j.sources.filter((_, s) => s !== sourceIndex) } : j
    )));
  };

  /** The joins with every typed-but-not-added value folded in, or the keyed problem. */
  const foldJoinDrafts = (): { joins: Pim6MldJoin[]; problem: Pim6Problem | null } => {
    let joins: Pim6MldJoin[] = [];
    for (const [index, join] of mldJoins.entries()) {
      const folded = pim6JoinSourcesWithDraft(join, sourceDrafts[index] ?? "");
      if (folded.problem) return { joins: mldJoins, problem: folded.problem };
      joins = [...joins, folded.join];
    }
    return pim6JoinsWithDraft(joins, newJoinGroup);
  };

  const handleSubmit = async () => {
    const folded = mldEnabled ? foldJoinDrafts() : { joins: mldJoins, problem: null };
    if (folded.problem) {
      setActiveTab(pim6ProblemTab(folded.problem));
      setError(problemText(folded.problem));
      return;
    }
    const iface: Pim6InterfaceDraft = {
      name,
      dr_priority: drPriority,
      hello,
      no_bsm: noBsm,
      no_unicast_bsm: noUnicastBsm,
      passive,
      mld: mldEnabled
        ? {
            disabled: mldDisabled,
            interval: mldInterval,
            last_member_query_count: mldLastMemberQueryCount,
            last_member_query_interval: removeLmqi ? "" : loadedLmqi,
            max_response_time: removeMaxResponse ? "" : loadedMaxResponse,
            version: mldVersion,
            joins: folded.joins,
          }
        : null,
    };
    const problem = pim6InterfaceProblem(existing, iface, capabilities, configuredInterfaces);
    if (problem) {
      setActiveTab(pim6ProblemTab(problem));
      setError(problemText(problem));
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setMldJoins(folded.joins);
      setNewJoinGroup("");
      setSourceDrafts({});
      await onSubmit(iface);
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const mldOff = loading || !mldEnabled;

  const numberInput = (id: string, label: string, value: string, onChange: (v: string) => void,
    key: Pim6RangeKey, disabled: boolean) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={rangeText(key)}
      />
    </div>
  );

  const readOnlyLeaf = (id: string, text: string, removeLabel: string, removed: boolean, setRemoved: (v: boolean) => void) => (
    <div className="space-y-2">
      <p className="text-sm font-mono">{text}</p>
      <div className="flex items-center space-x-2">
        <Checkbox id={id} checked={removed} disabled={mldOff} onCheckedChange={(c) => setRemoved(c === true)} />
        <Label htmlFor={id} className="text-sm font-normal cursor-pointer">{removeLabel}</Label>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("interfaceModal.editTitle") : t("interfaceModal.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("interfaceModal.editDescription", { name: existing?.name ?? "" })
              : t("interfaceModal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pim6">{t("interfaceModal.tabPim6")}</TabsTrigger>
            <TabsTrigger value="mld">{t("interfaceModal.tabMld")}</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0 pr-4 mt-2">
            {/* PIMv6 Settings Tab */}
            <TabsContent value="pim6" className="mt-0">
              <div className="space-y-5 pb-2">
                {/* Interface Name */}
                <div className="space-y-2">
                  <Label htmlFor="pim6-iface-name">{t("interfaceModal.interface")}</Label>
                  <InterfaceSelect
                    id="pim6-iface-name"
                    value={name}
                    onValueChange={setName}
                    disabled={isEditMode || loading}
                    className={isEditMode ? "bg-muted" : ""}
                    placeholder={tc("selectInterface")}
                    filter={(item) => isEditMode || !configuredInterfaces.includes(item.name)}
                  />
                </div>

                {numberInput("pim6-dr-priority", t("interfaceModal.drPriority"), drPriority, setDrPriority, "dr_priority", loading)}
                {numberInput("pim6-hello", t("interfaceModal.helloInterval"), hello, setHello, "hello", loading)}

                {/* Flags */}
                <div className="space-y-3">
                  <Label>{t("interfaceModal.flags")}</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="pim6-passive" checked={passive} disabled={loading} onCheckedChange={(c) => setPassive(!!c)} />
                      <Label htmlFor="pim6-passive">{t("interfaceModal.passive")}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="pim6-no-bsm" checked={noBsm} disabled={loading} onCheckedChange={(c) => setNoBsm(!!c)} />
                      <Label htmlFor="pim6-no-bsm">{t("interfaceModal.noBsm")}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pim6-no-unicast-bsm"
                        checked={noUnicastBsm}
                        disabled={loading}
                        onCheckedChange={(c) => setNoUnicastBsm(!!c)}
                      />
                      <Label htmlFor="pim6-no-unicast-bsm">{t("interfaceModal.noUnicastBsm")}</Label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* MLD Settings Tab */}
            <TabsContent value="mld" className="mt-0">
              <div className="space-y-5 pb-2">
                {/* MLD node */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mld-enable"
                    checked={mldEnabled}
                    disabled={loading}
                    onCheckedChange={(c) => setMldEnabled(!!c)}
                  />
                  <Label htmlFor="mld-enable">{t("interfaceModal.enableMld")}</Label>
                </div>

                {/* Disable MLD */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mld-disable"
                    checked={mldDisabled}
                    disabled={mldOff}
                    onCheckedChange={(c) => setMldDisabled(!!c)}
                  />
                  <Label htmlFor="mld-disable">{t("interfaceModal.disableMld")}</Label>
                </div>

                {/* MLD Version */}
                <div className="space-y-2">
                  <Label htmlFor="mld-version">{t("interfaceModal.mldVersion")}</Label>
                  <Select
                    value={mldVersion || NONE_SENTINEL}
                    onValueChange={(v) => setMldVersion(v === NONE_SENTINEL ? "" : v)}
                    disabled={mldOff}
                  >
                    <SelectTrigger id="mld-version">
                      <SelectValue placeholder={tc("default")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
                      <SelectItem value="1">{t("interfaceModal.version", { version: "1" })}</SelectItem>
                      <SelectItem value="2">{t("interfaceModal.version", { version: "2" })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {numberInput("mld-interval", t("interfaceModal.queryInterval"), mldInterval, setMldInterval,
                    "mld_interval", mldOff)}
                  {numberInput("mld-lmqc", t("interfaceModal.lastMemberQueryCount"), mldLastMemberQueryCount,
                    setMldLastMemberQueryCount, "last_member_query_count", mldOff)}
                </div>

                {loadedLmqi && readOnlyLeaf("mld-lmqi-remove", t("interfaceModal.lastMemberQueryIntervalReadOnly",
                  { value: loadedLmqi }), t("interfaceModal.removeLastMemberQueryInterval"), removeLmqi, setRemoveLmqi)}
                {loadedMaxResponse && readOnlyLeaf("mld-max-response-remove", t("interfaceModal.maxResponseTimeReadOnly",
                  { value: loadedMaxResponse }), t("interfaceModal.removeMaxResponseTime"), removeMaxResponse, setRemoveMaxResponse)}

                {/* MLD Joins */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="mld-join-group">{t("interfaceModal.joinGroups")}</Label>
                  </div>

                  {mldJoins.map((join, joinIndex) => (
                    <div key={joinIndex} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-medium">{join.group}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          aria-label={tc("delete")}
                          disabled={mldOff}
                          onClick={() => handleRemoveJoin(joinIndex)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Sources for this join */}
                      {join.sources.length > 0 && (
                        <div className="ml-2 space-y-1">
                          <p className="text-xs text-muted-foreground">{t("interfaceModal.sourceAddresses")}</p>
                          {join.sources.map((src, srcIndex) => (
                            <div key={srcIndex} className="flex items-center gap-2">
                              <span className="flex-1 px-2 py-1 rounded border bg-muted font-mono text-xs">{src}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                aria-label={tc("delete")}
                                disabled={mldOff}
                                onClick={() => handleRemoveJoinSource(joinIndex, srcIndex)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add source to this join */}
                      <div className="flex items-center gap-2 ml-2">
                        <Input
                          value={sourceDrafts[joinIndex] ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSourceDrafts((prev) => ({ ...prev, [joinIndex]: value }));
                            setError(null);
                          }}
                          placeholder={t("interfaceModal.addSourcePlaceholder")}
                          className="h-8 text-xs font-mono"
                          disabled={mldOff}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddJoinSource(joinIndex);
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          aria-label={tc("add")}
                          disabled={mldOff || !(sourceDrafts[joinIndex] ?? "").trim()}
                          onClick={() => handleAddJoinSource(joinIndex)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Add new join group */}
                  <div className="flex items-center gap-2">
                    <Input
                      id="mld-join-group"
                      value={newJoinGroup}
                      onChange={(e) => { setNewJoinGroup(e.target.value); setError(null); }}
                      placeholder={t("interfaceModal.groupPlaceholder")}
                      className="font-mono"
                      disabled={mldOff}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddJoin();
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      aria-label={tc("add")}
                      disabled={mldOff || !newJoinGroup.trim()}
                      onClick={handleAddJoin}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? tc("saving") : t("adding")}
              </>
            ) : isEditMode ? (
              tc("saveChanges")
            ) : (
              tc("addInterface")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
