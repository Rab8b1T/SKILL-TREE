"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { RatingChip } from "@/components/ui/rating";
import { Badge } from "@/components/ui/badge";

export interface ProblemRowProps {
  name: string;
  index?: string;
  url: string;
  rating?: number | null;
  tags?: string[];
  /** Rendered on the right: buttons, status pills, timers. */
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  done?: boolean;
  className?: string;
  /** Tag list is withheld until the technique has been named. */
  sealed?: boolean;
}

export function ProblemRow({
  name,
  index,
  url,
  rating,
  tags,
  actions,
  meta,
  done,
  className,
  sealed,
}: ProblemRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-elevated",
        done && "opacity-55",
        className,
      )}
    >
      {!sealed && <RatingChip rating={rating} className="shrink-0" />}

      <div className="min-w-0 grow">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex max-w-full items-center gap-1.5"
        >
          <span
            className={cn(
              "truncate text-[13px] font-medium text-ink group-hover:underline",
              done && "line-through",
            )}
          >
            {index ? `${index}. ` : ""}
            {name}
          </span>
          <ExternalLink className="size-3 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
        </a>

        {sealed ? (
          <p className="mt-1 text-[11px] italic text-faint">
            Rating and tags unlock when the round ends.
          </p>
        ) : tags?.length ? (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {tags.slice(0, 4).map((t) => (
              <Badge key={t} variant="outline" size="sm">
                {t}
              </Badge>
            ))}
            {tags.length > 4 && (
              <span className="text-[10px] text-faint">+{tags.length - 4}</span>
            )}
          </div>
        ) : null}

        {meta && <div className="mt-1 text-[11px] text-faint">{meta}</div>}
      </div>

      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}
