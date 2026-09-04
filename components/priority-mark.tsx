import Link from "next/link";
import { PRIORITY_LABELS, type Priority } from "@/lib/priority";

const TONE: Record<Priority, string> = {
  high: "text-red-700 dark:text-red-400",
  medium: "text-muted",
  low: "text-muted/70",
};

export function PriorityMark({
  priority,
  href = true,
}: {
  priority: Priority;
  href?: boolean;
}) {
  const label = PRIORITY_LABELS[priority];
  const className = `text-[11px] ${TONE[priority]}`;
  if (!href) {
    return <span className={className}>{label}</span>;
  }
  return (
    <Link href={`/p/${priority}`} className={`${className} hover:underline`}>
      {label}
    </Link>
  );
}
