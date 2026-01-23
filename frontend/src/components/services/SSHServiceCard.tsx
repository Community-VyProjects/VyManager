"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Server, Plus, Trash2, Settings, Key, Lock, Users, UserX, AlertTriangle } from "lucide-react";
import { type SSHConfig } from "@/lib/api/ssh";
import { SSHEditModal } from "./SSHEditModal";

interface SSHServiceCardProps {
  config: SSHConfig;
  onUpdate: () => void;
}

export function SSHServiceCard({ config, onUpdate }: SSHServiceCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  const hasAccessControl =
    config.access_control.allow.users.length > 0 ||
    config.access_control.allow.groups.length > 0 ||
    config.access_control.deny.users.length > 0 ||
    config.access_control.deny.groups.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
            <Shield className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">SSH Service Configuration</h2>
            <p className="text-sm text-muted-foreground">Secure shell access configuration</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Edit Settings
        </Button>
      </div>

      <SSHEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSuccess={onUpdate}
        config={config}
      />

      {!config.configured ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Shield className="h-12 w-12 mb-4 opacity-30" />
          <p>SSH Service is not configured</p>
          <Button variant="outline" size="sm" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Configure SSH Service
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Basic Settings
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-md bg-accent/50">
                <p className="text-xs text-muted-foreground">Port</p>
                <p className="font-mono text-lg font-bold">{config.port || "22"}</p>
              </div>
              <div className="p-3 rounded-md bg-accent/50">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge
                  variant={config.disable ? "destructive" : "default"}
                  className={config.disable ? "" : "bg-green-500/10 text-green-500 border-green-500/20"}
                >
                  {config.disable ? "Disabled" : "Enabled"}
                </Badge>
              </div>
              <div className="p-3 rounded-md bg-accent/50">
                <p className="text-xs text-muted-foreground">Password Auth</p>
                <Badge
                  variant={config.disable_password_authentication ? "secondary" : "outline"}
                  className={config.disable_password_authentication ? "bg-yellow-500/10 text-yellow-600" : ""}
                >
                  <Key className="h-3 w-3 mr-1" />
                  {config.disable_password_authentication ? "Key Only" : "Enabled"}
                </Badge>
              </div>
              <div className="p-3 rounded-md bg-accent/50">
                <p className="text-xs text-muted-foreground">Keepalive</p>
                <p className="font-mono text-sm font-medium">{config.client_keepalive_interval || "Default"}s</p>
              </div>
            </div>
          </div>

          {/* Listen Addresses */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Server className="h-4 w-4" />
                Listen Addresses
              </h3>
              <Button variant="ghost" size="sm" className="h-7">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-2">
              {config.listen_addresses.length > 0 ? (
                config.listen_addresses.map((addr, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-md bg-accent/50 group"
                  >
                    <code className="text-sm font-mono">{addr}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">Listening on all addresses</p>
              )}
            </div>
          </div>

          {/* Dynamic Protection */}
          {config.dynamic_protection && (
            <div className="md:col-span-2 space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Dynamic Protection (Brute Force)
              </h3>
              <div className="p-4 rounded-md bg-accent/50 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                    <Shield className="h-3 w-3 mr-1" />
                    {config.dynamic_protection.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Block Time</p>
                    <p className="font-mono text-sm font-medium">{config.dynamic_protection.block_time || "120"}s</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Detect Time</p>
                    <p className="font-mono text-sm font-medium">{config.dynamic_protection.detect_time || "1800"}s</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Threshold</p>
                    <p className="font-mono text-sm font-medium">{config.dynamic_protection.threshold || "30"} attempts</p>
                  </div>
                </div>
                {config.dynamic_protection.allow_from.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Whitelisted Networks</p>
                    <div className="flex flex-wrap gap-1.5">
                      {config.dynamic_protection.allow_from.map((network, idx) => (
                        <Badge key={idx} variant="outline" className="font-mono text-xs">
                          {network}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Access Control */}
          {hasAccessControl && (
            <div className="md:col-span-2 space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Access Control
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Allow */}
                <div className="p-4 rounded-md bg-green-500/5 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-500">Allowed</span>
                  </div>
                  {config.access_control.allow.users.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground mb-1">Users</p>
                      <div className="flex flex-wrap gap-1">
                        {config.access_control.allow.users.map((user, idx) => (
                          <Badge key={idx} variant="outline" className="font-mono text-xs bg-green-500/10">
                            {user}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {config.access_control.allow.groups.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Groups</p>
                      <div className="flex flex-wrap gap-1">
                        {config.access_control.allow.groups.map((group, idx) => (
                          <Badge key={idx} variant="outline" className="font-mono text-xs bg-green-500/10">
                            {group}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {config.access_control.allow.users.length === 0 && config.access_control.allow.groups.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">All users allowed</p>
                  )}
                </div>

                {/* Deny */}
                <div className="p-4 rounded-md bg-red-500/5 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <UserX className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-500">Denied</span>
                  </div>
                  {config.access_control.deny.users.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground mb-1">Users</p>
                      <div className="flex flex-wrap gap-1">
                        {config.access_control.deny.users.map((user, idx) => (
                          <Badge key={idx} variant="outline" className="font-mono text-xs bg-red-500/10">
                            {user}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {config.access_control.deny.groups.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Groups</p>
                      <div className="flex flex-wrap gap-1">
                        {config.access_control.deny.groups.map((group, idx) => (
                          <Badge key={idx} variant="outline" className="font-mono text-xs bg-red-500/10">
                            {group}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {config.access_control.deny.users.length === 0 && config.access_control.deny.groups.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No users denied</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Cryptographic Settings */}
          {(config.ciphers.length > 0 || config.key_exchanges.length > 0 || config.macs.length > 0) && (
            <div className="md:col-span-2 space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Key className="h-4 w-4" />
                Cryptographic Settings
              </h3>
              <div className="space-y-4">
                {config.ciphers.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Ciphers ({config.ciphers.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {config.ciphers.map((cipher, idx) => (
                        <Badge key={idx} variant="outline" className="font-mono text-xs">
                          {cipher}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {config.key_exchanges.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Key Exchanges ({config.key_exchanges.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {config.key_exchanges.map((kex, idx) => (
                        <Badge key={idx} variant="outline" className="font-mono text-xs">
                          {kex}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {config.macs.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">MACs ({config.macs.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {config.macs.map((mac, idx) => (
                        <Badge key={idx} variant="outline" className="font-mono text-xs">
                          {mac}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Options */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Additional Options</h3>
            <div className="flex flex-wrap gap-2">
              {config.loglevel && (
                <Badge variant="outline">Log Level: {config.loglevel}</Badge>
              )}
              {config.vrf && (
                <Badge variant="outline">VRF: {config.vrf}</Badge>
              )}
              {config.disable_host_validation && (
                <Badge variant="secondary">Host Validation Disabled</Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
