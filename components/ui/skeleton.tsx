import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton rounded-lg", className)} {...props} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn("bg-surface hairline rounded-2xl p-5 space-y-3", className)}
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}
