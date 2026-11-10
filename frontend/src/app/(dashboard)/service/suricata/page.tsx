"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SuricataContent } from "@/components/service/suricata/SuricataContent";

function SuricataPageInner() {
  return (
    <AppLayout>
      <SuricataContent />
    </AppLayout>
  );
}

export default function SuricataPage() {
  return (
    <Suspense>
      <SuricataPageInner />
    </Suspense>
  );
}
