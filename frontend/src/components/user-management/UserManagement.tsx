"use client";

import { useState } from "react";
import { Users, Server, Shield } from "lucide-react";
import { UsersTab } from "./UsersTab";
import { InstancesTab } from "./InstancesTab";

type UserManagementTab = "users" | "instances";

export function UserManagement() {
  const [selectedTab, setSelectedTab] = useState<UserManagementTab>("users");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">User Management</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage users, roles, and instance access permissions
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit">
        <button
          onClick={() => setSelectedTab("users")}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
            ${
              selectedTab === "users"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }
          `}
        >
          <Users className="h-4 w-4" />
          Users
        </button>

        <button
          onClick={() => setSelectedTab("instances")}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
            ${
              selectedTab === "instances"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }
          `}
        >
          <Server className="h-4 w-4" />
          Instance Access
        </button>
      </div>

      {/* Tab Content */}
      {selectedTab === "users" && <UsersTab />}
      {selectedTab === "instances" && <InstancesTab />}
    </div>
  );
}
