import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
  width = "default",
}: {
  children: React.ReactNode;
  className?: string;
  width?: "default" | "wide" | "narrow";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-5 sm:px-6 lg:px-8 lg:py-8 animate-fade-in",
        width === "wide" && "max-w-[1600px]",
        width === "default" && "max-w-[1280px]",
        width === "narrow" && "max-w-[880px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[26px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[13px] text-muted sm:text-sm">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface/50 px-6 py-14 text-center">
      {Icon && (
        <span className="mb-3 grid size-11 place-items-center rounded-xl bg-elevated">
          <Icon className="size-5 text-faint" />
        </span>
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-negative/25 bg-negative/5 px-5 py-4">
      <p className="text-sm font-medium text-negative">
        Couldn&apos;t load this data
      </p>
      <p className="mt-1 text-[13px] text-muted">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-[13px] font-medium text-accent hover:underline cursor-pointer"
        >
          Try again
        </button>
      )}
    </div>
  );
}
