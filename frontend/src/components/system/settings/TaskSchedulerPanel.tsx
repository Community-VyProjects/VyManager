"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { AlertCircle, Clock, Edit2, Plus, Trash2 } from "lucide-react";
import {
  systemSettingsService,
  type SystemConfig,
  type SystemCapabilities,
  type TaskSchedulerTask,
} from "@/lib/api/system-settings";
import { useToast } from "@/hooks/useToast";

interface Props {
  config: SystemConfig;
  capabilities: SystemCapabilities;
  isReadOnly: boolean;
  onRefresh: () => void;
}

export function TaskSchedulerPanel({ config, isReadOnly, onRefresh }: Props) {
  const t = useTranslations("systemSyslog");
  const tc = useTranslations("common");
  const { toast } = useToast();

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskSchedulerTask | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCron, setFormCron] = useState("");
  const [formInterval, setFormInterval] = useState("");
  const [formExecPath, setFormExecPath] = useState("");
  const [formExecArgs, setFormExecArgs] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditingTask(null);
    setFormName("");
    setFormCron("");
    setFormInterval("");
    setFormExecPath("");
    setFormExecArgs("");
    setFormError(null);
    setTaskModalOpen(true);
  };

  const openEdit = (task: TaskSchedulerTask) => {
    setEditingTask(task);
    setFormName(task.name);
    setFormCron(task.crontab_spec ?? "");
    setFormInterval(task.interval ?? "");
    setFormExecPath(task.executable_path ?? "");
    setFormExecArgs(task.executable_arguments ?? "");
    setFormError(null);
    setTaskModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { setFormError(t("scheduler.nameRequired")); return; }
    setFormSaving(true);
    setFormError(null);
    try {
      if (editingTask) {
        const result = await systemSettingsService.updateTask(formName.trim(), {
          cronSpec: formCron || null,
          clearCronSpec: !formCron,
          interval: formInterval || null,
          clearInterval: !formInterval,
          execPath: formExecPath || null,
          clearExecPath: !formExecPath,
          execArgs: formExecArgs || null,
          clearExecArgs: !formExecArgs,
        });
        if (!result.success) { setFormError(result.error ?? t("scheduler.updateFailed")); return; }
        toast.success(t("scheduler.updated"));
      } else {
        const result = await systemSettingsService.createTask(
          formName.trim(),
          formCron || null,
          formInterval || null,
          formExecPath || null,
          formExecArgs || null,
        );
        if (!result.success) { setFormError(result.error ?? t("scheduler.createFailed")); return; }
        toast.success(t("scheduler.created"));
      }
      setTaskModalOpen(false);
      onRefresh();
    } catch { setFormError(t("unexpectedError")); }
    finally { setFormSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await systemSettingsService.deleteTask(deleteTarget);
      if (!result.success) toast.error(t("deleteFailed"), result.error ?? t("scheduler.deleteFailed"));
      else { toast.success(t("scheduler.deleted")); onRefresh(); }
    } catch { toast.error(t("error"), t("unexpectedError")); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  const tasks = config.task_scheduler ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t("scheduler.title")}
              </CardTitle>
              <CardDescription>
                {t("scheduler.description")}
              </CardDescription>
            </div>
            {!isReadOnly && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />{t("scheduler.addTask")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc("name")}</TableHead>
                <TableHead>{t("scheduler.schedule")}</TableHead>
                <TableHead>{t("scheduler.executable")}</TableHead>
                <TableHead>{t("scheduler.arguments")}</TableHead>
                {!isReadOnly && <TableHead className="text-right">{tc("actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isReadOnly ? 4 : 5} className="text-center text-muted-foreground py-8">
                    {t("scheduler.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.name}>
                    <TableCell className="font-medium">{task.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {task.crontab_spec ? (
                        <span title={t("scheduler.cronExpressionTitle")}>{task.crontab_spec}</span>
                      ) : task.interval ? (
                        <span title={t("scheduler.interval")}>{task.interval}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-48 truncate">
                      {task.executable_path ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs max-w-32 truncate">
                      {task.executable_arguments ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(task)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(task.name)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      <Dialog open={taskModalOpen} onOpenChange={(o) => { if (!o) setTaskModalOpen(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? t("scheduler.editTask") : t("scheduler.addTask")}</DialogTitle>
            <DialogDescription>
              {editingTask ? t("scheduler.editingDescription", { name: editingTask.name }) : t("scheduler.createDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{formError}</pre>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("scheduler.taskName")} <span className="text-destructive">*</span></Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="backup-config"
                disabled={!!editingTask}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("scheduler.cronExpression")}</Label>
                <Input
                  value={formCron}
                  onChange={(e) => { setFormCron(e.target.value); if (e.target.value) setFormInterval(""); }}
                  placeholder="0 2 * * *"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">{t("scheduler.cronHint")}</p>
              </div>
              <div className="space-y-2">
                <Label>{t("scheduler.interval")}</Label>
                <Input
                  value={formInterval}
                  onChange={(e) => { setFormInterval(e.target.value); if (e.target.value) setFormCron(""); }}
                  placeholder="1d, 4h, 30m"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">{t("scheduler.intervalHint")}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("scheduler.executablePath")}</Label>
              <Input
                value={formExecPath}
                onChange={(e) => setFormExecPath(e.target.value)}
                placeholder="/config/scripts/backup.sh"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("scheduler.arguments")}</Label>
              <Input
                value={formExecArgs}
                onChange={(e) => setFormExecArgs(e.target.value)}
                // eslint-disable-next-line vymanager/no-untranslated-text -- example value
                placeholder="--verbose --output /var/log/backup.log"
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskModalOpen(false)} disabled={formSaving}>{tc("cancel")}</Button>
            <Button onClick={handleSave} disabled={formSaving}>
              {formSaving ? tc("saving") : editingTask ? tc("saveChanges") : t("scheduler.createTask")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("scheduler.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.rich("scheduler.deleteConfirm", { name: deleteTarget ?? "", strong: (chunks) => <strong>{chunks}</strong> })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? t("scheduler.deleting") : tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
