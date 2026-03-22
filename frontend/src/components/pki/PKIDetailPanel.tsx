"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
// Shared helpers
// ============================================================================

function CopyButton({ value, label }: { value: string; label?: string }) {
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
      {copied ? "Copied" : label || "Copy"}
    </Button>
  );
}

function RevealableField({
  itemType,
  itemName,
  field,
  label,
  isMasked,
}: {
  itemType: string;
  itemName: string;
  field: string;
  label: string;
  isMasked: boolean;
}) {
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
          {revealed && value && <CopyButton value={value} />}
          <Button variant="outline" size="sm" onClick={handleReveal} className="h-7 px-2 text-xs" disabled={loading}>
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : revealed ? (
              <><EyeOff className="h-3 w-3 mr-1" />Hide</>
            ) : (
              <><Eye className="h-3 w-3 mr-1" />Reveal</>
            )}
          </Button>
        </div>
      </div>
      {revealed && value && (
        <pre className="text-xs font-mono bg-muted rounded-md p-3 max-h-48 overflow-auto break-all whitespace-pre-wrap border">
          {value}
        </pre>
      )}
    </div>
  );
}

function ValueField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value || value === "***") return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <CopyButton value={value} />
      </div>
      <pre className="text-xs font-mono bg-muted rounded-md p-3 max-h-48 overflow-auto break-all whitespace-pre-wrap border">
        {value}
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
  return (
    <div className="space-y-4">
      <DetailRow label="Description" value={item.description} />
      <div className="flex flex-wrap gap-1.5">
        {item.revoke && <Badge variant="destructive">Revoked</Badge>}
        {item.system_install && <Badge variant="outline">System Install</Badge>}
        {item.password_protected && <Badge variant="outline">Password Protected</Badge>}
        {item.crl?.length > 0 && <Badge variant="outline">CRL ({item.crl.length})</Badge>}
      </div>
      <Separator />
      {item.certificate && item.certificate !== "***" && (
        <ValueField label="Certificate" value={item.certificate} />
      )}
      <RevealableField itemType="ca" itemName={item.name} field="private_key" label="Private Key" isMasked={!!item.private_key} />
      {item.crl?.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium">CRL Entries ({item.crl.length})</span>
          {item.crl.map((c, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">CRL #{i + 1}</span>
                <CopyButton value={c} />
              </div>
              <pre className="text-xs font-mono bg-muted rounded-md p-3 break-all whitespace-pre-wrap max-h-32 overflow-auto border">
                {c}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CertDetail({ item }: { item: PKICertificate }) {
  return (
    <div className="space-y-4">
      <DetailRow label="Description" value={item.description} />
      <div className="flex flex-wrap gap-1.5">
        {item.acme ? (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">ACME</Badge>
        ) : (
          <Badge variant="secondary">Manual</Badge>
        )}
        {item.revoke && <Badge variant="destructive">Revoked</Badge>}
        {item.password_protected && <Badge variant="outline">Password Protected</Badge>}
      </div>
      <Separator />
      {item.certificate && item.certificate !== "***" && (
        <ValueField label="Certificate" value={item.certificate} />
      )}
      <RevealableField itemType="certificate" itemName={item.name} field="private_key" label="Private Key" isMasked={!!item.private_key} />
      {item.acme && (
        <>
          <Separator />
          <div className="space-y-3">
            <span className="text-sm font-medium">ACME Configuration</span>
            <div className="grid grid-cols-2 gap-3">
              {item.acme.domain_names?.length > 0 && (
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground">Domains</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.acme.domain_names.map((d) => (
                      <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <DetailRow label="Email" value={item.acme.email} />
              <DetailRow label="Listen Address" value={item.acme.listen_address} />
              <DetailRow label="RSA Key Size" value={item.acme.rsa_key_size} />
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
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {item.password_protected && <Badge variant="outline">Password Protected</Badge>}
      </div>
      {item.public_key && item.public_key !== "***" && (
        <ValueField label="Public Key" value={item.public_key} />
      )}
      <RevealableField itemType="key_pair" itemName={item.name} field="private_key" label="Private Key" isMasked={!!item.private_key} />
    </div>
  );
}

function DHDetail({ item }: { item: PKIDH }) {
  return (
    <div className="space-y-4">
      <RevealableField itemType="dh" itemName={item.name} field="parameters" label="DH Parameters" isMasked={!!item.parameters} />
    </div>
  );
}

function OpenSSHDetail({ item }: { item: PKIOpenSSH }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {item.public_type && <Badge variant="secondary">{item.public_type}</Badge>}
        {item.password_protected && <Badge variant="outline">Password Protected</Badge>}
      </div>
      {item.public_key && item.public_key !== "***" && (
        <ValueField label="Public Key" value={item.public_type ? `${item.public_type} ${item.public_key}` : item.public_key} />
      )}
      <RevealableField itemType="openssh" itemName={item.name} field="private_key" label="Private Key" isMasked={!!item.private_key} />
    </div>
  );
}

function OpenVPNDetail({ item }: { item: PKIOpenVPNSharedSecret }) {
  return (
    <div className="space-y-4">
      <DetailRow label="Version" value={item.version} />
      <RevealableField itemType="openvpn" itemName={item.name} field="key" label="Shared Secret Key" isMasked={!!item.key} />
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

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  ca: { label: "Certificate Authority", icon: ShieldCheck },
  certificate: { label: "Certificate", icon: FileText },
  dh: { label: "DH Parameters", icon: Key },
  key_pair: { label: "Key Pair", icon: Key },
  openssh: { label: "OpenSSH Key", icon: Terminal },
  openvpn: { label: "OpenVPN Shared Secret", icon: Lock },
};

// ============================================================================
// Main sheet component
// ============================================================================

interface PKIDetailSheetProps {
  viewing: PKIViewingItem | null;
  onClose: () => void;
}

export function PKIDetailSheet({ viewing, onClose }: PKIDetailSheetProps) {
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
              <SheetDescription>{meta.label}</SheetDescription>
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
