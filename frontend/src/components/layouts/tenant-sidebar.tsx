"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  MessageSquare,
  Settings,
  Users,
  Shield,
  ChevronLeft,
  ChevronRight,
  Store,
  X,
  Terminal,
  Radio,
} from "lucide-react";
import { useState } from "react";
import { useBusinessStore } from "@/stores/business-store";

const navItems = [
  {
    section: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/menu", label: "Menu", icon: UtensilsCrossed },
      { href: "/orders", label: "Orders", icon: ShoppingBag },
      { href: "/conversations", label: "Conversations", icon: MessageSquare },
    ],
  },
  {
    section: "Simulation",
    items: [
      { href: "/simulator", label: "Simulator", icon: Terminal },
    ],
  },
  {
    section: "Management",
    items: [
      { href: "/whatsapp", label: "WhatsApp", icon: Radio },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/users", label: "Users", icon: Users },
      { href: "/roles", label: "Roles", icon: Shield },
    ],
  },
];

interface TenantSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function TenantSidebar({ open, onClose }: TenantSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { business } = useBusinessStore();

  const isActive = (href: string) => {
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
          "fixed left-0 top-0 z-50 flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
          "lg:flex lg:translate-x-0",
          collapsed ? "lg:w-[72px]" : "lg:w-[260px]",
          "w-[260px]",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Mobile close button */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4 lg:hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Store className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {business?.name || "Restaurant"}
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Store className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                {business?.name || "Restaurant"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Dashboard
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navItems.map((group) => (
            <div key={group.section} className="mb-6">
              {!collapsed && (
                <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:block">
                  {group.section}
                </h4>
              )}
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
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            active ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        {!collapsed && item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden border-t border-sidebar-border p-3 lg:block">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2 text-xs">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
