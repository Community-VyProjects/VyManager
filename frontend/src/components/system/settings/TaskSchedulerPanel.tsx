"use client";

import { useState } from "react";
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
    if (!formName.trim()) { setFormError("Task name is required"); return; }
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
        if (!result.success) { setFormError(result.error ?? "Failed to update task"); return; }
        toast.success("Task updated");
      } else {
        const result = await systemSettingsService.createTask(
          formName.trim(),
          formCron || null,
          formInterval || null,
          formExecPath || null,
          formExecArgs || null,
        );
        if (!result.success) { setFormError(result.error ?? "Failed to create task"); return; }
        toast.success("Task created");
      }
      setTaskModalOpen(false);
      onRefresh();
    } catch { setFormError("An unexpected error occurred"); }
    finally { setFormSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await systemSettingsService.deleteTask(deleteTarget);
      if (!result.success) toast.error("Delete failed", result.error ?? "Could not delete task");
      else { toast.success("Task deleted"); onRefresh(); }
    } catch { toast.error("Error", "An unexpected error occurred"); }
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
                Task Scheduler
              </CardTitle>
              <CardDescription>
                Schedule recurring tasks using cron expressions or intervals.
              </CardDescription>
            </div>
            {!isReadOnly && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />Add Task
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Executable</TableHead>
                <TableHead>Arguments</TableHead>
                {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isReadOnly ? 4 : 5} className="text-center text-muted-foreground py-8">
                    No scheduled tasks configured
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.name}>
                    <TableCell className="font-medium">{task.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {task.crontab_spec ? (
                        <span title="Cron expression">{task.crontab_spec}</span>
                      ) : task.interval ? (
                        <span title="Interval">{task.interval}</span>
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
            <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
            <DialogDescription>
              {editingTask ? `Editing task "${editingTask.name}".` : "Create a new scheduled task. Use either a cron expression or an interval, not both."}
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
              <Label>Task Name <span className="text-destructive">*</span></Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="backup-config"
                disabled={!!editingTask}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cron Expression</Label>
                <Input
                  value={formCron}
                  onChange={(e) => { setFormCron(e.target.value); if (e.target.value) setFormInterval(""); }}
                  placeholder="0 2 * * *"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">min hour day month weekday</p>
              </div>
              <div className="space-y-2">
                <Label>Interval</Label>
                <Input
                  value={formInterval}
                  onChange={(e) => { setFormInterval(e.target.value); if (e.target.value) setFormCron(""); }}
                  placeholder="1d, 4h, 30m"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">e.g. 1d, 6h, 30m</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Executable Path</Label>
              <Input
                value={formExecPath}
                onChange={(e) => setFormExecPath(e.target.value)}
                placeholder="/config/scripts/backup.sh"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Arguments</Label>
              <Input
                value={formExecArgs}
                onChange={(e) => setFormExecArgs(e.target.value)}
                placeholder="--verbose --output /var/log/backup.log"
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskModalOpen(false)} disabled={formSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={formSaving}>
              {formSaving ? "Saving…" : editingTask ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete the task <strong>{deleteTarget}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
