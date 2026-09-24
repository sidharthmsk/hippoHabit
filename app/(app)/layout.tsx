import { Shell } from "@/components/shell";
import { requireUnlocked } from "@/lib/auth";
import { getNavData } from "@/lib/queries";
import { getAppTimezone, today } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUnlocked();
  return (
    <Shell nav={getNavData()} today={today()} timeZone={getAppTimezone()}>
      {children}
    </Shell>
  );
}
