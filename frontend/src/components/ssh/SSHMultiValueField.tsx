"use client";

import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface SSHMultiValueFieldProps {
  label: string;
  description?: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  validate?: (val: string) => string | null;
}

/** Add/remove list of free-text values rendered as removable badges. */
export function SSHMultiValueField({
  label,
  description,
  placeholder,
  values,
  onChange,
  validate,
}: SSHMultiValueFieldProps) {
  const [input, setInput] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleAdd = () => {
    const val = input.trim();
    if (!val) return;
    if (validate) {
      const err = validate(val);
      if (err) {
        setFieldError(err);
        return;
      }
    }
    if (values.includes(val)) {
      setFieldError("Already added");
      return;
    }
    onChange([...values, val]);
    setInput("");
    setFieldError(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setFieldError(null);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button type="button" size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((val) => (
            <Badge key={val} variant="secondary" className="font-mono gap-1 pr-1">
              {val}
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== val))}
                className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/** Lightweight IPv4/IPv6 (optionally CIDR) validator. */
export function isValidIP(value: string, allowCidr = false): boolean {
  const cidr = allowCidr ? "(\\/\\d{1,3})?" : "";
  const ipv4 = new RegExp(`^(\\d{1,3}\\.){3}\\d{1,3}${cidr}$`);
  const ipv6 = new RegExp(`^[0-9a-fA-F:]+${cidr}$`);
  return ipv4.test(value) || ipv6.test(value);
}
