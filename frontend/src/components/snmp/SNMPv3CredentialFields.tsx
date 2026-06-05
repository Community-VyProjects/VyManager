"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SNMPv3Auth,
  SNMPv3Privacy,
  SNMPv3CredentialUpdate,
} from "@/lib/api/snmp";

interface SNMPv3CredentialFieldsProps {
  /** "Authentication" or "Privacy" — drives labels. */
  title: string;
  description: string;
  /** Allowed protocol/type values (e.g. ["md5","sha"] or ["des","aes"]). */
  typeOptions: string[];
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  value: SNMPv3CredentialUpdate;
  onChange: (value: SNMPv3CredentialUpdate) => void;
  /** The persisted credential, used to indicate an existing password on edit. */
  original: SNMPv3Auth | SNMPv3Privacy | null;
  idPrefix: string;
}

export function SNMPv3CredentialFields({
  title,
  description,
  typeOptions,
  enabled,
  onEnabledChange,
  value,
  onChange,
  original,
  idPrefix,
}: SNMPv3CredentialFieldsProps) {
  const hasExistingPassword = !!(
    original?.encrypted_password || original?.plaintext_password
  );

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-start gap-3">
        <Checkbox
          id={`${idPrefix}-enabled`}
          checked={enabled}
          onCheckedChange={(c) => onEnabledChange(!!c)}
        />
        <Label htmlFor={`${idPrefix}-enabled`} className="cursor-pointer leading-tight">
          <span className="font-medium">{title}</span>
          <span className="block text-xs text-muted-foreground mt-0.5">
            {description}
          </span>
        </Label>
      </div>

      {enabled && (
        <div className="space-y-3 pl-7">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Protocol</Label>
            <Select
              value={value.type}
              onValueChange={(v) => onChange({ ...value, type: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Password Format</Label>
            <Select
              value={value.passwordMode}
              onValueChange={(v) =>
                onChange({ ...value, passwordMode: v as "plaintext" | "encrypted" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plaintext">
                  <span className="font-medium">Plaintext</span>
                  <span className="block text-xs text-muted-foreground">
                    Min. 8 characters — VyOS encrypts it on commit
                  </span>
                </SelectItem>
                <SelectItem value="encrypted">
                  <span className="font-medium">Encrypted</span>
                  <span className="block text-xs text-muted-foreground">
                    Pre-hashed key (hex digits)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-password`} className="text-xs font-medium">
              {value.passwordMode === "plaintext" ? "Password" : "Encrypted Key"}
            </Label>
            <Input
              id={`${idPrefix}-password`}
              type={value.passwordMode === "plaintext" ? "password" : "text"}
              autoComplete="new-password"
              placeholder={
                hasExistingPassword
                  ? "Leave blank to keep current key"
                  : value.passwordMode === "plaintext"
                    ? "Enter password (min. 8 chars)"
                    : "Enter hex-encoded key"
              }
              value={value.password}
              onChange={(e) => onChange({ ...value, password: e.target.value })}
              className={value.passwordMode === "encrypted" ? "font-mono" : ""}
            />
            {hasExistingPassword && (
              <p className="text-xs text-muted-foreground">
                A key is already configured. Leave blank to keep it unchanged.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
