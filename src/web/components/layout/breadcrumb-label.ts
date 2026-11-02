"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

// Lets a detail page replace the raw id in the breadcrumb with a readable name (e.g. /roles/<uuid> -> "Accountant").
const labels = new Map<string, string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));

export function useBreadcrumbLabel(label: string | null | undefined) {
  const path = usePathname();
  useEffect(() => {
    if (!label) return;
    labels.set(path, label);
    emit();
    return () => {
      labels.delete(path);
      emit();
    };
  }, [path, label]);
}

export function useBreadcrumbLabelFor(path: string) {
  return useSyncExternalStore(
    subscribe,
    () => labels.get(path),
    () => undefined,
  );
}
