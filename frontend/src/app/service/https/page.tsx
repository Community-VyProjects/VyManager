"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { HTTPSContent } from "@/components/service/https/HTTPSContent";

export default function HTTPSPage() {
  return (
    <AppLayout>
      <HTTPSContent />
    </AppLayout>
  );
}
