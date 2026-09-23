"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  startTransition,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from "react";
import { moveId, targetIndex } from "@/lib/order";

const DRAG_THRESHOLD_PX = 8;

export const gripClassName =
  "flex h-10 w-10 shrink-0 touch-none items-center justify-center rounded-[4px] text-muted hover:bg-hover md:h-7 md:w-7";

export function GripIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="5" cy="3.5" r="1.15" />
      <circle cx="5" cy="8" r="1.15" />
      <circle cx="5" cy="12.5" r="1.15" />
      <circle cx="11" cy="3.5" r="1.15" />
      <circle cx="11" cy="8" r="1.15" />
      <circle cx="11" cy="12.5" r="1.15" />
    </svg>
  );
}

export type GripBindings = {
  ref: Ref<HTMLButtonElement>;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
};

type Drag = {
  id: string;
  pointerId: number;
  startY: number;
  origin: readonly string[];
  dragging: boolean;
  stop: () => void;
};

export function useManualOrder(
  ids: readonly string[],
  onCommit: (ids: readonly string[]) => Promise<void>,
): { ids: readonly string[]; grip: (id: string) => GripBindings } {
  const key = ids.join("\0");
  const [trackedKey, setTrackedKey] = useState(key);
  const [order, setOrder] = useState<readonly string[]>(() => ids.slice());
  if (trackedKey !== key) {
    setTrackedKey(key);
    setOrder(ids.slice());
  }
  const display = trackedKey === key ? order : ids;

  const renderedRef = useRef(display);
  const latestRef = useRef(display);
  const idsRef = useRef(ids);
  const onCommitRef = useRef(onCommit);
  const dragRef = useRef<Drag | null>(null);
  const nodesRef = useRef(new Map<string, HTMLButtonElement>());
  const commitGen = useRef(0);
  const seenKey = useRef(key);

  useLayoutEffect(() => {
    if (seenKey.current !== key) {
      dragRef.current?.stop();
      dragRef.current = null;
      seenKey.current = key;
    }
    renderedRef.current = display;
    idsRef.current = ids;
    onCommitRef.current = onCommit;
    if (!dragRef.current?.dragging) latestRef.current = display;
  }, [display, ids, key, onCommit]);

  function midpoints(sequence: readonly string[]): number[] {
    return sequence.map((id) => {
      const node = nodesRef.current.get(id);
      const row = node?.parentElement ?? node;
      if (!row) return 0;
      const rect = row.getBoundingClientRect();
      return rect.top + rect.height / 2;
    });
  }

  function commit(next: readonly string[], baseline: readonly string[]) {
    if (sameIds(next, baseline)) return;
    const generation = ++commitGen.current;
    const snapshot = next.slice();
    startTransition(() => {
      void onCommitRef.current(snapshot).catch((error: unknown) => {
        if (isNextRedirect(error)) throw error;
        if (generation !== commitGen.current) return;
        const restored = idsRef.current.slice();
        latestRef.current = restored;
        setOrder(restored);
      });
    });
  }

  function grip(id: string): GripBindings {
    return {
      ref(node) {
        if (node) nodesRef.current.set(id, node);
        else nodesRef.current.delete(id);
      },
      onPointerDown(event) {
        if (latestRef.current.length < 2) return;
        event.stopPropagation();
        event.preventDefault();
        const target = event.currentTarget;
        target.focus();
        const pointerId = event.pointerId;
        const startY = event.clientY;
        const origin = latestRef.current.slice();

        const onMove = (ev: PointerEvent) => {
          const drag = dragRef.current;
          if (!drag || ev.pointerId !== drag.pointerId) return;
          if (!drag.dragging) {
            if (Math.abs(ev.clientY - drag.startY) < DRAG_THRESHOLD_PX) return;
            drag.dragging = true;
          }
          const sequence = renderedRef.current;
          const to = targetIndex(ev.clientY, midpoints(sequence));
          const next = moveId(sequence, drag.id, to);
          if (sameIds(next, sequence)) return;
          latestRef.current = next;
          setOrder(next);
        };

        const stop = () => {
          target.removeEventListener("pointermove", onMove);
          target.removeEventListener("pointerup", onUp);
          target.removeEventListener("pointercancel", onCancel);
        };

        const finish = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          stop();
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== pointerId) return;
          dragRef.current = null;
          if (!drag.dragging) return;
          if (ev.type === "pointercancel") {
            latestRef.current = drag.origin.slice();
            setOrder(drag.origin);
            return;
          }
          commit(latestRef.current, drag.origin);
        };

        const onUp = (ev: PointerEvent) => finish(ev);
        const onCancel = (ev: PointerEvent) => finish(ev);

        dragRef.current = {
          id,
          pointerId,
          startY,
          origin,
          dragging: false,
          stop,
        };
        target.setPointerCapture(pointerId);
        target.addEventListener("pointermove", onMove);
        target.addEventListener("pointerup", onUp);
        target.addEventListener("pointercancel", onCancel);
      },
      onKeyDown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          const drag = dragRef.current;
          drag?.stop();
          dragRef.current = null;
          const restored = (drag ? drag.origin : idsRef.current).slice();
          latestRef.current = restored;
          setOrder(restored);
          return;
        }
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        const sequence = latestRef.current;
        if (sequence.length < 2) return;
        event.preventDefault();
        const index = sequence.indexOf(id);
        if (index < 0) return;
        const to = event.key === "ArrowUp" ? index - 1 : index + 1;
        if (to < 0 || to >= sequence.length) return;
        const next = moveId(sequence, id, to);
        latestRef.current = next;
        setOrder(next);
        commit(next, sequence);
      },
    };
  }

  return { ids: display, grip };
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}
