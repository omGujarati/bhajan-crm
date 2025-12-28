"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./sidebar-context";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const { toggleMobileSidebar } = useSidebar();

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        {/* Mobile Menu Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleMobileSidebar}
          className="lg:hidden h-10 w-10 shrink-0"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-semibold">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

