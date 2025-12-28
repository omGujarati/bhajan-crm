"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
    title: "Teams",
    href: "/team/teams",
    icon: Users,
  },
  {
    title: "Tickets",
    href: "/team/tickets",
    icon: Ticket,
  },
  {
    title: "Settings",
    href: "/team/settings",
    icon: Settings,
  },
];

export function TeamSidebar({ user, onLogout }: SidebarProps) {
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
                <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Bhajan CRM
                </h2>
                <p className="text-xs text-muted-foreground mt-1">Team Portal</p>
              </div>
              {/* Mobile Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-4 border-b bg-muted/30">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          )}

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    "hover:bg-accent hover:text-accent-foreground",
                    "group relative",
                    isActive
                      ? "bg-primary/10 text-primary font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      isActive && "scale-110",
                      "group-hover:scale-110"
                    )}
                  />
                  <span className="flex-1">{item.title}</span>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-r-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          {onLogout && (
            <div className="p-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-destructive"
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4 mr-3" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

