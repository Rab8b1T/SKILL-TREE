"use client";

import { usePathname } from "next/navigation";
import { Binary } from "lucide-react";
import { useSession } from "@/lib/queries";
import { Sidebar } from "./sidebar";
import { MobileNav, MobileTopBar } from "./mobile-nav";
import { AuthScreen } from "@/components/auth-screen";

/** Routes that must render without a session, or the flow can't complete. */
const PUBLIC_ROUTES = ["/reset-password"];

/**
 * Gates the whole app on a session. Doing it here rather than in middleware
 * keeps one source of truth — the same /api/auth/me the sidebar reads — and
 * avoids a redirect flash on every navigation.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, isLoading } = useSession();

  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <span className="grid size-12 animate-pulse place-items-center rounded-2xl bg-ink">
          <Binary className="size-6 text-canvas" />
        </span>
      </div>
    );
  }

  if (!data?.user) return <AuthScreen />;

  return (
    <>
      <Sidebar />
      <MobileTopBar />
      <main className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[72px] lg:pl-[248px]">
        {children}
      </main>
      <MobileNav />
    </>
  );
}
