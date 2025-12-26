"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FeatureGroup, PermissionLevel, userManagementService } from "@/lib/api/user-management";

interface PermissionMatrixProps {
  permissions: Record<string, string>;
  onChange: (permissions: Record<string, string>) => void;
  disabled?: boolean;
}

export function PermissionMatrix({ permissions, onChange, disabled }: PermissionMatrixProps) {
  const features = Object.values(FeatureGroup);
  const levels = [PermissionLevel.NONE, PermissionLevel.READ, PermissionLevel.WRITE];

  const handlePermissionChange = (feature: FeatureGroup, level: PermissionLevel) => {
    onChange({
      ...permissions,
      [feature]: level,
    });
  };

  const getLevelColor = (level: PermissionLevel) => {
    switch (level) {
      case PermissionLevel.NONE:
        return "text-muted-foreground";
      case PermissionLevel.READ:
        return "text-blue-600";
      case PermissionLevel.WRITE:
        return "text-green-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="w-full">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left p-3 text-sm font-semibold text-foreground">
              Feature
            </th>
            <th className="text-center p-3 text-sm font-semibold text-foreground w-32">
              No Access
            </th>
            <th className="text-center p-3 text-sm font-semibold text-foreground w-32">
              Read Only
            </th>
            <th className="text-center p-3 text-sm font-semibold text-foreground w-32">
              Full Access
            </th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature, idx) => (
            <tr
              key={feature}
              className={`border-b border-border ${
                idx % 2 === 0 ? "bg-background" : "bg-muted/20"
              } hover:bg-accent/50 transition-colors`}
            >
              <td className="p-3">
                <div>
                  <div className="font-medium text-sm text-foreground">
                    {userManagementService.getFeatureGroupDisplayName(feature)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {getFeatureDescription(feature)}
                  </div>
                </div>
              </td>
              {levels.map((level) => (
                <td key={level} className="p-3 text-center">
                  <div className="flex items-center justify-center">
                    <input
                      type="radio"
                      id={`${feature}-${level}`}
                      name={`permission-${feature}`}
                      checked={permissions[feature] === level}
                      onChange={() => handlePermissionChange(feature, level)}
                      disabled={disabled}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="border-t border-border bg-muted/30 p-4">
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-muted-foreground"></div>
            <span className="text-muted-foreground">
              <span className="font-semibold">No Access:</span> Feature is not visible
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-600"></div>
            <span className="text-muted-foreground">
              <span className="font-semibold">Read Only:</span> Can view but not modify
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-600"></div>
            <span className="text-muted-foreground">
              <span className="font-semibold">Full Access:</span> Can view and modify
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getFeatureDescription(feature: FeatureGroup): string {
  const descriptions: Record<FeatureGroup, string> = {
    [FeatureGroup.FIREWALL]: "IPv4, IPv6, and firewall groups",
    [FeatureGroup.NAT]: "Source, Destination, and Static NAT",
    [FeatureGroup.DHCP]: "DHCP Server configuration",
    [FeatureGroup.INTERFACES]: "Ethernet, VLANs, Dummy interfaces",
    [FeatureGroup.STATIC_ROUTES]: "Static routing configuration",
    [FeatureGroup.ROUTING_POLICIES]: "Route maps, prefix lists, AS-path, community lists",
    [FeatureGroup.SYSTEM]: "System settings, reboot, poweroff",
    [FeatureGroup.CONFIGURATION]: "Save, load, diff, snapshots, rollback",
    [FeatureGroup.DASHBOARD]: "Dashboard customization",
    [FeatureGroup.SITES_INSTANCES]: "Site & instance management (SUPER_ADMIN only)",
    [FeatureGroup.USER_MANAGEMENT]: "User, role, permission management (SUPER_ADMIN only)",
  };
  return descriptions[feature];
}
