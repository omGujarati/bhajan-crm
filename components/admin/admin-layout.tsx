"use client";

import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { SidebarProvider } from "./sidebar-context";

interface AdminLayoutProps {
  children: ReactNode;
  user?: {
    name: string;
    email: string;
  };
  onLogout?: () => void;
}

export function AdminLayout({ children, user, onLogout }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <Sidebar user={user} onLogout={onLogout} />
        <main className="lg:ml-72 min-h-screen">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

