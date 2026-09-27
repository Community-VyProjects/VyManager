"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import type { SquidGuardTimePeriod, TimePeriodDay, WebProxyCapabilities } from "@/lib/api/webproxy";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timePeriod: SquidGuardTimePeriod | null;
  caps: WebProxyCapabilities | null;
  existingNames: string[];
  onSubmit: (period: SquidGuardTimePeriod, isEdit: boolean) => Promise<void>;
}

const DEFAULT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "weekdays", "weekend", "all"];

export function WebProxyTimePeriodModal({ open, onOpenChange, timePeriod, caps, existingNames, onSubmit }: Props) {
  const t = useTranslations("webproxy");
  const tc = useTranslations("common");
  const isEdit = !!timePeriod;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<TimePeriodDay[]>([]);
  const [newDay, setNewDay] = useState("all");
  const [newTime, setNewTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayOptions = caps?.options.time_period_days ?? DEFAULT_DAYS;

  useEffect(() => {
    if (open) {
      setName(timePeriod?.name ?? "");
      setDescription(timePeriod?.description ?? "");
      setDays(timePeriod ? timePeriod.days.map((d) => ({ ...d })) : []);
      setNewDay("all");
      setNewTime("");
      setError(null);
    }
  }, [open, timePeriod]);

  const addDay = () => {
    if (days.some((d) => d.day === newDay)) {
      setError(t("period.dayExists", { day: newDay }));
      return;
    }
    setDays([...days, { day: newDay, time: newTime.trim() || null }]);
    setNewTime("");
    setError(null);
  };

  const removeDay = (idx: number) => setDays(days.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) {
      setError(t("period.nameRequired"));
      return;
    }
    if (!isEdit && existingNames.includes(n)) {
      setError(t("period.exists", { name: n }));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ name: n, description: description.trim() || null, days }, isEdit);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("period.editTitle", { name: timePeriod?.name ?? "" }) : t("period.addTitle")}</DialogTitle>
          <DialogDescription>{t("period.description")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5 pb-2">
            <div className="space-y-2">
              <Label htmlFor="tp-name">{tc("name")}</Label>
              <Input id="tp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="work-hours" disabled={isEdit} className={isEdit ? "bg-muted font-mono" : "font-mono"} />
              {isEdit && <p className="text-xs text-muted-foreground">{t("common.nameImmutable")}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tp-desc">{tc("description")}</Label>
              <Input id="tp-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("common.optionalDescription")} />
            </div>

            <div className="space-y-3">
              <Label>{t("content.days")}</Label>
              {days.length > 0 && (
                <div className="space-y-2">
                  {days.map((d, idx) => (
                    <div key={`${d.day}-${idx}`} className="flex items-center gap-2 rounded-md border p-2">
                      <span className="font-mono text-sm w-24">{d.day}</span>
                      <span className="font-mono text-sm flex-1 text-muted-foreground">{d.time || t("period.allDay")}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeDay(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Select value={newDay} onValueChange={setNewDay}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dayOptions.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={newTime} onChange={(e) => setNewTime(e.target.value)} placeholder={t("period.timePlaceholder")} className="flex-1 font-mono" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDay(); } }} />
                <Button type="button" variant="outline" size="icon" onClick={addDay}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("period.timeHelp")}</p>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tc("saving")}</> : isEdit ? t("common.saveChanges") : t("content.addPeriod")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
