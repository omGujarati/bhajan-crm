"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Ticket,
  Settings,
  X,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

interface SidebarProps {
  user?: {
    name: string;
    email: string;
  };
  onLogout?: () => void;
}

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Teams",
    href: "/admin/teams",
    icon: Users,
  },
  {
    title: "Tickets",
    href: "/admin/tickets",
    icon: Ticket,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function Sidebar({ user, onLogout }: SidebarProps) {
  const { isMobileOpen, setIsMobileOpen } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    setMounted(true);
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, setIsMobileOpen]);

  return (
    <>
      {/* Mobile Overlay with Backdrop Blur */}
      {mounted && isMobileOpen && (
        <div
          className={cn(
            "lg:hidden fixed inset-0 z-40 transition-opacity duration-300",
            "bg-black/60 backdrop-blur-sm"
          )}
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-72 bg-card/95 backdrop-blur-xl border-r z-40",
          "shadow-xl lg:shadow-none",
          "transition-transform duration-300 ease-out",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header with Gradient */}
          <div className="p-6 border-b bg-gradient-to-br from-background to-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Bhajan CRM
                </h2>
                {user && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-foreground">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {user.email}
                    </p>
                  </div>
                )}
              </div>
              {/* Close button for mobile */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden h-8 w-8 hover:bg-accent"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation Menu with Staggered Animation */}
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "group relative flex items-center gap-3 px-4 py-3 rounded-lg",
                    "transition-all duration-200 ease-out",
                    "hover:bg-accent/80 hover:text-accent-foreground",
                    "active:scale-[0.98]",
                    mounted && "animate-slide-in-left",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-foreground hover:translate-x-1"
                  )}
                  style={{
                    animationDelay: mounted ? `${index * 50}ms` : "0ms",
                  }}
                >
                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-lg shadow-primary/50" />
                  )}

                  {/* Icon with Animation */}
                  <div
                    className={cn(
                      "relative transition-transform duration-200",
                      isActive
                        ? "scale-110"
                        : "group-hover:scale-110 group-hover:rotate-3"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-all duration-200",
                        isActive && "drop-shadow-sm"
                      )}
                    />
                  </div>

                  {/* Text */}
                  <span
                    className={cn(
                      "font-medium text-sm transition-all duration-200",
                      isActive && "font-semibold"
                    )}
                  >
                    {item.title}
                  </span>

                  {/* Hover Effect Background */}
                  <div
                    className={cn(
                      "absolute inset-0 rounded-lg bg-primary/5 opacity-0",
                      "transition-opacity duration-200",
                      "group-hover:opacity-100",
                      isActive && "opacity-0"
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Logout Button with Enhanced Design */}
          {onLogout && (
            <div className="p-4 border-t bg-muted/30">
              <Button
                variant="outline"
                onClick={onLogout}
                className={cn(
                  "w-full group relative overflow-hidden",
                  "transition-all duration-200",
                  "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50",
                  "active:scale-[0.98]"
                )}
              >
                <LogOut className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                <span>Logout</span>
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
