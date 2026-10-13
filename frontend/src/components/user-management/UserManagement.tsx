"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Users, Server, Shield } from "lucide-react";
import { UsersTab } from "./UsersTab";
import { InstancesTab } from "./InstancesTab";
import { TwoFactorSettings } from "@/components/auth/TwoFactorSettings";
import { TwoFactorPolicyCard } from "@/components/auth/TwoFactorPolicyCard";
import { useSessionStore } from "@/store/session-store";
import { hideSiteInventory } from "@/lib/appliance";

type UserManagementTab = "users" | "two-factor" | "instances";

export function UserManagement() {
  const t = useTranslations("userManagement");
  const { appliance } = useSessionStore();
  const showInstances = !hideSiteInventory(appliance);
  const [selectedTab, setSelectedTab] = useState<UserManagementTab>("users");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t("title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("subtitle")}
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
            <span>{t("tabs.users")}</span>
          </button>

          <button
            onClick={() => setSelectedTab("two-factor")}
            className={`
              flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors
              ${
                selectedTab === "two-factor"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }
            `}
          >
            <Shield className="h-4 w-4" />
            <span>{t("tabs.twoFactor")}</span>
          </button>

          {showInstances && (
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
            <span>{t("tabs.instances")}</span>
          </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {selectedTab === "users" && <UsersTab />}

        {selectedTab === "two-factor" && (
          <div className="space-y-4">
            <TwoFactorSettings />
            <TwoFactorPolicyCard />
          </div>
        )}

        {showInstances && selectedTab === "instances" && <InstancesTab />}
      </div>
    </div>
  );
}
