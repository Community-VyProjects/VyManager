"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, X, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { COUNTRIES } from "./CountrySelect";

interface CountryMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  label: string;
  id: string;
}

export function CountryMultiSelect({ value, onChange, label, id }: CountryMultiSelectProps) {
  const t = useTranslations("firewallCommon");
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Normalize value to always be an array of uppercase codes
  const normalizedValue = (value || []).map(v => v.toUpperCase());

  // Filter countries based on search query
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) {
      return COUNTRIES;
    }

    const query = searchQuery.toLowerCase();
    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const toggleCountry = (code: string) => {
    if (normalizedValue.includes(code)) {
      onChange(normalizedValue.filter(c => c !== code));
    } else {
      onChange([...normalizedValue, code]);
    }
  };

  const removeCountry = (code: string) => {
    onChange(normalizedValue.filter(c => c !== code));
  };

  const getCountryName = (code: string) => {
    return COUNTRIES.find(c => c.code === code.toUpperCase())?.name || code;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            id={id}
          >
            <span className="truncate">
              {normalizedValue.length === 0
                ? t("countrySelect.placeholder")
                : t("countrySelect.selected", { count: normalizedValue.length })}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("countrySelect.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <div
                  key={country.code}
                  className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer"
                  onClick={() => toggleCountry(country.code)}
                >
                  <Checkbox
                    checked={normalizedValue.includes(country.code)}
                    onCheckedChange={() => toggleCountry(country.code)}
                  />
                  <span className="flex-1">
                    {country.name} ({country.code})
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t("countrySelect.noResults")}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected countries as badges */}
      {normalizedValue.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {normalizedValue.map((code) => (
            <Badge key={code} variant="secondary" className="text-xs">
              {getCountryName(code)} ({code})
              <button
                type="button"
                aria-label={t("countrySelect.remove", { country: getCountryName(code) })}
                onClick={() => removeCountry(code)}
                className="ml-1 rounded-full hover:bg-muted"
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
