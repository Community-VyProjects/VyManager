"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Settings } from "lucide-react";
import { pkiService, PKIX509Defaults } from "@/lib/api/pki";
import { ApiError } from "@/lib/types/api";

interface X509DefaultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  current: PKIX509Defaults;
}

export function X509DefaultsModal({ open, onOpenChange, onSuccess, current }: X509DefaultsModalProps) {
  const t = useTranslations("pki");
  const tc = useTranslations("common");
  const [country, setCountry] = useState("");
  const [locality, setLocality] = useState("");
  const [organization, setOrganization] = useState("");
  const [state, setState] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCountry(current.country || "");
      setLocality(current.locality || "");
      setOrganization(current.organization || "");
      setState(current.state || "");
      setError(null);
    }
  }, [open, current]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await pkiService.updateX509Defaults(current, {
        country,
        locality,
        organization,
        state,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || tc("operationFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t("x509.title")}
          </DialogTitle>
          <DialogDescription>
            {t("x509.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="x509-country">{t("shared.country")}</Label>
            <Input id="x509-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder={t("x509.countryPlaceholder")} maxLength={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="x509-state">{t("shared.state")}</Label>
            <Input id="x509-state" value={state} onChange={(e) => setState(e.target.value)} placeholder={t("x509.statePlaceholder")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="x509-locality">{t("shared.locality")}</Label>
            <Input id="x509-locality" value={locality} onChange={(e) => setLocality(e.target.value)} placeholder={t("x509.localityPlaceholder")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="x509-org">{t("shared.organization")}</Label>
            <Input id="x509-org" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder={t("x509.organizationPlaceholder")} />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tc("saving")}</> : t("shared.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
