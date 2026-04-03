"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Server,
  Mail,
  Calendar,
} from "lucide-react";
import { userManagementService, UserListItem } from "@/lib/api/user-management";
import { CreateUserModal } from "./CreateUserModal";
import { EditUserModal } from "./EditUserModal";
import { DeleteUserModal } from "./DeleteUserModal";
import { ManageUserAccessPanel } from "./ManageUserAccessPanel";
import { ApiError } from "@/lib/types/api";
import { isAdminRole, isProjectAdmin as isProjectAdminRole, roleLabel } from "@/lib/roles";
import { useOrgStore } from "@/store/org-store";

const ROLE_COLORS: Record<string, string> = {
  PROJECT_ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  ORG_ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  VIEWER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
};

export function UsersTab() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { currentOrg } = useOrgStore();

  // Modal states
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [manageAccessOpen, setManageAccessOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);

  useEffect(() => {
    loadUsers();
  }, [currentOrg?.id]);

  useEffect(() => {
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
      setError((err as ApiError).message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    loadUsers();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Users</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={loadUsers} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={loadUsers} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setCreateUserOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>
        </div>

        {/* User Cards Grid */}
        {filteredUsers.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No users found matching your search" : "No users yet"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="group border border-border rounded-lg p-4 hover:border-primary/30 hover:shadow-sm transition-all bg-card"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-foreground truncate">
                        {user.name || "Unnamed User"}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedUser(user);
                        setManageAccessOpen(true);
                      }}>
                        <UserCog className="h-4 w-4 mr-2" />
                        Manage Access
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedUser(user);
                        setEditUserOpen(true);
                      }}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user);
                          setDeleteUserOpen(true);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Badges Row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium ${ROLE_COLORS[user.site_role] || ROLE_COLORS.VIEWER}`}
                  >
                    <Shield className="h-2.5 w-2.5 mr-1" />
                    {roleLabel(user.site_role)}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    <Server className="h-2.5 w-2.5 mr-1" />
                    {user.instance_count} {user.instance_count === 1 ? "instance" : "instances"}
                  </Badge>
                </div>

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Joined {formatDate(user.created_at)}
                  </div>
                  {!user.email_verified && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      Unverified
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateUserModal
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
        onSuccess={handleSuccess}
      />

      {selectedUser && (
        <>
          <EditUserModal
            open={editUserOpen}
            onOpenChange={setEditUserOpen}
            user={selectedUser}
            onSuccess={handleSuccess}
          />
          <DeleteUserModal
            open={deleteUserOpen}
            onOpenChange={setDeleteUserOpen}
            user={selectedUser}
            onSuccess={handleSuccess}
          />
          <ManageUserAccessPanel
            open={manageAccessOpen}
            onOpenChange={setManageAccessOpen}
            user={selectedUser}
            onSuccess={handleSuccess}
          />
        </>
      )}
    </>
  );
}
