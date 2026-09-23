import Image from "next/image";
import { connection } from "next/server";
import { UnlockForm } from "@/components/unlock-form";
import { getSecrets } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function UnlockPage() {
  await connection();
  const { accessKey, authSecret } = getSecrets();
  const misconfigured = !accessKey || !authSecret;

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Image
          src="/logo.png"
          alt=""
          width={48}
          height={48}
          className="mb-4 rounded-[12px]"
        />
        <h1 className="mb-1 text-[32px] font-semibold tracking-tight">Hippo</h1>
        <p className="mb-8 text-sm text-muted">Enter your key to unlock this device.</p>
        {misconfigured ? (
          <p className="text-sm text-red-700 dark:text-red-400">
            Server is missing ACCESS_KEY or AUTH_SECRET. Set them in your environment.
          </p>
        ) : (
          <UnlockForm />
        )}
      </div>
    </div>
  );
}
