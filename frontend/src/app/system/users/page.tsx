"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Users,
  Pencil,
  Trash2,
  Shield,
  Server,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  userManagementService,
  SiteRole,
  type UserListItem,
} from "@/lib/api/user-management";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CreateUserModal } from "@/components/users/CreateUserModal";
import { EditUserModal } from "@/components/users/EditUserModal";
import { DeleteUserModal } from "@/components/users/DeleteUserModal";
import { UserAssignmentsModal } from "@/components/users/UserAssignmentsModal";

export default function SystemUsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserListItem | null>(null);
  const [viewingAssignments, setViewingAssignments] =
    useState<UserListItem | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userManagementService.listUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on search
  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    return (
      user.email.toLowerCase().includes(query) ||
      user.name?.toLowerCase().includes(query) ||
      user.site_role.toLowerCase().includes(query)
    );
  });

  // Stats
  const totalUsers = users.length;
  const adminUsers = users.filter((u) => u.site_role === SiteRole.ADMIN).length;
  const viewerUsers = users.filter(
    (u) => u.site_role === SiteRole.VIEWER
  ).length;
  const verifiedUsers = users.filter((u) => u.email_verified).length;

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Users</h1>
              <p className="text-muted-foreground mt-2">
                Manage system users and their permissions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={fetchUsers} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setCreateModalOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {totalUsers}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Admins</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {adminUsers}
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Viewers</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {viewerUsers}
                    </p>
                  </div>
                  <Eye className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Verified</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {verifiedUsers}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 pt-4">
          {/* Search */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Error Loading Users
              </h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchUsers} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : (
            <Card>
              <ScrollArea className="h-[calc(100vh-450px)]">
                {filteredUsers.length === 0 ? (
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Users Found
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                      {searchQuery
                        ? "No users match your search criteria"
                        : "No users have been created yet"}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setCreateModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create User
                      </Button>
                    )}
                  </CardContent>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>User</TableHead>
                        <TableHead>Site Role</TableHead>
                        <TableHead>Instances</TableHead>
                        <TableHead>Email Verified</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="group">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">
                                {user.name || "—"}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {user.email}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                user.site_role === SiteRole.ADMIN
                                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                                  : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              )}
                            >
                              <Shield className="h-3 w-3 mr-1" />
                              {user.site_role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.instance_count > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 text-sm"
                                onClick={() => setViewingAssignments(user)}
                              >
                                <Server className="h-3 w-3 mr-1" />
                                {user.instance_count} instance
                                {user.instance_count !== 1 ? "s" : ""}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.email_verified ? (
                              <Badge
                                variant="outline"
                                className="bg-green-500/10 text-green-500 border-green-500/20"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-orange-500/10 text-orange-500 border-orange-500/20"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingUser(user)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingUser(user)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateUserModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={fetchUsers}
      />

      <EditUserModal
        open={editingUser !== null}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSuccess={fetchUsers}
        user={editingUser}
      />

      <DeleteUserModal
        open={deletingUser !== null}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        onSuccess={fetchUsers}
        user={deletingUser}
      />

      <UserAssignmentsModal
        open={viewingAssignments !== null}
        onOpenChange={(open) => !open && setViewingAssignments(null)}
        user={viewingAssignments}
        onAssignmentRemoved={fetchUsers}
      />
    </AppLayout>
  );
}
