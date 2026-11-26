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
import type { PimCapabilities, PimIgmpJoin, PimInterface } from "@/lib/api/pim";
import {
  pimInterfaceProblem,
  pimJoinSourcesWithDraft,
  pimJoinsWithDraft,
  pimProblemArgs,
  pimRange,
  pimText,
  type PimInterfaceDraft,
  type PimProblem,
} from "@/lib/api/pim-save-ops";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { NONE_SENTINEL } from "@/lib/named-list-select-options";
import type { ApiError } from "@/lib/types/api";

interface PimInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (iface: PimInterfaceDraft) => Promise<void>;
  existingInterface?: PimInterface | null;
  /** Interfaces that already have a PIM node; Add offers only the others. */
  configuredInterfaces: string[];
  /** `protocols bfd profile` names for the BFD profile picker. */
  bfdProfileNames: string[];
  capabilities: Pick<PimCapabilities, "ranges"> | null;
}

const str = (value: number | string | null | undefined) => pimText(value);

// Problems whose field sits on the IGMP tab; every other problem is on the PIM tab.
const IGMP_PROBLEMS: ReadonlySet<PimProblem["key"]> = new Set<PimProblem["key"]>([
  "queryIntervalRange",
  "queryMaxResponseRange",
  "igmpVersionRange",
  "joinGroupInvalid",
  "joinGroupReserved",
  "joinExists",
  "joinSourceInvalid",
  "joinSourceExists",
]);

/** The modal tab that holds the field a problem is about. */
export function pimProblemTab(problem: PimProblem): "pim" | "igmp" {
  return IGMP_PROBLEMS.has(problem.key) ? "igmp" : "pim";
}

