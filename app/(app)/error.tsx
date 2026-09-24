"use client";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-3 px-4 py-12 md:px-8">
      <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-sm text-muted">
        Your data is safe. Try again, and if it keeps happening check the
        server logs{error.digest ? ` for ${error.digest}` : ""}.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="h-10 rounded-[4px] border border-border px-4 text-sm hover:bg-hover"
      >
        Try again
      </button>
    </div>
  );
}
