"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreVertical,
  UserCog,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Shield,
} from "lucide-react";
import { userManagementService, UserListItem } from "@/lib/api/user-management";
import { UserModal } from "./UserModal";
import { DeleteUserModal } from "./DeleteUserModal";
import { ManageUserAccessView } from "./ManageUserAccessView";
import { ApiError } from "@/lib/types/api";
import { roleValueKey } from "./user-form";

export function UsersTab() {
  const t = useTranslations("userManagement");
  const tc = useTranslations("common");
  const roleLabel = (role: string) => {
    const key = roleValueKey(role);
    return key ? t(key) : role;
  };
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [manageAccessOpen, setManageAccessOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount; a language switch re-renders via router.refresh()
  }, []);

  useEffect(() => {
    // Filter users based on search query
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.name?.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.site_role.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userManagementService.listUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      setError((err as ApiError).message || t("users.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setCreateUserOpen(true);
  };

  const handleEditUser = (user: UserListItem) => {
    setSelectedUser(user);
    setEditUserOpen(true);
  };

  const handleDeleteUser = (user: UserListItem) => {
    setSelectedUser(user);
    setDeleteUserOpen(true);
  };

  const handleManageAccess = (user: UserListItem) => {
    setSelectedUser(user);
    setManageAccessOpen(true);
  };

  const handleSuccess = () => {
    loadUsers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">{t("users.errorTitle")}</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={loadUsers} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          {tc("retry")}
        </Button>
      </div>
    );
  }

  if (manageAccessOpen && selectedUser) {
    return (
      <ManageUserAccessView
        user={selectedUser}
        onBack={() => setManageAccessOpen(false)}
        onChanged={loadUsers}
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t("tabs.users")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("users.total", { count: users.length })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={loadUsers} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              {tc("refresh")}
            </Button>
            <Button onClick={handleCreateUser} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t("form.createTitle")}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("users.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Users table */}
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? t("users.noMatches") : t("users.empty")}
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc("name")}</TableHead>
                  <TableHead>{t("form.email")}</TableHead>
                  <TableHead className="text-center">{t("users.colInstanceAccess")}</TableHead>
                  <TableHead>{t("form.siteRole")}</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-sm text-foreground">
                            {user.name || t("unnamedUser")}
                          </div>
                          {!user.email_verified && (
                            <div className="text-xs text-muted-foreground">
                              {t("users.emailNotVerified")}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{user.email}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                        {t("instances.instanceCount", { count: user.instance_count })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                            user.site_role === 'ADMIN'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Shield className="h-3 w-3" />
                          {roleLabel(user.site_role)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleManageAccess(user)}>
                            <UserCog className="h-4 w-4 mr-2" />
                            {t("users.manageAccess")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t("form.editTitle")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("deleteUser.confirm")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Modals */}
      <UserModal
        open={createUserOpen || editUserOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateUserOpen(false);
            setEditUserOpen(false);
          }
        }}
        onSuccess={handleSuccess}
        existing={editUserOpen ? selectedUser : null}
      />

      {selectedUser && (
        <DeleteUserModal
          open={deleteUserOpen}
          onOpenChange={setDeleteUserOpen}
          user={selectedUser}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