/** Seeded from props on mount; the page remounts it with a new key on every open. */
export function PimInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
  configuredInterfaces,
  bfdProfileNames,
  capabilities,
}: PimInterfaceModalProps) {
  const t = useTranslations("pim");
  const tc = useTranslations("common");
  const isEditMode = !!existingInterface;
  const existing = existingInterface ?? null;
  const igmp = existing?.igmp ?? null;

  // PIM form state
  const [name, setName] = useState(existing?.name ?? "");
  const [bfd, setBfd] = useState(existing?.bfd ?? false);
  const [bfdProfile, setBfdProfile] = useState(existing?.bfd_profile ?? "");
  const [drPriority, setDrPriority] = useState(str(existing?.dr_priority));
  const [hello, setHello] = useState(str(existing?.hello));
  const [sourceAddress, setSourceAddress] = useState(existing?.source_address ?? "");
  const [passive, setPassive] = useState(existing?.passive ?? false);
  const [noBsm, setNoBsm] = useState(existing?.no_bsm ?? false);
  const [noUnicastBsm, setNoUnicastBsm] = useState(existing?.no_unicast_bsm ?? false);

  // IGMP form state
  const [igmpEnabled, setIgmpEnabled] = useState(igmp !== null);
  const [igmpDisabled, setIgmpDisabled] = useState(igmp?.disabled ?? false);
  const [igmpQueryInterval, setIgmpQueryInterval] = useState(str(igmp?.query_interval));
  const [igmpQueryMaxResponseTime, setIgmpQueryMaxResponseTime] = useState(str(igmp?.query_max_response_time));
  const [igmpVersion, setIgmpVersion] = useState(str(igmp?.version));
  const [igmpJoins, setIgmpJoins] = useState<PimIgmpJoin[]>(
    igmp?.joins.map((j) => ({ group: j.group, source_addresses: [...j.source_addresses] })) ?? [],
  );
  const [newJoinGroup, setNewJoinGroup] = useState("");
  // Typed source address per join row (by row index).
  const [sourceDrafts, setSourceDrafts] = useState<Record<number, string>>({});

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pim");

  const drRange = pimRange(capabilities, "dr_priority");
  const helloRange = pimRange(capabilities, "hello");
  const queryRange = pimRange(capabilities, "query_interval");
  const maxResponseRange = pimRange(capabilities, "query_max_response_time");
  const rangeText = (range: { min: number; max: number } | null) => (range ? `${range.min}-${range.max}` : "");

  const problemText = (problem: PimProblem) => t(`validation.${problem.key}`, pimProblemArgs(problem));

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  // IGMP join management (draft edits, saved with the form)
  const handleAddJoin = () => {
    if (loading) return;
    const { joins, problem } = pimJoinsWithDraft(igmpJoins, newJoinGroup);
    if (problem) {
      setError(problemText(problem));
      return;
    }
    setIgmpJoins(joins);
    setNewJoinGroup("");
    setError(null);
  };

  const handleRemoveJoin = (index: number) => {
    if (loading) return;
    setIgmpJoins(igmpJoins.filter((_, i) => i !== index));
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
    const { join, problem } = pimJoinSourcesWithDraft(igmpJoins[joinIndex], sourceDrafts[joinIndex] ?? "");
    if (problem) {
      setError(problemText(problem));
      return;
    }
    setIgmpJoins(igmpJoins.map((j, i) => (i === joinIndex ? join : j)));
    setSourceDrafts((prev) => ({ ...prev, [joinIndex]: "" }));
    setError(null);
  };

  const handleRemoveJoinSource = (joinIndex: number, sourceIndex: number) => {
    if (loading) return;
    setIgmpJoins(igmpJoins.map((j, i) => (
      i === joinIndex ? { ...j, source_addresses: j.source_addresses.filter((_, s) => s !== sourceIndex) } : j
    )));
  };

  /** The joins with every typed-but-not-added value folded in, or the keyed problem. */
  const foldJoinDrafts = (): { joins: PimIgmpJoin[]; problem: PimProblem | null } => {
    let joins: PimIgmpJoin[] = [];
    for (const [index, join] of igmpJoins.entries()) {
      const folded = pimJoinSourcesWithDraft(join, sourceDrafts[index] ?? "");
      if (folded.problem) return { joins: igmpJoins, problem: folded.problem };
      joins = [...joins, folded.join];
    }
    return pimJoinsWithDraft(joins, newJoinGroup);
  };

  const handleSubmit = async () => {
    const folded = igmpEnabled ? foldJoinDrafts() : { joins: igmpJoins, problem: null };
    if (folded.problem) {
      setActiveTab(pimProblemTab(folded.problem));
      setError(problemText(folded.problem));
      return;
    }
    const iface: PimInterfaceDraft = {
      name,
      bfd,
      bfd_profile: bfd ? bfdProfile : "",
      dr_priority: drPriority,
      hello,
      no_bsm: noBsm,
      no_unicast_bsm: noUnicastBsm,
      passive,
      source_address: sourceAddress,
      igmp: igmpEnabled
        ? {
            disabled: igmpDisabled,
            joins: folded.joins,
            query_interval: igmpQueryInterval,
            query_max_response_time: igmpQueryMaxResponseTime,
            version: igmpVersion,
          }
        : null,
    };
    const problem = pimInterfaceProblem(existing, iface, capabilities, configuredInterfaces);
    if (problem) {
      setActiveTab(pimProblemTab(problem));
      setError(problemText(problem));
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setIgmpJoins(folded.joins);
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

  const igmpOff = loading || !igmpEnabled;

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
            <TabsTrigger value="pim">{t("interfaceModal.tabPim")}</TabsTrigger>
            <TabsTrigger value="igmp">{t("interfaceModal.tabIgmp")}</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0 pr-4 mt-2">
            {/* PIM Settings Tab */}
            <TabsContent value="pim" className="mt-0">
              <div className="space-y-5 pb-2">
                {/* Interface Name */}
                <div className="space-y-2">
                  <Label htmlFor="pim-iface-name">{t("interfaceModal.interface")}</Label>
                  <InterfaceSelect
                    id="pim-iface-name"
                    value={name}
                    onValueChange={setName}
                    disabled={isEditMode || loading}
                    className={isEditMode ? "bg-muted" : ""}
                    placeholder={tc("selectInterface")}
                    filter={(item) => isEditMode || !configuredInterfaces.includes(item.name)}
                  />
                </div>

                {/* BFD */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="pim-bfd" checked={bfd} disabled={loading} onCheckedChange={(c) => setBfd(!!c)} />
                    <Label htmlFor="pim-bfd">{t("interfaceModal.enableBfd")}</Label>
                  </div>
                  {bfd && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="pim-bfd-profile">{t("interfaceModal.bfdProfile")}</Label>
                      <NamedListSelect
                        id="pim-bfd-profile"
                        value={bfdProfile}
                        names={bfdProfileNames}
                        disabled={loading}
                        onValueChange={setBfdProfile}
                      />
                    </div>
                  )}
                </div>

                {/* DR Priority */}
                <div className="space-y-2">
                  <Label htmlFor="pim-dr-priority">{t("interfaceModal.drPriority")}</Label>
                  <Input
                    id="pim-dr-priority"
                    inputMode="numeric"
                    value={drPriority}
                    disabled={loading}
                    onChange={(e) => setDrPriority(e.target.value)}
                    placeholder={rangeText(drRange)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("interfaceModal.drPriorityHelp")}
                  </p>
                </div>

                {/* Hello Interval */}
                <div className="space-y-2">
                  <Label htmlFor="pim-hello">{t("interfaceModal.helloInterval")}</Label>
                  <Input
                    id="pim-hello"
                    inputMode="numeric"
                    value={hello}
                    disabled={loading}
                    onChange={(e) => setHello(e.target.value)}
                    placeholder={rangeText(helloRange)}
                  />
                </div>

                {/* Source Address */}
                <div className="space-y-2">
                  <Label htmlFor="pim-source-addr">{t("interfaceModal.sourceAddress")}</Label>
                  <Input
                    id="pim-source-addr"
                    value={sourceAddress}
                    disabled={loading}
                    onChange={(e) => setSourceAddress(e.target.value)}
                    placeholder={t("interfaceModal.sourceAddressPlaceholder")}
                    className="font-mono"
                  />
                </div>

                {/* Flags */}
                <div className="space-y-3">
                  <Label>{t("interfaceModal.flags")}</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="pim-passive" checked={passive} disabled={loading} onCheckedChange={(c) => setPassive(!!c)} />
                      <Label htmlFor="pim-passive">{t("interfaceModal.passive")}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="pim-no-bsm" checked={noBsm} disabled={loading} onCheckedChange={(c) => setNoBsm(!!c)} />
                      <Label htmlFor="pim-no-bsm">{t("interfaceModal.noBsm")}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pim-no-unicast-bsm"
                        checked={noUnicastBsm}
                        disabled={loading}
                        onCheckedChange={(c) => setNoUnicastBsm(!!c)}
                      />
                      <Label htmlFor="pim-no-unicast-bsm">{t("interfaceModal.noUnicastBsm")}</Label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* IGMP Settings Tab */}
            <TabsContent value="igmp" className="mt-0">
              <div className="space-y-5 pb-2">
                {/* IGMP node */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="igmp-enable"
                    checked={igmpEnabled}
                    disabled={loading}
                    onCheckedChange={(c) => setIgmpEnabled(!!c)}
                  />
                  <Label htmlFor="igmp-enable">{t("interfaceModal.enableIgmp")}</Label>
                </div>

                {/* Disable IGMP */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="igmp-disable"
                    checked={igmpDisabled}
                    disabled={igmpOff}
                    onCheckedChange={(c) => setIgmpDisabled(!!c)}
                  />
                  <Label htmlFor="igmp-disable">{t("interfaceModal.disableIgmp")}</Label>
                </div>

                {/* Query Interval */}
                <div className="space-y-2">
                  <Label htmlFor="igmp-query-interval">{t("interfaceModal.queryInterval")}</Label>
                  <Input
                    id="igmp-query-interval"
                    inputMode="numeric"
                    value={igmpQueryInterval}
                    disabled={igmpOff}
                    onChange={(e) => setIgmpQueryInterval(e.target.value)}
                    placeholder={rangeText(queryRange)}
                  />
                </div>

                {/* Query Max Response Time */}
                <div className="space-y-2">
                  <Label htmlFor="igmp-query-max-response">{t("interfaceModal.queryMaxResponseTime")}</Label>
                  <Input
                    id="igmp-query-max-response"
                    inputMode="numeric"
                    value={igmpQueryMaxResponseTime}
                    disabled={igmpOff}
                    onChange={(e) => setIgmpQueryMaxResponseTime(e.target.value)}
                    placeholder={rangeText(maxResponseRange)}
                  />
                </div>

                {/* IGMP Version */}
                <div className="space-y-2">
                  <Label htmlFor="igmp-version">{t("interfaceModal.igmpVersion")}</Label>
                  <Select
                    value={igmpVersion || NONE_SENTINEL}
                    onValueChange={(v) => setIgmpVersion(v === NONE_SENTINEL ? "" : v)}
                    disabled={igmpOff}
                  >
                    <SelectTrigger id="igmp-version">
                      <SelectValue placeholder={tc("default")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
                      <SelectItem value="2">{t("interfaceModal.version", { version: "2" })}</SelectItem>
                      <SelectItem value="3">{t("interfaceModal.version", { version: "3" })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* IGMP Joins */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="igmp-join-group">{t("interfaceModal.joinGroups")}</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("interfaceModal.joinGroupsHelp")}
                    </p>
                  </div>

                  {igmpJoins.map((join, joinIndex) => (
                    <div key={joinIndex} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-medium">{join.group}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          aria-label={tc("delete")}
                          disabled={igmpOff}
                          onClick={() => handleRemoveJoin(joinIndex)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Source addresses for this join */}
                      {join.source_addresses.length > 0 && (
                        <div className="ml-2 space-y-1">
                          <p className="text-xs text-muted-foreground">{t("interfaceModal.sourceAddresses")}</p>
                          {join.source_addresses.map((src, srcIndex) => (
                            <div key={srcIndex} className="flex items-center gap-2">
                              <span className="flex-1 px-2 py-1 rounded border bg-muted font-mono text-xs">{src}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                aria-label={tc("delete")}
                                disabled={igmpOff}
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
                          disabled={igmpOff}
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
                          disabled={igmpOff || !(sourceDrafts[joinIndex] ?? "").trim()}
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
                      id="igmp-join-group"
                      value={newJoinGroup}
                      onChange={(e) => { setNewJoinGroup(e.target.value); setError(null); }}
                      placeholder={t("interfaceModal.groupPlaceholder")}
                      className="font-mono"
                      disabled={igmpOff}
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
                      disabled={igmpOff || !newJoinGroup.trim()}
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
