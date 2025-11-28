"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Save, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { configService, type ConfigDiff } from "@/lib/api/config";
import { ConfigDiffModal } from "./ConfigDiffModal";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

export function UnsavedChangesBanner() {
  const [diff, setDiff] = useState<ConfigDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Poll for changes every 10 seconds
  useEffect(() => {
    const checkForChanges = async () => {
      try {
        setLoading(true);
        const diffResult = await configService.getDiff();
        setDiff(diffResult);
        setError(null);
      } catch (err) {
        console.error("Failed to check for config changes:", err);
        setError(err instanceof Error ? err.message : "Failed to check for changes");
      } finally {
        setLoading(false);
      }
    };

    // Check immediately
    checkForChanges();

    // Then poll every 10 seconds
    const interval = setInterval(checkForChanges, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const result = await configService.saveConfig();

      if (!result.success) {
        const errorMsg = result.error || "Failed to save configuration";
        setError(errorMsg);
        toast.error("Save Failed", errorMsg);
        return;
      }

      // Success!
      toast.success("Configuration Saved", "Your changes have been written to disk successfully");

      // Refresh diff after save
      const newDiff = await configService.getDiff();
      setDiff(newDiff);

      // Clear any previous errors
      setError(null);
    } catch (err) {
      console.error("Failed to save configuration:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to save configuration";
      setError(errorMsg);
      toast.error("Save Failed", errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Don't show if no changes
  if (!diff?.has_changes) {
    return null;
  }

  const { added, removed, modified } = diff.summary;
  const totalChanges = added + removed + modified;

  return (
    <>
      <div
        className={cn(
          "fixed top-0 left-64 right-0 z-50 bg-gradient-to-r from-blue-600 to-cyan-500",
          "shadow-lg border-b border-blue-700/20"
        )}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left side - Icon and message */}
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-white">
                  Unsaved Configuration Changes
                </p>
                <p className="text-xs text-blue-100">
                  {totalChanges} change{totalChanges !== 1 ? "s" : ""} detected
                  {added > 0 && ` (${added} added`}
                  {removed > 0 && `, ${removed} removed`}
                  {modified > 0 && `, ${modified} modified`}
                  {(added > 0 || removed > 0 || modified > 0) && ")"}
                </p>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              {error && (
                <span className="text-xs text-white bg-red-600/30 px-3 py-1 rounded">
                  {error}
                </span>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiffModal(true)}
                className="bg-white/20 text-white border-white/40 hover:bg-white/30 hover:text-white font-medium shadow-sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Show Diffs
              </Button>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer to push content down when banner is visible */}
      <div className="h-16" />

      {/* Diff Modal */}
      <ConfigDiffModal
        open={showDiffModal}
        onOpenChange={setShowDiffModal}
        diff={diff}
      />
    </>
  );
}
