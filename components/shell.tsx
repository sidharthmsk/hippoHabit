"use client";

import Image from "next/image";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import type { NavData } from "@/lib/types";

export function Shell({
  nav,
  children,
}: {
  nav: NavData;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-border bg-background md:block">
        <Sidebar nav={nav} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/90 px-3 py-2 backdrop-blur md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-[4px] hover:bg-hover"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <Image
            src="/logo.png"
            alt=""
            width={22}
            height={22}
            className="rounded-[5px]"
          />
          <span className="text-[15px] font-semibold">hippoHabit</span>
        </header>
        <main className="min-h-0 flex-1">{children}</main>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-background shadow-xl">
            <Sidebar nav={nav} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}
