"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-7xl",
};

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
  size = "md",
}: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className={cn(
        "relative z-50 w-full bg-card border rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col",
        sizeClasses[size],
        className
      )}>
        <div className="flex items-center justify-between p-4 sm:p-6 border-b flex-shrink-0">
          {title && <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>}
          {!title && <div />}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors ml-auto"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={cn("p-4 sm:p-6 overflow-y-auto flex-1", !title && "pt-6")}>
          {children}
        </div>
      </div>
    </div>
  );
}

