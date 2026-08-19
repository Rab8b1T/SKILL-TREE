"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Binary, LogOut, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCfProfile, useLogout, useSession } from "@/lib/queries";
import { PRIMARY_NAV, SECONDARY_NAV, isActive } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { ratingColor } from "@/lib/cf";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function MobileTopBar() {
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const { data: profile } = useCfProfile(handle);
  const rating = profile?.user.rating;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/85 px-4 backdrop-blur-xl md:hidden">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-ink">
          <Binary className="size-3.5 text-canvas" />
        </span>
        <span className="text-sm font-semibold text-ink">Skill Tree</span>
      </Link>
      {rating ? (
        <span
          className="rounded-full bg-elevated px-2.5 py-1 font-mono text-[11px] font-semibold tabular-nums"
          style={{ color: ratingColor(rating) }}
        >
          {rating}
        </span>
      ) : null}
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: session } = useSession();
  const logout = useLogout();

  const moreActive = SECONDARY_NAV.some((i) => isActive(pathname, i.href));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 backdrop-blur-xl md:hidden">
        <div className="flex items-stretch pb-[env(safe-area-inset-bottom)]">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors",
                  active ? "text-accent" : "text-faint",
                )}
              >
                <Icon className="size-[20px]" />
                <span className="text-[10px] font-medium leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-1 cursor-pointer flex-col items-center gap-1 py-2.5 transition-colors",
              moreActive ? "text-accent" : "text-faint",
            )}
          >
            <MoreHorizontal className="size-[20px]" />
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>More</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-1 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {SECONDARY_NAV.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-elevated text-ink"
                      : "text-muted hover:bg-elevated hover:text-ink",
                  )}
                >
                  <Icon className="size-[18px]" />
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-1">
              <ThemeToggle />
            </div>
            {session?.user && (
              <button
                onClick={() => {
                  setMoreOpen(false);
                  logout.mutate();
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-elevated hover:text-ink"
              >
                <LogOut className="size-[18px]" />
                Log out
              </button>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
