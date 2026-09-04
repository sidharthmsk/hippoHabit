import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6">
      <p className="text-muted">Page not found.</p>
      <Link href="/" className="text-sm underline">
        Back to habits
      </Link>
    </div>
  );
}
