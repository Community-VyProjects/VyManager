"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AlertCircle, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { isisService, type IsisCapabilities, type IsisFrrGlobal } from "@/lib/api/isis";
import {
  ISIS_SPLIT_LEVELS,
  ISIS_TIEBREAKER_INDEX,
  isisRemotePrefixListProblem,
  isisTiebreakerProblem,
} from "@/lib/api/isis-save-ops";
import type { IsisConfirm } from "./IsisConfirmDialog";
import { useIsisProblemText } from "./useIsisProblemText";

interface IsisFrrCardProps {
  frr: IsisFrrGlobal;
  capabilities: IsisCapabilities;
  prefixListNames: string[];
  canEdit: boolean;
  /** Opens the Cancel / Apply dialog; ``run`` commits and reloads. */
  onConfirm: (confirm: IsisConfirm) => void;
  reload: () => Promise<void>;
}

/** Global LFA controls. Each change goes through a confirm dialog that shows a failed commit. */
export function IsisFrrCard({ frr, capabilities, prefixListNames, canEdit, onConfirm, reload }: IsisFrrCardProps) {
  const t = useTranslations("isis");
  const tc = useTranslations("common");
  const problemText = useIsisProblemText();
  const priorities = capabilities.features.lfa_priority_limit.values;
  const tbTypes = capabilities.features.lfa_tiebreaker.values;

  const [plPriority, setPlPriority] = useState(priorities[0] ?? "");
  const [plLevel, setPlLevel] = useState<string>(ISIS_SPLIT_LEVELS[0]);
  const [tbType, setTbType] = useState(tbTypes[0] ?? "");
  const [tbIndex, setTbIndex] = useState("");
  const [tbLevel, setTbLevel] = useState<string>(ISIS_SPLIT_LEVELS[0]);
  const [rplName, setRplName] = useState("");
  const [rplLevel, setRplLevel] = useState<string>(ISIS_SPLIT_LEVELS[0]);
  const [error, setError] = useState<string | null>(null);

  const ask = (description: string, confirmLabel: string, commit: () => Promise<unknown>, destructive = false) => {
    setError(null);
    onConfirm({
      title: t("confirm.title"),
      description,
      confirmLabel,
      destructive,
      run: async () => {
        await commit();
        await reload();
      },
    });
  };

  const levelSelect = (id: string, value: string, onChange: (v: string) => void) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="h-8 w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ISIS_SPLIT_LEVELS.map((l) => (
          <SelectItem key={l} value={l}>{l}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const removeButton = (onClick: () => void) =>
    canEdit && (
      <button type="button" aria-label={tc("delete")} onClick={onClick} className="ml-1 hover:text-destructive">
        <X className="h-3 w-3" />
      </button>
    );

  const loadSharing = [
    { level: "level-1", id: "isis-lfa-ls-l1", label: t("advanced.disableLoadSharingL1"), on: frr.lfa_load_sharing_disable_level1 },
    { level: "level-2", id: "isis-lfa-ls-l2", label: t("advanced.disableLoadSharingL2"), on: frr.lfa_load_sharing_disable_level2 },
  ];

  return (
    <Card className="col-span-2">
      <CardContent className="p-6 space-y-4">
        <h3 className="font-semibold">{t("advanced.fastRerouteLfa")}</h3>

        {error && (
          <div className="p-2 rounded-md bg-destructive/10 text-destructive text-xs flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          {loadSharing.map(({ level, id, label, on }) => (
            <div key={id} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={on}
                disabled={!canEdit}
                onCheckedChange={(v) =>
                  ask(
                    t(v === true ? "confirm.loadSharingDisable" : "confirm.loadSharingEnable", { level }),
                    t("confirm.apply"),
                    () => isisService.setFrrLoadSharingDisable(level, v === true),
                  )
                }
              />
              <Label htmlFor={id}>{label}</Label>
            </div>
          ))}
        </div>

        {capabilities.features.lfa_priority_limit.supported && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">{t("advanced.priorityLimit")}</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {frr.lfa_priority_limit.map((e, idx) => (
                <span key={idx} className="flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-md font-mono">
                  {e.priority} {e.level}
                  {removeButton(() => ask(
                    t("confirm.removePriorityLimit", { name: e.priority, level: e.level }),
                    t("delete.remove"),
                    () => isisService.deleteFrrPriorityLimit(e.priority, e.level),
                    true,
                  ))}
                </span>
              ))}
            </div>
            {canEdit && (
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1">
                  <Label htmlFor="isis-pl-priority" className="text-xs">{t("advanced.priorityLimit")}</Label>
                  <Select value={plPriority} onValueChange={setPlPriority}>
                    <SelectTrigger id="isis-pl-priority" className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="isis-pl-level" className="text-xs">{t("fields.level")}</Label>
                  {levelSelect("isis-pl-level", plLevel, setPlLevel)}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!plPriority}
                  onClick={() => ask(
                    t("confirm.addPriorityLimit", { name: plPriority, level: plLevel }),
                    t("confirm.apply"),
                    () => isisService.addFrrPriorityLimit(plPriority, plLevel),
                  )}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {tc("add")}
                </Button>
              </div>
            )}
          </div>
        )}

        {capabilities.features.lfa_tiebreaker.supported && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">{t("advanced.tiebreaker")}</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {frr.lfa_tiebreaker.map((e, idx) => (
                <span key={idx} className="flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-md font-mono">
                  {e.tb_type} {e.index} {e.level}
                  {removeButton(() => ask(
                    t("confirm.removeTiebreaker", { name: e.tb_type, index: e.index, level: e.level }),
                    t("delete.remove"),
                    () => isisService.deleteFrrTiebreaker(e.tb_type, e.index, e.level),
                    true,
                  ))}
                </span>
              ))}
            </div>
            {canEdit && (
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1">
                  <Label htmlFor="isis-tb-type" className="text-xs">{t("advanced.type")}</Label>
                  <Select value={tbType} onValueChange={setTbType}>
                    <SelectTrigger id="isis-tb-type" className="h-8 w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tbTypes.map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="isis-tb-index" className="text-xs">{t("advanced.index")}</Label>
                  <Input
                    id="isis-tb-index"
                    type="number"
                    className="h-8 w-24"
                    value={tbIndex}
                    min={ISIS_TIEBREAKER_INDEX.min}
                    max={ISIS_TIEBREAKER_INDEX.max}
                    onChange={(e) => setTbIndex(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="isis-tb-level" className="text-xs">{t("fields.level")}</Label>
                  {levelSelect("isis-tb-level", tbLevel, setTbLevel)}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!tbType}
                  onClick={() => {
                    const problem = isisTiebreakerProblem(frr.lfa_tiebreaker, tbType, tbIndex, tbLevel);
                    if (problem) {
                      setError(problemText(problem));
                      return;
                    }
                    const index = tbIndex.trim();
                    ask(
                      t("confirm.addTiebreaker", { name: tbType, index, level: tbLevel }),
                      t("confirm.apply"),
                      () => isisService.addFrrTiebreaker(tbType, index, tbLevel),
                    );
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {tc("add")}
                </Button>
              </div>
            )}
          </div>
        )}

        {capabilities.features.lfa_remote_prefix_list.supported && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">{t("advanced.remotePrefixList")}</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {frr.lfa_remote_prefix_list.map((e, idx) => (
                <span key={idx} className="flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-md font-mono">
                  {e.prefix_list} {e.level}
                  {removeButton(() => ask(
                    t("confirm.removeRemotePrefixList", { name: e.prefix_list, level: e.level }),
                    t("delete.remove"),
                    () => isisService.deleteFrrRemotePrefixList(e.prefix_list, e.level),
                    true,
                  ))}
                </span>
              ))}
            </div>
            {canEdit && (
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1 w-48">
                  <Label htmlFor="isis-rpl-name" className="text-xs">{t("advanced.prefixList")}</Label>
                  <NamedListSelect id="isis-rpl-name" value={rplName} names={prefixListNames} onValueChange={setRplName} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="isis-rpl-level" className="text-xs">{t("fields.level")}</Label>
                  {levelSelect("isis-rpl-level", rplLevel, setRplLevel)}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const problem = isisRemotePrefixListProblem(rplName);
                    if (problem) {
                      setError(problemText(problem));
                      return;
                    }
                    ask(
                      t("confirm.addRemotePrefixList", { name: rplName, level: rplLevel }),
                      t("confirm.apply"),
                      () => isisService.addFrrRemotePrefixList(rplName, rplLevel),
                    );
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {tc("add")}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
