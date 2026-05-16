import { redirect } from "next/navigation";

/** Legacy route — custom chains live on the policies page */
export default function FirewallChainsRedirectPage({
  searchParams,
}: {
  searchParams?: { section?: string; chain?: string; view?: string };
}) {
  const params = new URLSearchParams();
  params.set("section", searchParams?.section === "ipv6" ? "ipv6" : "ipv4");
  params.set("view", searchParams?.view ?? "custom-chains");
  if (searchParams?.chain) {
    params.set("chain", searchParams.chain);
    params.set("custom", "1");
  }
  redirect(`/firewall/policies?${params.toString()}`);
}
