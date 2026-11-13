import { Bookmark, Compass, Inbox, LayoutDashboard, type LucideIcon } from "lucide-react";

export type NavLink = { href: string; label: string; icon: LucideIcon };

export const navLinks: NavLink[] = [
  { href: "/", label: "Explore", icon: Compass },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/dashboard", label: "My Listings", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
