import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ name, className, size = "md" }: AvatarProps) {
  // Get first 2 letters of name
  const getInitials = (name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(name);

  const sizeClasses = {
    sm: "h-10 w-10 text-sm",
    md: "h-16 w-16 text-lg",
    lg: "h-24 w-24 text-2xl",
  };

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-primary to-primary/70",
        "flex items-center justify-center text-primary-foreground",
        "font-semibold shadow-lg",
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
}

