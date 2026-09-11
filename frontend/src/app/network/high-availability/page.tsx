"use client";

export const dynamic = 'force-dynamic';

import { AppLayout } from "@/components/layout/AppLayout";
import { HighAvailabilityContent } from "@/components/high-availability/HighAvailabilityContent";
import { Suspense } from "react";

export default function HighAvailabilityPage() {
  return (
    <AppLayout>
      <Suspense>
        <HighAvailabilityContent />
      </Suspense>
    </AppLayout>
  );
}
