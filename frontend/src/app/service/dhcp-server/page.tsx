"use client";

import { Suspense } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DHCPServerContent } from "@/components/service/dhcp-server/DHCPServerContent";

export const dynamic = "force-dynamic";

export default function DHCPServerPage() {
  return (
    <AppLayout>
      <Suspense>
        <DHCPServerContent />
      </Suspense>
    </AppLayout>
  );
}
