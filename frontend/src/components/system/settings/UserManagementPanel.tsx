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
  const t = useTranslations("systemLogin");
  const tc = useTranslations("common");
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
        toast.error(t("deleteFailed"), result.error ?? t("users.deleteUserFailed"));
      } else {
        toast.success(t("users.userDeleted"), t("users.userDeletedDetail", { name: deleteUserTarget }));
        onRefresh();
      }
    } catch {
      toast.error(t("deleteFailed"), t("unexpectedError"));
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
        toast.error(t("deleteFailed"), result.error ?? t("users.deleteKeyFailed"));
      } else {
        toast.success(t("users.keyRemoved"));
        onRefresh();
      }
    } catch {
      toast.error(t("deleteFailed"), t("unexpectedError"));
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
        setLoginError(result.error ?? t("users.saveLoginFailed"));
        return;
      }

      toast.success(t("users.loginSaved"));
      setEditingLogin(false);
      onRefresh();
    } catch {
      setLoginError(t("unexpectedError"));
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
              <CardTitle>{t("users.title")}</CardTitle>
              <CardDescription>{t("users.description")}</CardDescription>
            </div>
            {!isReadOnly && (
              <Button size="sm" onClick={openCreateUser}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t("users.addUser")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("users.username")}</TableHead>
                <TableHead>{t("users.fullName")}</TableHead>
                <TableHead>{t("users.password")}</TableHead>
                <TableHead>{t("users.sshKeys")}</TableHead>
                {!isReadOnly && <TableHead className="text-right">{tc("actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.login.users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isReadOnly ? 4 : 5} className="text-center text-muted-foreground py-6">
                    {t("users.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                config.login.users.map((user) => (
                  <TableRow key={user.username}>
                    <TableCell className="font-mono font-medium">{user.username}</TableCell>
                    <TableCell>{user.full_name || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      {user.has_password ? (
                        <Badge variant="secondary">{t("users.set")}</Badge>
                      ) : (
                        <Badge variant="outline">{tc("none")}</Badge>
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
                                title={t("users.removeKey")}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        {user.ssh_keys.length === 0 && (
                          <span className="text-muted-foreground text-xs">{tc("none")}</span>
                        )}
                        {!isReadOnly && (
                          <button
                            className="text-muted-foreground hover:text-primary ml-1"
                            onClick={() => setSshModalUser(user.username)}
                            title={t("users.addSshKey")}
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
              <CardTitle>{t("users.loginTitle")}</CardTitle>
              <CardDescription>{t("users.loginDescription")}</CardDescription>
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
                {tc("edit")}
              </Button>
            )}
            {editingLogin && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditingLogin(false); setLoginError(null); }} disabled={loginSaving}>
                  {tc("cancel")}
                </Button>
                <Button size="sm" onClick={handleSaveLoginSettings} disabled={loginSaving}>
                  {loginSaving ? tc("saving") : tc("save")}
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
              <Label>{t("users.sessionTimeout")}</Label>
              {editingLogin ? (
                <Input
                  type="number"
                  min="0"
                  value={loginTimeout}
                  onChange={(e) => setLoginTimeout(e.target.value)}
                  placeholder={tc("notSet")}
                />
              ) : (
                <p className="text-sm font-medium">
                  {config.login.timeout
                    ? `${config.login.timeout}s`
                    : <span className="text-muted-foreground">{tc("notSet")}</span>}
                </p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("users.preLoginBanner")}</Label>
              {editingLogin ? (
                <Textarea
                  value={preBanner}
                  onChange={(e) => setPreBanner(e.target.value)}
                  placeholder={t("users.preLoginPlaceholder")}
                  rows={3}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap font-mono text-xs bg-muted rounded p-2 min-h-[3rem]">
                  {config.login.banners.pre_login || <span className="text-muted-foreground font-sans">{tc("notSet")}</span>}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("users.postLoginBanner")}</Label>
              {editingLogin ? (
                <Textarea
                  value={postBanner}
                  onChange={(e) => setPostBanner(e.target.value)}
                  placeholder={t("users.postLoginPlaceholder")}
                  rows={3}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap font-mono text-xs bg-muted rounded p-2 min-h-[3rem]">
                  {config.login.banners.post_login || <span className="text-muted-foreground font-sans">{tc("notSet")}</span>}
                </p>
              )}
            </div>
          </div>

          {/* Operator Groups (1.5 only) */}
          {capabilities.login.supports_operator_group && config.login.operator_groups.length > 0 && (
            <div className="space-y-2">
              <Label>{t("users.operatorGroups")}</Label>
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
            <AlertDialogTitle>{t("users.deleteUserTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.rich("users.deleteUserConfirm", { name: deleteUserTarget ?? "", strong: (chunks) => <strong>{chunks}</strong> })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t("users.deleting") : tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSshTarget} onOpenChange={(o: boolean) => { if (!o) setDeleteSshTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("users.removeKeyTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.rich("users.removeKeyConfirm", { key: deleteSshTarget?.keyName ?? "", user: deleteSshTarget?.username ?? "", strong: (chunks) => <strong>{chunks}</strong> })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSsh}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSshKey}
              disabled={deletingSsh}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingSsh ? t("users.removing") : t("users.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
