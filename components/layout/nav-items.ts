import {
  BarChart3,
  Compass,
  LayoutDashboard,
  Layers,
  ListOrdered,
  Settings,
  Swords,
  Target,
  Timer,
  Undo2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/coach", label: "Coach", icon: Compass },
  { href: "/practice", label: "Practice", icon: Target },
  { href: "/contest", label: "Contest", icon: Swords },
  { href: "/ladders", label: "Ladders", icon: ListOrdered },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/topics", label: "Topics", icon: Layers },
  { href: "/upsolve", label: "Upsolve", icon: Undo2 },
  { href: "/rapid", label: "Rapid", icon: Timer },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
