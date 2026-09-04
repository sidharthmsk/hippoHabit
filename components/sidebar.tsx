"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIORITIES, PRIORITY_LABELS } from "@/lib/priority";
import type { NavData } from "@/lib/types";

type Props = {
  nav: NavData;
  onNavigate?: () => void;
};

export function Sidebar({ nav, onNavigate }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col px-2 py-3 text-sm">
      <div className="mb-4 px-2 text-[15px] font-semibold tracking-tight">
        Habits
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        <Section>
          <NavLink href="/" active={pathname === "/"} onNavigate={onNavigate}>
            All
          </NavLink>
          <NavLink
            href="/archived"
            active={pathname === "/archived"}
            onNavigate={onNavigate}
          >
            Archived
          </NavLink>
        </Section>

        {nav.groups.length > 0 && (
          <Section label="Groups">
            {nav.groups.map((group) => (
              <NavLink
                key={group.id}
                href={`/g/${group.id}`}
                active={pathname === `/g/${group.id}`}
                onNavigate={onNavigate}
              >
                {group.name}
              </NavLink>
            ))}
          </Section>
        )}

        <Section label="Priority">
          {PRIORITIES.map((priority) => (
            <NavLink
              key={priority}
              href={`/p/${priority}`}
              active={pathname === `/p/${priority}`}
              onNavigate={onNavigate}
            >
              {PRIORITY_LABELS[priority]}
            </NavLink>
          ))}
        </Section>
      </div>
      <div className="mt-4 flex flex-col gap-0.5 border-t border-border pt-3">
        <NavLink
          href="/habits/new"
          active={pathname === "/habits/new"}
          onNavigate={onNavigate}
        >
          New habit
        </NavLink>
        <NavLink
          href="/settings"
          active={pathname === "/settings"}
          onNavigate={onNavigate}
        >
          Settings
        </NavLink>
      </div>
    </nav>
  );
}

function Section({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {label && (
        <div className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wide text-muted">
          {label}
        </div>
      )}
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
  onNavigate,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`rounded-[4px] px-2 py-1.5 leading-5 ${
        active
          ? "bg-hover font-medium text-foreground"
          : "text-foreground/80 hover:bg-hover"
      }`}
    >
      {children}
    </Link>
  );
}
