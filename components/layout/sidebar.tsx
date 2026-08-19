"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Binary, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCfProfile, useLogout, useSession } from "@/lib/queries";
import { PRIMARY_NAV, SECONDARY_NAV, isActive, type NavItem } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { RankProgress } from "@/components/ui/rating";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center rounded-xl text-sm font-medium transition-colors",
        // Icon rail on tablet, full-width rows on desktop.
        "justify-center px-0 py-2.5 lg:justify-start lg:gap-3 lg:px-3",
        active
          ? "bg-elevated text-ink"
          : "text-muted hover:bg-elevated/70 hover:text-ink",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 hidden h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent lg:block" />
      )}
      <Icon className="size-[18px] shrink-0" />
      <span className="hidden lg:inline">{item.label}</span>
    </Link>
  );

  return (
    <li>
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="lg:hidden">
          {item.label}
        </TooltipContent>
      </Tooltip>
    </li>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const handle = session?.user?.cfHandle;
  const { data: profile, isLoading } = useCfProfile(handle);
  const logout = useLogout();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col border-r border-line bg-surface md:flex lg:w-[248px]">
      <div className="flex h-16 items-center justify-center border-b border-line px-3 lg:justify-start lg:px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink">
            <Binary className="size-[18px] text-canvas" />
          </span>
          <span className="hidden lg:block">
            <span className="block text-[15px] font-semibold leading-tight text-ink">
              Skill Tree
            </span>
            <span className="block text-[11px] leading-tight text-faint">
              {handle ?? "Codeforces training"}
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 no-scrollbar">
        <ul className="space-y-1">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </ul>

        <div className="my-4 border-t border-line" />

        <ul className="space-y-1">
          {SECONDARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </ul>
      </nav>

      <div className="border-t border-line p-3">
        <div className="mb-2 hidden lg:block">
          {handle && isLoading ? (
            <Skeleton className="h-[74px] rounded-xl" />
          ) : profile?.user.rating ? (
            <RankProgress rating={profile.user.rating} />
          ) : null}
        </div>

        <div className="hidden lg:block">
          <ThemeToggle />
          {session?.user && (
            <button
              onClick={() => logout.mutate()}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-elevated hover:text-ink"
            >
              <LogOut className="size-[18px] shrink-0" />
              Log out
            </button>
          )}
        </div>
        <div className="flex flex-col items-center gap-1 lg:hidden">
          <ThemeToggle variant="icon" />
        </div>
      </div>
    </aside>
  );
}
