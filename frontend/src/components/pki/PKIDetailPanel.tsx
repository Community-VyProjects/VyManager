"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Copy, Check, Eye, EyeOff, Loader2, ShieldCheck, FileText, Key, Terminal, Lock } from "lucide-react";
import { pkiService } from "@/lib/api/pki";
import type {
  PKICA,
  PKICertificate,
  PKIDH,
  PKIKeyPair,
  PKIOpenSSH,
  PKIOpenVPNSharedSecret,
} from "@/lib/api/pki";

// ============================================================================
// PEM formatting helper
// ============================================================================

const PEM_HEADERS: Record<string, { begin: string; end: string }> = {
  certificate: { begin: "-----BEGIN CERTIFICATE-----", end: "-----END CERTIFICATE-----" },
  private_key: { begin: "-----BEGIN PRIVATE KEY-----", end: "-----END PRIVATE KEY-----" },
  public_key: { begin: "-----BEGIN PUBLIC KEY-----", end: "-----END PUBLIC KEY-----" },
  parameters: { begin: "-----BEGIN DH PARAMETERS-----", end: "-----END DH PARAMETERS-----" },
  crl: { begin: "-----BEGIN X509 CRL-----", end: "-----END X509 CRL-----" },
  key: { begin: "-----BEGIN OpenVPN Static key V1-----", end: "-----END OpenVPN Static key V1-----" },
  openssh_private_key: { begin: "-----BEGIN OPENSSH PRIVATE KEY-----", end: "-----END OPENSSH PRIVATE KEY-----" },
};

/**
 * Wrap a raw base64 value with PEM header/footer if not already present.
 * Inserts line breaks every 64 characters for standard PEM formatting.
 */
function formatPem(value: string, field: string): string {
  const trimmed = value.trim();
  // Already has PEM headers — return as-is
  if (trimmed.startsWith("-----BEGIN ")) return trimmed;

  const header = PEM_HEADERS[field];
  if (!header) return trimmed;

  // Remove any existing whitespace and wrap at 64 chars
  const raw = trimmed.replace(/\s/g, "");
  const lines = raw.match(/.{1,64}/g) || [raw];
  return `${header.begin}\n${lines.join("\n")}\n${header.end}`;
}

// ============================================================================
// Shared helpers
// ============================================================================

function CopyButton({ value, label }: { value: string; label?: string }) {
  const t = useTranslations("pki");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [value]);

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 text-xs">
      {copied ? <Check className="h-3 w-3 mr-1 text-green-600" /> : <Copy className="h-3 w-3 mr-1" />}
      {copied ? t("detail.copied") : label || t("detail.copy")}
    </Button>
  );
}

function RevealableField({
  itemType,
  itemName,
  field,
  label,
  isMasked,
  pemField,
}: {
  itemType: string;
  itemName: string;
  field: string;
  label: string;
  isMasked: boolean;
  pemField?: string;
}) {
  const t = useTranslations("pki");
  const [revealed, setRevealed] = useState(false);
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReveal = async () => {
    if (revealed) {
      setRevealed(false);
      return;
    }
    setLoading(true);
    try {
      const val = await pkiService.revealValue(itemType, itemName, field);
      setValue(val);
      setRevealed(true);
    } catch {
      setValue(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isMasked) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-1">
          {revealed && value && <CopyButton value={formatPem(value, pemField || field)} />}
          <Button variant="outline" size="sm" onClick={handleReveal} className="h-7 px-2 text-xs" disabled={loading}>
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : revealed ? (
              <><EyeOff className="h-3 w-3 mr-1" />{t("detail.hide")}</>
            ) : (
              <><Eye className="h-3 w-3 mr-1" />{t("detail.reveal")}</>
            )}
          </Button>
        </div>
      </div>
      {revealed && value && (
        <pre className="text-xs font-mono bg-muted rounded-md p-3 max-h-48 overflow-auto break-all whitespace-pre-wrap border">
          {formatPem(value, pemField || field)}
        </pre>
      )}
    </div>
  );
}

