"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  side?: "left" | "right";
}

export function Sheet({
  open,
  onOpenChange,
  children,
  side = "right",
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={`absolute top-0 flex h-full w-full max-w-md flex-col border-stone-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          side === "right"
            ? "right-0 translate-x-0 border-l"
            : "left-0 translate-x-0 border-r"
        }`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({
  title,
  description,
  onClose,
}: {
  title: string;
  description?: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between border-b border-stone-100 px-5 py-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
          {title}
        </p>
        {description && (
          <p className="mt-1 text-sm text-stone-500">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-800"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
