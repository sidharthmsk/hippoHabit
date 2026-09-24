"use client";

import { useEffect, useState } from "react";

const EVENT = "hippohabit:toast";

/** Show a short message at the bottom of the screen. Safe to call from any client code. */
export function showToast(message: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: message }));
}

export function Toaster() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function onToast(event: Event) {
      setMessage((event as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 4000);
    }
    window.addEventListener(EVENT, onToast);
    return () => {
      window.removeEventListener(EVENT, onToast);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
    >
      {message && (
        <div className="pointer-events-auto rounded-[6px] bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {message}
        </div>
      )}
    </div>
  );
}
