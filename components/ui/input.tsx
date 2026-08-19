"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full bg-surface hairline rounded-xl text-sm text-ink placeholder:text-faint transition-colors focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent/15 disabled:opacity-50";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(fieldBase, "h-10 px-3.5", className)}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 3, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(fieldBase, "px-3.5 py-2.5 resize-y min-h-[76px]", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(fieldBase, "h-10 px-3 pr-8 cursor-pointer", className)}
    {...props}
  />
));
Select.displayName = "Select";

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-baseline justify-between gap-2 text-[13px] font-medium text-ink"
      >
        {label}
        {hint && (
          <span className="text-[11px] font-normal text-faint">{hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}
