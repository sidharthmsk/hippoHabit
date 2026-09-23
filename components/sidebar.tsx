"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReorderGrip, useGroupLane } from "./reorder-lane";
import { PRIORITIES, PRIORITY_LABELS } from "@/lib/priority";
import type { NavData } from "@/lib/types";

type Props = {
  nav: NavData;
  onNavigate?: () => void;
};

export function Sidebar({ nav, onNavigate }: Props) {
  const pathname = usePathname();
  const groups = useGroupLane(nav.groups.map((group) => group.id));
  const groupById = new Map(nav.groups.map((group) => [group.id, group]));

  return (
    <nav className="flex h-full flex-col px-2 py-3 text-sm">
      <div className="mb-4 flex items-center gap-2 px-2">
        <Image
          src="/logo.svg"
          alt=""
          width={22}
          height={22}
          unoptimized
          className="rounded-[5px]"
        />
        <span className="text-[15px] font-semibold tracking-tight">hippoHabit</span>
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
            {groups.ids.map((id) => {
              const group = groupById.get(id);
              if (!group) return null;
              return (
                <div key={id} className="flex items-center">
                  {groups.ids.length > 1 ? (
                    <ReorderGrip
                      label={`Reorder ${group.name}`}
                      {...groups.grip(id)}
                    />
                  ) : null}
                  <NavLink
                    href={`/g/${group.id}`}
                    active={pathname === `/g/${group.id}`}
                    onNavigate={onNavigate}
                    className="min-w-0 flex-1"
                  >
                    {group.name}
                  </NavLink>
                </div>
              );
            })}
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
  className,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`rounded-[4px] px-2 py-1.5 leading-5 ${className ?? ""} ${
        active
          ? "bg-hover font-medium text-foreground"
          : "text-foreground/80 hover:bg-hover"
      }`}
    >
      {children}
    </Link>
  );
}
