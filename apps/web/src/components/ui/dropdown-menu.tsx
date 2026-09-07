"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handleOutsideClick = () => setOpen(false);
    if (open) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  asChild,
  children,
  className,
}: {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(DropdownMenuContext);
  if (!ctx) throw new Error("DropdownMenuTrigger must be in DropdownMenu");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      ctx.setOpen(!ctx.open);
    } else if (e.key === "Escape") {
      ctx.setOpen(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={ctx.open}
      aria-haspopup="menu"
      aria-label="Open menu"
      onClick={() => ctx.setOpen(!ctx.open)}
      onKeyDown={handleKeyDown}
      className={cn("cursor-pointer inline-flex", className)}
    >
      {children}
    </div>
  );
}

export function DropdownMenuContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(DropdownMenuContext);
  if (!ctx || !ctx.open) return null;

  return (
    <div
      role="menu"
      aria-label="Menu options"
      className={cn(
        "absolute right-0 mt-2 w-48 rounded-md border border-neutral-200 bg-white p-1 text-neutral-950 shadow-md z-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const ctx = React.useContext(DropdownMenuContext);

  return (
    <button
      type="button"
      role="menuitem"
      aria-label={typeof children === "string" ? children : undefined}
      onClick={() => {
        onClick?.();
        ctx?.setOpen(false);
      }}
      className={cn(
        "flex w-full items-center rounded-sm px-2 py-1.5 text-xs text-left transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus:bg-neutral-100 focus:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-50",
        className
      )}
    >
      {children}
    </button>
  );
}
