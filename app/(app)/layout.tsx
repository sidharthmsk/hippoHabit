import { Shell } from "@/components/shell";
import { requireUnlocked } from "@/lib/auth";
import { getNavData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUnlocked();
  const nav = getNavData();
  return <Shell nav={nav}>{children}</Shell>;
}
