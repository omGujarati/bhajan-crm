"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TeamLayout } from "@/components/team/team-layout";
import { PageHeader } from "@/components/team/page-header";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/tickets/kanban-board";
import { TicketForm } from "@/components/tickets/ticket-form";
import { showToast } from "@/lib/toast";
import { Plus, RefreshCw } from "lucide-react";
import { Ticket } from "@/server/models/ticket";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function TeamTicketsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userTeams, setUserTeams] = useState<{ _id: string; name: string }[]>([]);

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
    loadTickets();
    loadUserTeams();
  }, [router]);

  const loadUserTeams = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/teams/my-teams", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.teams) {
        setUserTeams(result.teams.map((team: any) => ({
          _id: team._id,
          name: team.name,
        })));
      }
    } catch (error) {
      console.error("Error loading user teams:", error);
    }
  };

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/tickets/list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.tickets) {
        setTickets(result.tickets);
      } else {
        showToast.error("Error", result.error || "Failed to load tickets");
      }
    } catch (error) {
      console.error("Error loading tickets:", error);
      showToast.error("Error", "An error occurred. Please try again.");
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleUpdate = () => {
    loadTickets();
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    showToast.success("Logged out", "You have been successfully logged out");
    router.push("/");
  };

  if (loading) {
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

  return (
    <TeamLayout
      user={user ? { name: user.name, email: user.email } : undefined}
      onLogout={handleLogout}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <PageHeader title="Tickets" subtitle="View and manage your assigned tickets" />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadTickets}
              disabled={loadingTickets}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingTickets ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          </div>
        </div>

        {loadingTickets ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <p>Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="border rounded-lg p-12 bg-card text-center">
            <p className="text-muted-foreground mb-4">
              No tickets assigned to your team yet.
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Ticket
            </Button>
          </div>
        ) : (
          <div className="bg-card border rounded-lg p-4 sm:p-6">
            <KanbanBoard
              tickets={tickets}
              isAdmin={false}
            />
          </div>
        )}

        {/* Create Ticket Form */}
        <TicketForm
          open={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            loadTickets();
            setShowCreateForm(false);
          }}
          isTeamMember={true}
          userTeams={userTeams}
        />
      </div>
    </TeamLayout>
  );
}
