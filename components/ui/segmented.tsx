"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

/** Compact view switcher; labels collapse to icons on narrow screens. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  hideLabelsOnMobile = true,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  hideLabelsOnMobile?: boolean;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xl bg-sunken p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all cursor-pointer",
              active
                ? "bg-surface text-ink shadow-[var(--shadow-xs)]"
                : "text-muted hover:text-ink",
            )}
          >
            {Icon && <Icon className="size-3.5 shrink-0" />}
            <span className={cn(hideLabelsOnMobile && "hidden sm:inline")}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
