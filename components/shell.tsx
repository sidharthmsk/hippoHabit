"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { calendarDate } from "@/lib/timezone";
import type { NavData } from "@/lib/types";
import { Sidebar } from "./sidebar";
import { Toaster } from "./toast";

export function Shell({
  nav,
  today,
  timeZone,
  children,
}: {
  nav: NavData;
  /** The server's idea of today, used to notice when the date rolls over. */
  today: string;
  timeZone: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);

  useDayRollover(today, timeZone);

  useEffect(() => {
    if (!open) return;
    const panel = drawer.current;
    panel?.querySelector<HTMLElement>("a, button")?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      // Keep Tab inside the drawer while it is open.
      if (event.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>("a, button")];
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    const button = menuButton.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      button?.focus();
    };
  }, [open]);

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-border bg-background md:block">
        <Sidebar nav={nav} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/90 px-3 py-2 backdrop-blur md:hidden">
          <button
            ref={menuButton}
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-[4px] outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-[4px] px-1 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Image
              src="/logo.png"
              alt=""
              width={22}
              height={22}
              className="rounded-[5px]"
            />
            <span className="text-[15px] font-semibold">hippoHabit</span>
          </Link>
        </header>
        <main className="min-h-0 flex-1">{children}</main>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <aside
            ref={drawer}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 w-64 bg-background shadow-xl"
          >
            <Sidebar nav={nav} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <Toaster />
    </div>
  );
}

/** Refresh server data when the calendar day changes while the app is open. */
function useDayRollover(today: string, timeZone: string) {
  const router = useRouter();
  useEffect(() => {
    function check() {
      if (document.visibilityState !== "visible") return;
      if (calendarDate(new Date(), timeZone) !== today) router.refresh();
    }
    const timer = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [today, timeZone, router]);
}
