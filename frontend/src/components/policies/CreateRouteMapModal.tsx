"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { routeMapService, type RouteMapCapabilities } from "@/lib/api/route-map";
import {
  descriptionMaxLength,
  emptyRuleForm,
  routeMapProblem,
  routeMapRuleProblem,
  ruleActions,
  type RouteMapForm,
  type RouteMapRuleForm,
} from "@/lib/api/route-map-save-ops";
import type { ApiError } from "@/lib/types/api";
import { RouteMapRuleFields } from "./RouteMapRuleFields";
import {
  problemTab,
  ruleProblemArgs,
  suggestedRuleNumber,
  type RouteMapPickers,
  type RouteMapRuleTab,
} from "./route-map-rule-form";

interface CreateRouteMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** Route-maps already configured (a new one may not reuse a name). */
  existingNames: string[];
  capabilities: RouteMapCapabilities | null;
  pickers: RouteMapPickers;
  /** One message per picker list the page could not load. */
  pickerErrors: string[];
}

/**
 * Create a route-map and its first rule. With a description, the route-map
 * commit (route-map ops take no rule number) runs first; when the rule commit
 * then fails, the route-map stays created and a retry sends only the rule.
 * Without one, the rule commit alone creates the route-map (`set_rule`).
 */
export function CreateRouteMapModal({
  open,
  onOpenChange,
  onSuccess,
  existingNames,
  capabilities,
  pickers,
  pickerErrors,
}: CreateRouteMapModalProps) {
  const t = useTranslations("routeMap");
  const tl = useTranslations("routeMap.mapErrors");
  const tr = useTranslations("routeMapRuleModal.errors");
  const tf = useTranslations("routeMapRuleModal");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"map" | "rule">("map");
  const [ruleTab, setRuleTab] = useState<RouteMapRuleTab>("basic");
  const [mapForm, setMapForm] = useState<RouteMapForm>({ name: "", description: "" });
  const [ruleForm, setRuleForm] = useState<RouteMapRuleForm>(() =>
    emptyRuleForm(suggestedRuleNumber([], capabilities), ruleActions(capabilities)[0]),
  );
  /** The route-map name once its commit succeeded. */
  const [created, setCreated] = useState<string | null>(null);
  const name = created ?? mapForm.name.trim();

  const handleSubmit = async () => {
    const mapProblem = routeMapProblem(mapForm, created ? null : existingNames, capabilities);
    if (mapProblem) {
      setError(tl(mapProblem.key, { max: mapProblem.max ?? "" }));
      setStep("map");
      return;
    }
    const ruleProblem = routeMapRuleProblem(null, ruleForm, capabilities, []);
    if (ruleProblem) {
      setError(tr(ruleProblem.key, ruleProblemArgs(ruleProblem)));
      setStep("rule");
      setRuleTab(problemTab(ruleProblem.key));
      return;
    }
    setLoading(true);
    setError(null);
    // The route-map commit may succeed in this call; `created` is the value at the click.
    let mapCreated = created !== null;
    try {
      if (!created && mapForm.description.trim()) {
        await routeMapService.createRouteMap(mapForm);
        mapCreated = true;
        setCreated(name);
      }
      await routeMapService.saveRule(name, Number(ruleForm.rule_number.trim()), null, ruleForm, capabilities);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || (mapCreated ? t("create.ruleFailed") : t("create.failed")));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
    // A route-map committed without its rule is on the device: show it.
    if (!next && created) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("page.createRouteMap")}</DialogTitle>
          <DialogDescription>{t("create.description")}</DialogDescription>
        </DialogHeader>

        {pickerErrors.map((message) => (
          <p key={message} className="text-sm text-destructive whitespace-pre-wrap">
            {message}
          </p>
        ))}

        <Tabs value={step} onValueChange={(v) => setStep(v as "map" | "rule")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="map">{t("create.routeMapStep")}</TabsTrigger>
            <TabsTrigger value="rule">{t("create.firstRuleStep")}</TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="mt-4">
            <fieldset disabled={loading || created !== null} className="space-y-4 min-w-0">
              <div className="space-y-2">
                <Label htmlFor="route-map-create-name">{tc("name")}</Label>
                <Input
                  id="route-map-create-name"
                  value={mapForm.name}
                  onChange={(e) => setMapForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={tf("example", { value: "RM-IN" })}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="route-map-create-description">{tc("description")}</Label>
                <Input
                  id="route-map-create-description"
                  value={mapForm.description}
                  maxLength={descriptionMaxLength(capabilities)}
                  onChange={(e) => setMapForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </fieldset>
          </TabsContent>

          <TabsContent value="rule" className="mt-4">
            <RouteMapRuleFields
              idPrefix="route-map-create"
              form={ruleForm}
              onChange={setRuleForm}
              ruleNumberLocked={false}
              disabled={loading}
              capabilities={capabilities}
              pickers={{ ...pickers, routeMaps: pickers.routeMaps.filter((n) => n !== name) }}
              tab={ruleTab}
              onTabChange={setRuleTab}
            />
          </TabsContent>
        </Tabs>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? tc("creating") : t("page.createRouteMap")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
