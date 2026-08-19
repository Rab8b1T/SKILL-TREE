"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 cursor-pointer select-none disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-canvas hover:opacity-88 shadow-[var(--shadow-xs)]",
        accent:
          "bg-accent text-on-accent hover:opacity-90 shadow-[var(--shadow-xs)]",
        secondary:
          "bg-elevated text-ink hairline hover:bg-sunken hover:border-line-strong",
        outline:
          "bg-transparent text-ink hairline hover:bg-elevated hover:border-line-strong",
        ghost: "bg-transparent text-muted hover:bg-elevated hover:text-ink",
        danger:
          "bg-transparent text-negative hairline border-transparent hover:bg-negative/10",
      },
      size: {
        sm: "h-8 px-3 text-[13px] rounded-lg [&_svg]:size-3.5",
        md: "h-10 px-4 text-sm rounded-xl [&_svg]:size-4",
        lg: "h-12 px-6 text-[15px] rounded-xl [&_svg]:size-[18px]",
        pill: "h-10 px-5 text-sm rounded-full [&_svg]:size-4",
        icon: "size-9 rounded-lg [&_svg]:size-4",
        "icon-sm": "size-8 rounded-lg [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
