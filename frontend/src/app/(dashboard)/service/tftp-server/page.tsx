"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { TFTPServerContent } from "@/components/service/tftp-server/TFTPServerContent";

export default function TFTPServerPage() {
  return (
    <AppLayout>
      <TFTPServerContent />
    </AppLayout>
  );
}
