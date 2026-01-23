"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertCircle, Upload, CheckCircle, XCircle, FileText, Download } from "lucide-react";
import { sessionService } from "@/lib/api/session";

interface ImportCSVModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportCSVModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportCSVModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    sites_created: number;
    instances_created: number;
    errors?: string[] | null;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        setError("Please select a CSV file");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDownloadTemplate = () => {
    // Create CSV template content
    const headers = [
      "site_name",
      "site_description",
      "instance_name",
      "instance_description",
      "host",
      "port",
      "api_key",
      "vyos_version",
      "protocol",
      "verify_ssl"
    ];

    // Add example row
    const exampleRow = [
      "Production",
      "Main production site",
      "Router 1",
      "Main router",
      "192.168.1.1",
      "443",
      "YOUR_API_KEY_HERE",
      "1.5",
      "https",
      "false"
    ];

    // Build CSV content
    const csvContent = [
      headers.join(","),
      exampleRow.join(",")
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vymanager_import_template.csv";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleImport = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await sessionService.importCSV(file);
      setResult({
        sites_created: response.data?.sites_created || 0,
        instances_created: response.data?.instances_created || 0,
        errors: response.data?.errors,
      });

      // If successful and no errors, close after a delay
      if (response.success && !response.data?.errors?.length) {
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import CSV");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Import Sites and Instances</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Download Template Section */}
          <div className="rounded-lg bg-muted/50 border border-border p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium mb-1">Need a template?</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Download a CSV template with the correct format and an example row to get started.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="gap-2"
                >
                  <Download className="h-3 w-3" />
                  Download CSV Template
                </Button>
              </div>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={loading}
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="truncate">{file.name}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              CSV file with columns: site_name, site_description, instance_name, instance_description, host, port, api_key, vyos_version, protocol, verify_ssl
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="text-sm text-destructive mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Result Display */}
          {result && (
            <div className="space-y-3">
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      Import Completed
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li>Sites created: {result.sites_created}</li>
                      <li>Instances created: {result.instances_created}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Display Errors if any */}
              {result.errors && result.errors.length > 0 && (
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">
                        {result.errors.length} Row(s) Skipped
                      </p>
                      <div className="max-h-32 overflow-y-auto">
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {result.errors.map((err, idx) => (
                            <li key={idx} className="font-mono">
                              {err}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {result && !result.errors?.length ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={!file || loading}>
              {loading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-pulse" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
