import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  color,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: LucideIcon;
  color?: string;
  className?: string;
}) {
  return (
    <Card className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">
          {label}
        </p>
        <p
          className="mt-1.5 text-2xl font-semibold leading-none tabular-nums text-ink"
          style={color ? { color } : undefined}
        >
          {value}
        </p>
        {sub && <p className="mt-1.5 text-[12px] leading-snug text-muted">{sub}</p>}
      </div>
      {Icon && (
        <span
          className="grid size-9 shrink-0 place-items-center rounded-xl"
          style={{
            backgroundColor: `color-mix(in srgb, ${color ?? "var(--accent)"} 12%, transparent)`,
          }}
        >
          <Icon className="size-4" style={{ color: color ?? "var(--accent)" }} />
        </span>
      )}
    </Card>
  );
}
