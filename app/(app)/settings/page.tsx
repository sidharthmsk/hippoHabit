import { ImportForm } from "@/components/import-form";
import { logoutAction } from "@/lib/actions";
import { getAppTimezone } from "@/lib/timezone";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string }>;
}) {
  const { imported } = await searchParams;

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
      </dl>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold tracking-tight">Backup</h2>
        <p className="mb-4 text-sm text-muted">
          Download every habit, group, and check-in as a JSON file. Import
          replaces what is on this device.
        </p>
        {imported ? (
          <p className="mb-4 text-sm text-done">Imported. Existing data was replaced.</p>
        ) : null}
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
        This device will ask for the access key again.
      </p>
    </div>
  );
}
