"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ContainerContent } from "@/components/container/ContainerContent";

function ContainersPageInner() {
  return (
    <AppLayout>
      <ContainerContent />
    </AppLayout>
  );
}

export default function ContainersPage() {
  return (
    <Suspense>
      <ContainersPageInner />
    </Suspense>
  );
}
