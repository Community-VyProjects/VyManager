"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Languages, Loader2, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { isLocale, LOCALE_COOKIE, localeNames, locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

const ONE_YEAR = 60 * 60 * 24 * 365;

function readSavedLocale(): Locale | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return isLocale(value) ? value : null;
}

// Set client-side (not via a server action) so it also works behind reverse
// proxies that rewrite the Host / Origin headers.
function writeSavedLocale(locale: Locale | null) {
  document.cookie = locale
    ? `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; path=/; max-age=${ONE_YEAR}; samesite=lax`
    : `${LOCALE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

function OptionButton({
  selected,
  onClick,
  disabled,
  icon,
  label,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
  icon?: React.ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-all hover:border-primary/50 disabled:opacity-60",
        selected && "border-primary ring-1 ring-primary/30"
      )}
    >
      {icon}
      <span className="flex-1 min-w-0">
        <span className="block font-medium truncate">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground truncate">{hint}</span>}
      </span>
      {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
    </button>
  );
}

/**
 * Language switcher. A manual choice is stored in a cookie and overrides the
 * browser's Accept-Language; "Browser default" clears it again.
 */
export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<Locale | null>(null);
  const [isPending, startTransition] = useTransition();

  // The cookie is only readable on the client; load it once mounted so the
  // server and first client render match.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with cookie after hydration
    setSaved(readSavedLocale());
  }, []);

  function choose(next: Locale | null) {
    writeSavedLocale(next);
    setSaved(next);
    startTransition(() => {
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <Languages className="h-4 w-4" />
            {localeNames[locale]}
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="w-full justify-between gap-2">
            <span className="truncate">{localeNames[locale]}</span>
            <Languages className="h-4 w-4 text-muted-foreground shrink-0" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <OptionButton
            selected={saved === null}
            onClick={() => choose(null)}
            disabled={isPending}
            icon={<Monitor className="h-4 w-4 text-muted-foreground shrink-0" />}
            label={t("browserDefault")}
            hint={t("browserDefaultHint")}
          />
          {locales.map((l) => (
            <OptionButton
              key={l}
              selected={saved === l}
              onClick={() => choose(l)}
              disabled={isPending}
              icon={
                isPending && saved === l ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                ) : (
                  <Languages className="h-4 w-4 text-muted-foreground shrink-0" />
                )
              }
              label={localeNames[l]}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
