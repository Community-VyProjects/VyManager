"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Plus, Trash2, Variable } from "lucide-react";
import {
  templatesService,
  type ConfigTemplate,
  type TemplateCategory,
  type TemplateVariable,
  type CreateTemplateRequest,
  TEMPLATE_CATEGORIES,
} from "@/lib/api/templates";

interface TemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ConfigTemplate | null;
  onSuccess: () => void;
}

export function TemplateModal({
  open,
  onOpenChange,
  template,
  onSuccess,
}: TemplateModalProps) {
  const isEditing = !!template;

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("OTHER");
  const [configJson, setConfigJson] = useState("{}");
  const [isPublic, setIsPublic] = useState(false);
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when opening/closing or when template changes
  useEffect(() => {
    if (open) {
      if (template) {
        setName(template.name);
        setDescription(template.description || "");
        setCategory(template.category);
        setConfigJson(JSON.stringify(template.config, null, 2));
        setIsPublic(template.isPublic);
        setVariables(template.variables || []);
      } else {
        setName("");
        setDescription("");
        setCategory("OTHER");
        setConfigJson("{}");
        setIsPublic(false);
        setVariables([]);
      }
      setError(null);
    }
  }, [open, template]);

  const addVariable = () => {
    setVariables([
      ...variables,
      { name: "", description: "", default_value: "", required: true },
    ]);
  };

  const updateVariable = (
    index: number,
    field: keyof TemplateVariable,
    value: string | boolean
  ) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: value };
    setVariables(updated);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Validate
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    let configObj: Record<string, unknown>;
    try {
      configObj = JSON.parse(configJson);
    } catch {
      setError("Invalid JSON in configuration");
      return;
    }

    // Validate variables have names
    const invalidVars = variables.filter((v) => !v.name.trim());
    if (invalidVars.length > 0) {
      setError("All variables must have a name");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data: CreateTemplateRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        config: configObj,
        variables: variables.length > 0 ? variables : undefined,
        isPublic,
      };

      if (isEditing && template) {
        await templatesService.updateTemplate(template.id, data);
      } else {
        await templatesService.createTemplate(data);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Template" : "Create New Template"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the template configuration"
              : "Create a reusable configuration template"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Basic Firewall Setup"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEMPLATE_CATEGORIES).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template does..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
            <Label htmlFor="public">Make this template public (visible to all users)</Label>
          </div>

          {/* Configuration JSON */}
          <div className="space-y-2">
            <Label htmlFor="config">Configuration (JSON) *</Label>
            <Textarea
              id="config"
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              placeholder='{"set_commands": ["set firewall name WAN default-action drop"]}'
              className="font-mono text-sm"
              rows={8}
            />
            <p className="text-xs text-muted-foreground">
              Use {"${VARIABLE_NAME}"} syntax for variables that will be substituted when applying.
            </p>
          </div>

          {/* Variables */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Variable className="h-4 w-4" />
                  Template Variables
                </span>
                <Button variant="outline" size="sm" onClick={addVariable}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Variable
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {variables.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No variables defined. Variables allow users to customize the template when applying.
                </p>
              ) : (
                variables.map((variable, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={variable.name}
                        onChange={(e) => updateVariable(index, "name", e.target.value)}
                        placeholder="VARIABLE_NAME"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={variable.description || ""}
                        onChange={(e) => updateVariable(index, "description", e.target.value)}
                        placeholder="What this variable is for"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Default</Label>
                      <Input
                        value={variable.default_value || ""}
                        onChange={(e) => updateVariable(index, "default_value", e.target.value)}
                        placeholder="Default value"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Switch
                        checked={variable.required}
                        onCheckedChange={(v) => updateVariable(index, "required", v)}
                      />
                      <Label className="text-xs">Required</Label>
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariable(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              "Update Template"
            ) : (
              "Create Template"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
