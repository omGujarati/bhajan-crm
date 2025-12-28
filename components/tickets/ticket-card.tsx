"use client";

import { useRouter } from "next/navigation";
import { Ticket } from "@/server/models/ticket";
import { cn } from "@/lib/utils";
import { Calendar, Building, User } from "lucide-react";

interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
  isAdmin?: boolean;
}

export function TicketCard({
  ticket,
  onClick,
  isAdmin = false,
}: TicketCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Navigate to details page
      const route = isAdmin
        ? `/admin/tickets/${ticket._id}`
        : `/team/tickets/${ticket._id}`;
      router.push(route);
    }
  };
  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "done":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div
      onClick={handleClick}
      className="bg-card border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow space-y-3"
    >
      {/* Ticket Number and Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{ticket.ticketNo}</h4>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {ticket.nameOfWork}
          </p>
        </div>
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0",
            getStatusColor(ticket.status)
          )}
        >
          {ticket.status.replace("_", " ")}
        </span>
      </div>

      {/* Department */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Building className="h-3 w-3" />
        <span className="truncate">{ticket.department}</span>
      </div>

      {/* Field Officer */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <User className="h-3 w-3" />
        <span className="truncate">{ticket.fieldOfficerName}</span>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(ticket.dateOfCommencement)}</span>
        </div>
        to
        {ticket.completionDate && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(ticket.completionDate)}</span>
          </div>
        )}
      </div>

      {/* Assigned Team */}
      {ticket.assignedTeamName && (
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Team: <span className="font-medium">{ticket.assignedTeamName}</span>
        </div>
      )}
    </div>
  );
}
