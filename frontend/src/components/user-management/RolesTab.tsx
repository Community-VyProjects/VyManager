"use client";

import { useState, useEffect } from "react";
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
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import { userManagementService, CustomRoleListItem } from "@/lib/api/user-management";
import { CreateRoleModal } from "./CreateRoleModal";
import { EditRoleModal } from "./EditRoleModal";
import { DeleteRoleModal } from "./DeleteRoleModal";

export function RolesTab() {
  const [roles, setRoles] = useState<CustomRoleListItem[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<CustomRoleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [deleteRoleOpen, setDeleteRoleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CustomRoleListItem | null>(null);

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    // Filter roles based on search query
    if (!searchQuery.trim()) {
      setFilteredRoles(roles);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredRoles(
        roles.filter(
          (role) =>
            role.name.toLowerCase().includes(query) ||
            role.description?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, roles]);

  const loadRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userManagementService.listRoles();
      setRoles(data);
      setFilteredRoles(data);
    } catch (err: any) {
      setError(err.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = () => {
    setCreateRoleOpen(true);
  };

  const handleEditRole = (role: CustomRoleListItem) => {
    setSelectedRole(role);
    setEditRoleOpen(true);
  };

  const handleDeleteRole = (role: CustomRoleListItem) => {
    setSelectedRole(role);
    setDeleteRoleOpen(true);
  };

  const handleSuccess = () => {
    loadRoles();
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
        <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Roles</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={loadRoles} variant="outline" size="sm">
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
          <div>
            <h3 className="text-lg font-semibold text-foreground">Custom Roles</h3>
            <p className="text-sm text-muted-foreground">
              {roles.length} custom {roles.length === 1 ? "role" : "roles"} defined
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={loadRoles} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleCreateRole} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </div>
        </div>

        {/* Built-in Roles Info */}
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Built-in Roles</h4>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="font-medium text-foreground">SUPER_ADMIN</span>
              <p className="text-xs text-muted-foreground mt-1">
                Full access to everything including user management
              </p>
            </div>
            <div>
              <span className="font-medium text-foreground">ADMIN</span>
              <p className="text-xs text-muted-foreground mt-1">
                Full access to all VyOS features (no user management)
              </p>
            </div>
            <div>
              <span className="font-medium text-foreground">VIEWER</span>
              <p className="text-xs text-muted-foreground mt-1">
                Read-only access to all VyOS features
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Roles table */}
        {filteredRoles.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "No roles found matching your search"
                : "No custom roles yet. Create one to get started."}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreateRole} variant="outline" size="sm" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create First Role
              </Button>
            )}
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                          <Shield className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm text-foreground">
                          {role.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {role.description || "No description"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                        <Users className="h-3 w-3" />
                        {role.user_count} {role.user_count === 1 ? "user" : "users"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditRole(role)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Role
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteRole(role)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Role
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
      <CreateRoleModal
        open={createRoleOpen}
        onOpenChange={setCreateRoleOpen}
        onSuccess={handleSuccess}
      />

      {selectedRole && (
        <>
          <EditRoleModal
            open={editRoleOpen}
            onOpenChange={setEditRoleOpen}
            role={selectedRole}
            onSuccess={handleSuccess}
          />

          <DeleteRoleModal
            open={deleteRoleOpen}
            onOpenChange={setDeleteRoleOpen}
            role={selectedRole}
            onSuccess={handleSuccess}
          />
        </>
      )}
    </>
  );
}
