"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSessionStore } from "@/store/session-store";

export function SSHNotConfigured() {
  const t = useTranslations("console");
  const appliance = useSessionStore((s) => s.appliance);

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-6">
        <TriangleAlert className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{t("sshNotConfigured.title")}</p>
          <p className="text-sm text-muted-foreground">
            {t("sshNotConfigured.description")}
            {!appliance && (
              <>
                {" "}
                {t.rich("sshNotConfigured.openSiteManager", {
                  link: (chunks) => (
                    <Link href="/sites" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
                      {chunks}
                    </Link>
                  ),
                })}
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}