"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  variant = "full",
  className,
}: {
  variant?: "full" | "icon";
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = resolvedTheme === "dark";
  const toggle = () => setTheme(isDark ? "light" : "dark");

  // Theme is unknown until hydration; render a neutral placeholder so the
  // markup width doesn't shift.
  if (!mounted) {
    return (
      <div
        aria-hidden
        className={cn(variant === "icon" ? "size-9" : "h-10 w-full", className)}
      />
    );
  }

  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Light mode" : "Dark mode";

  if (variant === "icon") {
    return (
      <button
        onClick={toggle}
        aria-label={label}
        className={cn(
          "grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer",
          className,
        )}
      >
        <Icon className="size-4" />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer",
        className,
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      {label}
    </button>
  );
}