function ValueField({ label, value, pemField }: { label: string; value: string | null | undefined; pemField?: string }) {
  if (!value || value === "***") return null;

  const formatted = pemField ? formatPem(value, pemField) : value;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <CopyButton value={formatted} />
      </div>
      <pre className="text-xs font-mono bg-muted rounded-md p-3 max-h-48 overflow-auto break-all whitespace-pre-wrap border">
        {formatted}
      </pre>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm mt-0.5">{value}</p>
    </div>
  );
}

// ============================================================================
// Detail content for each PKI entity type
// ============================================================================

function CADetail({ item }: { item: PKICA }) {
  const t = useTranslations("pki");
  const tc = useTranslations("common");
  return (
    <div className="space-y-4">
      <DetailRow label={tc("description")} value={item.description} />
      <div className="flex flex-wrap gap-1.5">
        {item.revoke && <Badge variant="destructive">{t("shared.revoked")}</Badge>}
        {item.system_install && <Badge variant="outline">{t("shared.systemInstall")}</Badge>}
        {item.password_protected && <Badge variant="outline">{t("shared.passwordProtected")}</Badge>}
        {item.crl?.length > 0 && <Badge variant="outline">{t("shared.crlCount", { count: item.crl.length })}</Badge>}
      </div>
      <Separator />
      {item.certificate && item.certificate !== "***" && (
        <ValueField label={t("shared.certificate")} value={item.certificate} pemField="certificate" />
      )}
      <RevealableField itemType="ca" itemName={item.name} field="private_key" label={t("shared.privateKey")} isMasked={!!item.private_key} />
      {item.crl?.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium">{t("detail.crlEntries", { count: item.crl.length })}</span>
          {item.crl.map((c, i) => {
            const formattedCrl = formatPem(c, "crl");
            return (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("detail.crlNumber", { number: String(i + 1) })}</span>
                <CopyButton value={formattedCrl} />
              </div>
              <pre className="text-xs font-mono bg-muted rounded-md p-3 break-all whitespace-pre-wrap max-h-32 overflow-auto border">
                {formattedCrl}
              </pre>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CertDetail({ item }: { item: PKICertificate }) {
  const t = useTranslations("pki");
  const tc = useTranslations("common");
  return (
    <div className="space-y-4">
      <DetailRow label={tc("description")} value={item.description} />
      <div className="flex flex-wrap gap-1.5">
        {item.acme ? (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">ACME</Badge>
        ) : (
          <Badge variant="secondary">{t("shared.manual")}</Badge>
        )}
        {item.revoke && <Badge variant="destructive">{t("shared.revoked")}</Badge>}
        {item.password_protected && <Badge variant="outline">{t("shared.passwordProtected")}</Badge>}
      </div>
      <Separator />
      {item.certificate && item.certificate !== "***" && (
        <ValueField label={t("shared.certificate")} value={item.certificate} pemField="certificate" />
      )}
      <RevealableField itemType="certificate" itemName={item.name} field="private_key" label={t("shared.privateKey")} isMasked={!!item.private_key} />
      {item.acme && (
        <>
          <Separator />
          <div className="space-y-3">
            <span className="text-sm font-medium">{t("detail.acmeConfig")}</span>
            <div className="grid grid-cols-2 gap-3">
              {item.acme.domain_names?.length > 0 && (
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground">{t("detail.domains")}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.acme.domain_names.map((d) => (
                      <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <DetailRow label={t("detail.email")} value={item.acme.email} />
              <DetailRow label={t("detail.listenAddress")} value={item.acme.listen_address} />
              <DetailRow label={t("shared.rsaKeySize")} value={item.acme.rsa_key_size} />
              {item.acme.url && (
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground">URL</span>
                  <p className="text-sm mt-0.5 break-all">{item.acme.url}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KeyPairDetail({ item }: { item: PKIKeyPair }) {
  const t = useTranslations("pki");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {item.password_protected && <Badge variant="outline">{t("shared.passwordProtected")}</Badge>}
      </div>
      {item.public_key && item.public_key !== "***" && (
        <ValueField label={t("shared.publicKey")} value={item.public_key} pemField="public_key" />
      )}
      <RevealableField itemType="key_pair" itemName={item.name} field="private_key" label={t("shared.privateKey")} isMasked={!!item.private_key} />
    </div>
  );
}

function DHDetail({ item }: { item: PKIDH }) {
  const t = useTranslations("pki");
  return (
    <div className="space-y-4">
      <RevealableField itemType="dh" itemName={item.name} field="parameters" label={t("shared.dhParameters")} isMasked={!!item.parameters} />
    </div>
  );
}

function OpenSSHDetail({ item }: { item: PKIOpenSSH }) {
  const t = useTranslations("pki");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {item.public_type && <Badge variant="secondary">{item.public_type}</Badge>}
        {item.password_protected && <Badge variant="outline">{t("shared.passwordProtected")}</Badge>}
      </div>
      {item.public_key && item.public_key !== "***" && (
        <ValueField label={t("shared.publicKey")} value={item.public_type ? `${item.public_type} ${item.public_key}` : item.public_key} />
      )}
      <RevealableField itemType="openssh" itemName={item.name} field="private_key" label={t("shared.privateKey")} isMasked={!!item.private_key} pemField="openssh_private_key" />
    </div>
  );
}

function OpenVPNDetail({ item }: { item: PKIOpenVPNSharedSecret }) {
  const t = useTranslations("pki");
  return (
    <div className="space-y-4">
      <DetailRow label={t("shared.version")} value={item.version} />
      <RevealableField itemType="openvpn" itemName={item.name} field="key" label={t("detail.sharedSecretKey")} isMasked={!!item.key} />
    </div>
  );
}

// ============================================================================
// Discriminated union for the sheet's viewing item
// ============================================================================

export type PKIViewingItem =
  | { type: "ca"; item: PKICA }
  | { type: "certificate"; item: PKICertificate }
  | { type: "dh"; item: PKIDH }
  | { type: "key_pair"; item: PKIKeyPair }
  | { type: "openssh"; item: PKIOpenSSH }
  | { type: "openvpn"; item: PKIOpenVPNSharedSecret };

// labelKey is a message key under `pki.detail.types`.
const TYPE_META: Record<string, { labelKey: "ca" | "certificate" | "dh" | "keyPair" | "openssh" | "openvpn"; icon: React.ComponentType<{ className?: string }> }> = {
  ca: { labelKey: "ca", icon: ShieldCheck },
  certificate: { labelKey: "certificate", icon: FileText },
  dh: { labelKey: "dh", icon: Key },
  key_pair: { labelKey: "keyPair", icon: Key },
  openssh: { labelKey: "openssh", icon: Terminal },
  openvpn: { labelKey: "openvpn", icon: Lock },
};

// ============================================================================
// Main sheet component
// ============================================================================

interface PKIDetailSheetProps {
  viewing: PKIViewingItem | null;
  onClose: () => void;
}

export function PKIDetailSheet({ viewing, onClose }: PKIDetailSheetProps) {
  const t = useTranslations("pki");
  const meta = viewing ? TYPE_META[viewing.type] : null;
  const Icon = meta?.icon;

  return (
    <Sheet open={!!viewing} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
        {viewing && meta && Icon && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <SheetTitle>{viewing.item.name}</SheetTitle>
              </div>
              <SheetDescription>{t(`detail.types.${meta.labelKey}`)}</SheetDescription>
            </SheetHeader>
            <Separator className="my-4" />
            {viewing.type === "ca" && <CADetail item={viewing.item} />}
            {viewing.type === "certificate" && <CertDetail item={viewing.item} />}
            {viewing.type === "dh" && <DHDetail item={viewing.item} />}
            {viewing.type === "key_pair" && <KeyPairDetail item={viewing.item} />}
            {viewing.type === "openssh" && <OpenSSHDetail item={viewing.item} />}
            {viewing.type === "openvpn" && <OpenVPNDetail item={viewing.item} />}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
