"use client";

import { useState } from "react";
import { Ticket } from "@/server/models/ticket";
import { TicketCard } from "./ticket-card";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  tickets: Ticket[];
  onTicketClick?: (ticket: Ticket) => void;
  isAdmin?: boolean;
}

const statuses = [
  { id: "pending", label: "Pending", color: "bg-yellow-500" },
  { id: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { id: "done", label: "Done", color: "bg-green-500" },
];

export function KanbanBoard({
  tickets,
  onTicketClick,
  isAdmin = false,
}: KanbanBoardProps) {
  const handleTicketClick = (ticket: Ticket) => {
    if (onTicketClick) {
      onTicketClick(ticket);
    }
  };
  const getTicketsByStatus = (status: string) => {
    return tickets.filter((ticket) => ticket.status === status);
  };

  return (
    <div className="w-full overflow-x-auto pb-4 -mx-2 sm:mx-0">
      <div className="flex gap-3 sm:gap-4 min-w-max px-2 sm:px-0">
        {statuses.map((status) => {
          const statusTickets = getTicketsByStatus(status.id);
          return (
            <div
              key={status.id}
              className="flex-shrink-0 w-[280px] sm:w-80 flex flex-col"
            >
              {/* Column Header */}
              <div className="mb-3 sticky top-0 bg-card z-10 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn("w-3 h-3 rounded-full flex-shrink-0", status.color)} />
                  <h3 className="font-semibold text-sm whitespace-nowrap">{status.label}</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
                    {statusTickets.length}
                  </span>
                </div>
              </div>

              {/* Tickets List */}
              <div className="flex-1 space-y-3 min-h-[300px] sm:min-h-[400px]">
                {statusTickets.length === 0 ? (
                  <div className="border-2 border-dashed border-muted rounded-lg p-6 sm:p-8 text-center">
                    <p className="text-xs sm:text-sm text-muted-foreground">No tickets</p>
                  </div>
                ) : (
                  statusTickets.map((ticket) => (
                    <TicketCard
                      key={ticket._id}
                      ticket={ticket}
                      onClick={onTicketClick ? () => handleTicketClick(ticket) : undefined}
                      isAdmin={isAdmin}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

