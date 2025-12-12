"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Minus, Edit, FileJson } from "lucide-react";
import type { ConfigDiff } from "@/lib/api/config";
import type { ReactNode } from "react";

interface ConfigDiffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diff: ConfigDiff | null;
}

export function ConfigDiffModal({ open, onOpenChange, diff }: ConfigDiffModalProps) {
  if (!diff) return null;

  const { added, removed, modified, summary } = diff;
  const hasAdded = summary.added > 0;
  const hasRemoved = summary.removed > 0;
  const hasModified = summary.modified > 0;

  const renderValue = (value: any, depth: number = 0): ReactNode => {
    const indent = depth * 16;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return (
        <div style={{ marginLeft: `${indent}px` }}>
          {Object.entries(value).map(([key, val]) => (
            <div key={key} className="my-1">
              <span className="text-blue-600 dark:text-blue-400 font-mono">{key}:</span>
              {typeof val === "object" && val !== null ? (
                renderValue(val, depth + 1)
              ) : (
                <span className="ml-2 text-foreground font-mono">{String(val)}</span>
              )}
            </div>
          ))}
        </div>
      );
    } else if (Array.isArray(value)) {
      return (
        <div style={{ marginLeft: `${indent}px` }} className="text-foreground font-mono">
          [{value.map((v, i) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ")}]
        </div>
      );
    } else {
      return <span className="text-foreground font-mono">{String(value)}</span>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Configuration Changes
          </DialogTitle>
          <DialogDescription>
            Review the differences between your current configuration and the last saved state.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 py-2">
          {hasAdded && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                <Plus className="h-3 w-3 mr-1" />
                {summary.added} Added
              </Badge>
            </div>
          )}
          {hasRemoved && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                <Minus className="h-3 w-3 mr-1" />
                {summary.removed} Removed
              </Badge>
            </div>
          )}
          {hasModified && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                <Edit className="h-3 w-3 mr-1" />
                {summary.modified} Modified
              </Badge>
            </div>
          )}
        </div>

        <Tabs defaultValue={hasAdded ? "added" : hasRemoved ? "removed" : "modified"} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="added" disabled={!hasAdded}>
              Added ({summary.added})
            </TabsTrigger>
            <TabsTrigger value="removed" disabled={!hasRemoved}>
              Removed ({summary.removed})
            </TabsTrigger>
            <TabsTrigger value="modified" disabled={!hasModified}>
              Modified ({summary.modified})
            </TabsTrigger>
          </TabsList>

          {/* Added Tab */}
          <TabsContent value="added" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[calc(80vh-280px)]">
              {Object.keys(added).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items added
                </div>
              ) : (
                <div className="space-y-3 pr-4">
                  {Object.entries(added).map(([path, value]) => (
                    <div
                      key={path}
                      className="p-3 rounded-lg bg-green-500/5 border border-green-500/20"
                    >
                      <div className="flex items-start gap-2">
                        <Plus className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-semibold text-green-600 break-all">
                            {path}
                          </p>
                          <div className="mt-2 text-sm">
                            {renderValue(value)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Removed Tab */}
          <TabsContent value="removed" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[calc(80vh-280px)]">
              {Object.keys(removed).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items removed
                </div>
              ) : (
                <div className="space-y-3 pr-4">
                  {Object.entries(removed).map(([path, value]) => (
                    <div
                      key={path}
                      className="p-3 rounded-lg bg-red-500/5 border border-red-500/20"
                    >
                      <div className="flex items-start gap-2">
                        <Minus className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-semibold text-red-600 break-all">
                            {path}
                          </p>
                          <div className="mt-2 text-sm line-through opacity-60">
                            {renderValue(value)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Modified Tab */}
          <TabsContent value="modified" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[calc(80vh-280px)]">
              {Object.keys(modified).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items modified
                </div>
              ) : (
                <div className="space-y-3 pr-4">
                  {Object.entries(modified).map(([path, change]: [string, any]) => (
                    <div
                      key={path}
                      className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20"
                    >
                      <div className="flex items-start gap-2">
                        <Edit className="h-4 w-4 text-yellow-600 mt-1 flex-shrink-0" />
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-semibold text-yellow-600 break-all">
                            {path}
                          </p>
                          <div className="mt-2 space-y-2">
                            <div>
                              <span className="text-xs font-semibold text-red-600">Old:</span>
                              <div className="text-sm line-through opacity-60">
                                {renderValue(change.old)}
                              </div>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-green-600">New:</span>
                              <div className="text-sm">
                                {renderValue(change.new)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
