import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-medium whitespace-nowrap rounded-full border",
  {
    variants: {
      variant: {
        neutral: "bg-elevated text-muted border-line",
        accent: "bg-accent-soft text-accent border-accent/25",
        positive: "bg-positive/10 text-positive border-positive/25",
        warning: "bg-warning/10 text-warning border-warning/25",
        negative: "bg-negative/10 text-negative border-negative/25",
        solid: "bg-ink text-canvas border-transparent",
        outline: "bg-transparent text-muted border-line-strong",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        md: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: { variant: "neutral", size: "sm" },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: string;
}

export function Badge({
  className,
  variant,
  size,
  dot,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {dot && (
        <span
          className="size-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dot }}
        />
      )}
      {children}
    </span>
  );
}

export { badgeVariants };
