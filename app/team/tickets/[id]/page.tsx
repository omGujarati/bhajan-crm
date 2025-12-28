"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { TeamLayout } from "@/components/team/team-layout";
import { PageHeader } from "@/components/team/page-header";
import { Button } from "@/components/ui/button";
import { TicketDetailContent } from "@/components/tickets/ticket-detail-content";
import { showToast } from "@/lib/toast";
import { ArrowLeft } from "lucide-react";
import { Ticket } from "@/server/models/ticket";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function TeamTicketDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "field_team") {
      router.push("/");
      return;
    }

    setUser(parsedUser);
    setLoading(false);
    loadTicket();
  }, [router, ticketId]);

  const loadTicket = async () => {
    if (!ticketId) return;
    setLoadingTicket(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tickets/${ticketId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.ticket) {
        setTicket(result.ticket);
      } else {
        showToast.error("Error", result.error || "Failed to load ticket");
        router.push("/team/tickets");
      }
    } catch (error) {
      console.error("Error loading ticket:", error);
      showToast.error("Error", "An error occurred. Please try again.");
      router.push("/team/tickets");
    } finally {
      setLoadingTicket(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    showToast.success("Logged out", "You have been successfully logged out");
    router.push("/");
  };

  const handleUpdate = () => {
    loadTicket();
  };

  if (loading || loadingTicket) {
    return (
      <TeamLayout
        user={user ? { name: user.name, email: user.email } : undefined}
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <p>Loading...</p>
        </div>
      </TeamLayout>
    );
  }

  if (!ticket) {
    return (
      <TeamLayout
        user={user ? { name: user.name, email: user.email } : undefined}
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <p>Ticket not found</p>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout
      user={user ? { name: user.name, email: user.email } : undefined}
      onLogout={handleLogout}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/team/tickets")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
          <PageHeader
            title={`Ticket ${ticket.ticketNo}`}
            subtitle="View and manage ticket details"
          />
        </div>

        <TicketDetailContent
          ticket={ticket}
          isAdmin={false}
          teams={[]}
          onUpdate={handleUpdate}
        />
      </div>
    </TeamLayout>
  );
}

