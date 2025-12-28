"use client";

import { ReactNode } from "react";
import { TeamSidebar } from "./sidebar";
import { SidebarProvider } from "./sidebar-context";

interface TeamLayoutProps {
  children: ReactNode;
  user?: {
    name: string;
    email: string;
  };
  onLogout?: () => void;
}

export function TeamLayout({ children, user, onLogout }: TeamLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <TeamSidebar user={user} onLogout={onLogout} />
        <main className="lg:ml-72 min-h-screen">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

