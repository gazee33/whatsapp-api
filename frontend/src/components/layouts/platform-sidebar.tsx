"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  FileText,
  Settings,
  Users,
  Shield,
  Activity,
  X,
} from "lucide-react";

const navItems = [
  {
    section: "Overview",
    items: [
      { href: "/platform", label: "Dashboard", icon: LayoutDashboard },
      { href: "/platform/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/platform/health", label: "Health", icon: Activity },
    ],
  },
  {
    section: "Management",
    items: [
      { href: "/platform/businesses", label: "Businesses", icon: Building2 },
      { href: "/platform/audit-logs", label: "Audit Logs", icon: FileText },
    ],
  },
  {
    section: "System",
    items: [
      { href: "/platform/users", label: "Platform Users", icon: Users },
      { href: "/platform/settings", label: "Settings", icon: Settings },
    ],
  },
];

interface PlatformSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function PlatformSidebar({ open, onClose }: PlatformSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/platform") return pathname === "/platform";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-[260px] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Mobile close button */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              Platform Admin
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Brand (desktop) */}
        <div className="hidden h-16 items-center gap-3 border-b border-sidebar-border px-4 lg:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              Platform Admin
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Management Console
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navItems.map((group) => (
            <div key={group.section} className="mb-6">
              <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.section}
              </h4>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            active ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
