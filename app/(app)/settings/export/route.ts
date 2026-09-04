import { requireUnlocked } from "@/lib/auth";
import { exportSnapshot } from "@/lib/backup";
import { getDb } from "@/lib/db";
import { today } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireUnlocked();
  const snapshot = exportSnapshot(getDb());
  const filename = `habits-${today()}.json`;
  return new Response(JSON.stringify(snapshot, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
