"use client";

import { useState } from "react";
import { Users, Shield, Server } from "lucide-react";
import { UsersTab } from "./UsersTab";
import { RolesTab } from "./RolesTab";
import { InstancesTab } from "./InstancesTab";

type UserManagementTab = "users" | "roles" | "instances";

export function UserManagement() {
  const [selectedTab, setSelectedTab] = useState<UserManagementTab>("users");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">User Management</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage users, roles, and instance access permissions
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <div className="flex space-x-8">
          <button
            onClick={() => setSelectedTab("users")}
            className={`
              flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors
              ${
                selectedTab === "users"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }
            `}
          >
            <Users className="h-4 w-4" />
            <span>Users</span>
          </button>

          <button
            onClick={() => setSelectedTab("roles")}
            className={`
              flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors
              ${
                selectedTab === "roles"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }
            `}
          >
            <Shield className="h-4 w-4" />
            <span>Roles</span>
          </button>

          <button
            onClick={() => setSelectedTab("instances")}
            className={`
              flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors
              ${
                selectedTab === "instances"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }
            `}
          >
            <Server className="h-4 w-4" />
            <span>Instances</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {selectedTab === "users" && <UsersTab />}

        {selectedTab === "roles" && <RolesTab />}

        {selectedTab === "instances" && <InstancesTab />}
      </div>
    </div>
  );
}
