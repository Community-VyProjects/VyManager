import { AppLayout } from "@/components/layout/AppLayout";
import { HAProxyBackendDetail } from "@/components/load-balancing/HAProxyBackendDetail";

interface Props {
  params: Promise<{ name: string }>;
}

export default async function HAProxyBackendPage({ params }: Props) {
  const { name } = await params;
  return (
    <AppLayout>
      <HAProxyBackendDetail backendName={decodeURIComponent(name)} />
    </AppLayout>
  );
}
