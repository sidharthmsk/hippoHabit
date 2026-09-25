import { ImportForm } from "@/components/import-form";
import { ThemeForm } from "@/components/theme-form";
import { logoutAction } from "@/lib/actions";
import { readAuthConfig } from "@/lib/auth-config";
import { getDb } from "@/lib/db";
import { readTheme } from "@/lib/settings";
import { getAppTimezone } from "@/lib/timezone";

export default function SettingsPage() {
  const { password, oidc } = readAuthConfig();
  const signIn = [password && "Password", oidc && oidc.name]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="mb-8 text-[32px] font-semibold tracking-tight md:text-[40px]">
        Settings
      </h1>
      <dl className="mb-10 space-y-3 text-sm">
        <div>
          <dt className="text-muted">Timezone</dt>
          <dd>{getAppTimezone()}</dd>
        </div>
        <div>
          <dt className="text-muted">Streaks</dt>
          <dd>Weekly, Monday to Sunday</dd>
        </div>
        <div>
          <dt className="text-muted">Sign-in</dt>
          <dd>{signIn || "Not configured"}</dd>
        </div>
      </dl>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold tracking-tight">Appearance</h2>
        <p className="mb-4 text-sm text-muted">
          Saved on the server, so every device you sign in on uses it.
        </p>
        <ThemeForm saved={readTheme(getDb())} />
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold tracking-tight">Backup</h2>
        <p className="mb-4 text-sm text-muted">
          Download every habit, group, and check-in as a JSON file. Importing a
          hippoHabit backup replaces everything here. You can also import a
          Beaver Habits JSON export; its habits are merged in and nothing is
          deleted.
        </p>
        <div className="mb-6">
          <a
            href="/settings/export"
            className="inline-flex h-10 items-center rounded-[4px] border border-border px-4 text-sm hover:bg-hover"
          >
            Export
          </a>
        </div>
        <ImportForm />
      </section>

      <form action={logoutAction}>
        <button
          type="submit"
          className="h-10 rounded-[4px] border border-border px-4 text-sm hover:bg-hover"
        >
          Log out
        </button>
      </form>
      <p className="mt-3 text-xs text-muted">
        You will need to sign in again on this device.
      </p>
    </div>
  );
}
