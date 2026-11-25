"use client";

import { useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { filterCountries, localizeCountries } from "./countries";

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  id: string;
  /** When set, a first item with this label clears the value (onChange("")). */
  noneLabel?: string;
}

const NONE = "__none__";


export function CountrySelect({ value, onChange, label, id, noneLabel }: CountrySelectProps) {
  const t = useTranslations("firewallCommon");
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState("");

  // Names in the UI locale; search matches the localized name or the code.
  const countries = useMemo(() => localizeCountries(locale), [locale]);
  const filteredCountries = useMemo(() => filterCountries(countries, searchQuery), [countries, searchQuery]);

  // Get selected country name for display
  const selectedCountry = countries.find((c) => c.code === value.toUpperCase());

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value ? value.toUpperCase() : noneLabel ? NONE : ""}
        onValueChange={(next) => onChange(next === NONE ? "" : next)}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={t("countrySelect.placeholderOne")}>
            {selectedCountry
              ? `${selectedCountry.name} (${selectedCountry.code})`
              : !value && noneLabel ? noneLabel : value ? value.toUpperCase() : t("countrySelect.placeholderOne")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <div className="p-2 sticky top-0 bg-background border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("countrySelect.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {noneLabel && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name} ({country.code})
                </SelectItem>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t("countrySelect.noResults")}
              </div>
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}
