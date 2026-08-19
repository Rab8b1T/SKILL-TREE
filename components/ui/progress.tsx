import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps {
  value: number;
  color?: string;
  className?: string;
  size?: "sm" | "md";
  /** Shows a subtle striped overflow cap when value exceeds 100. */
  overflow?: boolean;
}

export function Progress({
  value,
  color = "var(--accent)",
  className,
  size = "md",
  overflow = false,
}: ProgressProps) {
  const pct = Math.max(0, Math.min(100, value));
  const isOver = overflow && value > 100;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "w-full overflow-hidden rounded-full bg-sunken",
        size === "sm" ? "h-1.5" : "h-2",
        className,
      )}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${pct}%`,
          backgroundColor: color,
          backgroundImage: isOver
            ? "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.28) 4px, rgba(255,255,255,0.28) 8px)"
            : undefined,
        }}
      />
    </div>
  );
}

/** Circular variant used for the headline day score. */
export function ProgressRing({
  value,
  size = 132,
  stroke = 10,
  color = "var(--accent)",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--sunken)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (pct / 100) * circumference}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
