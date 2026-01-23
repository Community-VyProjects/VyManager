"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Server, Shield, Plus, Trash2, Settings, Star, Database } from "lucide-react";
import { type NTPConfig } from "@/lib/api/ntp";
import { NTPEditModal } from "./NTPEditModal";

interface NTPServiceCardProps {
  config: NTPConfig;
  onUpdate: () => void;
}

export function NTPServiceCard({ config, onUpdate }: NTPServiceCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
            <Clock className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">NTP Service Configuration</h2>
            <p className="text-sm text-muted-foreground">Network time synchronization service</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Edit Settings
        </Button>
      </div>

      <NTPEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSuccess={onUpdate}
        config={config}
      />

      {!config.configured ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Clock className="h-12 w-12 mb-4 opacity-30" />
          <p>NTP Service is not configured</p>
          <Button variant="outline" size="sm" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Configure NTP Service
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NTP Servers */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Server className="h-4 w-4" />
                NTP Servers ({config.servers.length})
              </h3>
              <Button variant="ghost" size="sm" className="h-7">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Server
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {config.servers.length > 0 ? (
                config.servers.map((server, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between p-3 rounded-md bg-accent/50 group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono font-medium">{server.address}</code>
                        {server.prefer && (
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {server.pool && (
                          <Badge variant="outline" className="text-xs py-0 px-1.5">
                            <Database className="h-2.5 w-2.5 mr-1" />
                            Pool
                          </Badge>
                        )}
                        {server.nts && (
                          <Badge variant="outline" className="text-xs py-0 px-1.5 bg-green-500/10 text-green-500 border-green-500/20">
                            <Shield className="h-2.5 w-2.5 mr-1" />
                            NTS
                          </Badge>
                        )}
                        {server.noselect && (
                          <Badge variant="secondary" className="text-xs py-0 px-1.5">
                            No Select
                          </Badge>
                        )}
                      </div>
                    </div>
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
                <p className="text-sm text-muted-foreground italic md:col-span-3">No NTP servers configured</p>
              )}
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
                <p className="text-sm text-muted-foreground italic">No listen addresses configured</p>
              )}
            </div>
          </div>

          {/* Allow Clients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Allow Clients
              </h3>
              <Button variant="ghost" size="sm" className="h-7">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-2">
              {config.allow_clients.length > 0 ? (
                config.allow_clients.map((network, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-md bg-accent/50 group"
                  >
                    <code className="text-sm font-mono">{network}</code>
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
                <p className="text-sm text-muted-foreground italic">No client networks allowed</p>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Options
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-md bg-accent/50">
                <p className="text-xs text-muted-foreground">Leap Second</p>
                <p className="text-sm font-medium capitalize">{config.leap_second || "Default"}</p>
              </div>
              <div className="p-3 rounded-md bg-accent/50">
                <p className="text-xs text-muted-foreground">VRF</p>
                <p className="font-mono text-sm font-medium">{config.vrf || "None"}</p>
              </div>
              <div className="p-3 rounded-md bg-accent/50">
                <p className="text-xs text-muted-foreground">Total Servers</p>
                <p className="text-sm font-medium">{config.servers.length}</p>
              </div>
              <div className="p-3 rounded-md bg-accent/50">
                <p className="text-xs text-muted-foreground">Pool Servers</p>
                <p className="text-sm font-medium">{config.servers.filter(s => s.pool).length}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
