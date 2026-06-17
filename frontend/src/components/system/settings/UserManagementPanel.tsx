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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { AlertCircle, Plus, Trash2, UserPlus, Edit2 } from "lucide-react";
import { systemSettingsService, type SystemConfig, type SystemCapabilities, type LoginUser } from "@/lib/api/system-settings";
import { useToast } from "@/hooks/useToast";
import { UserModal } from "./UserModal";
import { SshKeyModal } from "./SshKeyModal";

interface Props {
  config: SystemConfig;
  capabilities: SystemCapabilities;
  isReadOnly: boolean;
  onRefresh: () => void;
}

export function UserManagementPanel({ config, capabilities, isReadOnly, onRefresh }: Props) {
  const { toast } = useToast();

  // User CRUD modals
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<LoginUser | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // SSH key modal
  const [sshModalUser, setSshModalUser] = useState<string | null>(null);

  // SSH key delete
  const [deleteSshTarget, setDeleteSshTarget] = useState<{ username: string; keyName: string } | null>(null);
  const [deletingSsh, setDeletingSsh] = useState(false);

  // Login settings editing
  const [editingLogin, setEditingLogin] = useState(false);
  const [loginTimeout, setLoginTimeout] = useState<string>(
    config.login.timeout ? String(config.login.timeout) : ""
  );
  const [preBanner, setPreBanner] = useState(config.login.banners.pre_login ?? "");
  const [postBanner, setPostBanner] = useState(config.login.banners.post_login ?? "");
  const [loginSaving, setLoginSaving] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const openCreateUser = () => {
    setEditingUser(null);
    setUserModalOpen(true);
  };

  const openEditUser = (user: LoginUser) => {
    setEditingUser(user);
    setUserModalOpen(true);
  };

  const confirmDeleteUser = (username: string) => {
    setDeleteUserTarget(username);
  };

  const handleDeleteUser = async () => {
    if (!deleteUserTarget) return;
    setDeleting(true);
    try {
      const result = await systemSettingsService.deleteUser(deleteUserTarget);
      if (!result.success) {
        toast.error("Delete failed", result.error ?? "Failed to delete user");
      } else {
        toast.success("User deleted", `${deleteUserTarget} has been removed`);
        onRefresh();
      }
    } catch {
      toast.error("Delete failed", "An unexpected error occurred");
    } finally {
      setDeleting(false);
      setDeleteUserTarget(null);
    }
  };

  const handleDeleteSshKey = async () => {
    if (!deleteSshTarget) return;
    setDeletingSsh(true);
    try {
      const result = await systemSettingsService.deleteSshKey(
        deleteSshTarget.username,
        deleteSshTarget.keyName
      );
      if (!result.success) {
        toast.error("Delete failed", result.error ?? "Failed to delete SSH key");
      } else {
        toast.success("SSH key removed");
        onRefresh();
      }
    } catch {
      toast.error("Delete failed", "An unexpected error occurred");
    } finally {
      setDeletingSsh(false);
      setDeleteSshTarget(null);
    }
  };

  const handleSaveLoginSettings = async () => {
    setLoginSaving(true);
    setLoginError(null);
    try {
      const timeoutVal = loginTimeout ? parseInt(loginTimeout, 10) : null;
      const timeoutChanged = timeoutVal !== config.login.timeout;
      const preBannerChanged = preBanner !== (config.login.banners.pre_login ?? "");
      const postBannerChanged = postBanner !== (config.login.banners.post_login ?? "");

      if (!timeoutChanged && !preBannerChanged && !postBannerChanged) {
        setEditingLogin(false);
        return;
      }

      const result = await systemSettingsService.updateLoginSettings({
        timeout: timeoutChanged && timeoutVal !== null ? timeoutVal : undefined,
        clearTimeout: timeoutChanged && timeoutVal === null,
        preLoginBanner: preBannerChanged && preBanner ? preBanner : undefined,
        clearPreLoginBanner: preBannerChanged && !preBanner,
        postLoginBanner: postBannerChanged && postBanner ? postBanner : undefined,
        clearPostLoginBanner: postBannerChanged && !postBanner,
      });

      if (!result.success) {
        setLoginError(result.error ?? "Failed to save login settings");
        return;
      }

      toast.success("Login settings saved");
      setEditingLogin(false);
      onRefresh();
    } catch {
      setLoginError("An unexpected error occurred");
    } finally {
      setLoginSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Users</CardTitle>
              <CardDescription>VyOS login accounts and SSH key access.</CardDescription>
            </div>
            {!isReadOnly && (
              <Button size="sm" onClick={openCreateUser}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>SSH Keys</TableHead>
                {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.login.users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isReadOnly ? 4 : 5} className="text-center text-muted-foreground py-6">
                    No users configured
                  </TableCell>
                </TableRow>
              ) : (
                config.login.users.map((user) => (
                  <TableRow key={user.username}>
                    <TableCell className="font-mono font-medium">{user.username}</TableCell>
                    <TableCell>{user.full_name || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      {user.has_password ? (
                        <Badge variant="secondary">Set</Badge>
                      ) : (
                        <Badge variant="outline">None</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.ssh_keys.map((k) => (
                          <div key={k.key_name} className="flex items-center gap-1">
                            <Badge variant="outline" className="font-mono text-xs">
                              {k.key_name}
                              {k.key_type ? ` (${k.key_type})` : ""}
                            </Badge>
                            {!isReadOnly && (
                              <button
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteSshTarget({ username: user.username, keyName: k.key_name })}
                                title="Remove key"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        {user.ssh_keys.length === 0 && (
                          <span className="text-muted-foreground text-xs">None</span>
                        )}
                        {!isReadOnly && (
                          <button
                            className="text-muted-foreground hover:text-primary ml-1"
                            onClick={() => setSshModalUser(user.username)}
                            title="Add SSH key"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditUser(user)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => confirmDeleteUser(user.username)}
                          >
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

      {/* Login Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Login Settings</CardTitle>
              <CardDescription>Session timeout and login/logout banners.</CardDescription>
            </div>
            {!isReadOnly && !editingLogin && (
              <Button variant="outline" size="sm" onClick={() => {
                setLoginTimeout(config.login.timeout ? String(config.login.timeout) : "");
                setPreBanner(config.login.banners.pre_login ?? "");
                setPostBanner(config.login.banners.post_login ?? "");
                setLoginError(null);
                setEditingLogin(true);
              }}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {editingLogin && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditingLogin(false); setLoginError(null); }} disabled={loginSaving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveLoginSettings} disabled={loginSaving}>
                  {loginSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loginError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <pre className="text-sm text-destructive whitespace-pre-wrap font-mono break-words">{loginError}</pre>
              </div>
            </div>
          )}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Session Timeout (seconds)</Label>
              {editingLogin ? (
                <Input
                  type="number"
                  min="0"
                  value={loginTimeout}
                  onChange={(e) => setLoginTimeout(e.target.value)}
                  placeholder="Not set"
                />
              ) : (
                <p className="text-sm font-medium">
                  {config.login.timeout
                    ? `${config.login.timeout}s`
                    : <span className="text-muted-foreground">Not set</span>}
                </p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pre-Login Banner</Label>
              {editingLogin ? (
                <Textarea
                  value={preBanner}
                  onChange={(e) => setPreBanner(e.target.value)}
                  placeholder="Shown before login prompt"
                  rows={3}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap font-mono text-xs bg-muted rounded p-2 min-h-[3rem]">
                  {config.login.banners.pre_login || <span className="text-muted-foreground font-sans">Not set</span>}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Post-Login Banner</Label>
              {editingLogin ? (
                <Textarea
                  value={postBanner}
                  onChange={(e) => setPostBanner(e.target.value)}
                  placeholder="Shown after successful login"
                  rows={3}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap font-mono text-xs bg-muted rounded p-2 min-h-[3rem]">
                  {config.login.banners.post_login || <span className="text-muted-foreground font-sans">Not set</span>}
                </p>
              )}
            </div>
          </div>

          {/* Operator Groups (1.5 only) */}
          {capabilities.login.supports_operator_group && config.login.operator_groups.length > 0 && (
            <div className="space-y-2">
              <Label>Operator Groups</Label>
              <div className="flex flex-wrap gap-2">
                {config.login.operator_groups.map((g) => (
                  <Badge key={g} variant="secondary">{g}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <UserModal
        open={userModalOpen}
        onOpenChange={setUserModalOpen}
        user={editingUser}
        onSuccess={onRefresh}
      />

      {sshModalUser && (
        <SshKeyModal
          open={!!sshModalUser}
          onOpenChange={(open) => { if (!open) setSshModalUser(null); }}
          username={sshModalUser}
          onSuccess={onRefresh}
        />
      )}

      <AlertDialog open={!!deleteUserTarget} onOpenChange={(o: boolean) => { if (!o) setDeleteUserTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete user <strong>{deleteUserTarget}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSshTarget} onOpenChange={(o: boolean) => { if (!o) setDeleteSshTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove SSH Key</AlertDialogTitle>
            <AlertDialogDescription>
              Remove key <strong>{deleteSshTarget?.keyName}</strong> from <strong>{deleteSshTarget?.username}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSsh}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSshKey}
              disabled={deletingSsh}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingSsh ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
