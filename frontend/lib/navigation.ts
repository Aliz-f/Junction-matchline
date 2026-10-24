/**
 * Primary navigation data (FE-01).
 *
 * Deliberately NOT inside the `"use client"` nav component: server components
 * (`app/not-found.tsx`) also read this list, and importing a value across the
 * client boundary yields a client reference rather than the array itself.
 */
import type { NavIcon } from "@/components/ui/Icon";

export type NavItem = { readonly href: string; readonly label: string; readonly icon: NavIcon };

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Journey", icon: "journey" },
  { href: "/map", label: "Map", icon: "map" },
  { href: "/impact", label: "My Team Impact", icon: "impact" },
  { href: "/community", label: "Community", icon: "community" },
  { href: "/profile", label: "Profile", icon: "profile" },
];

/** A nav item is active for its own route and that route's descendants. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
