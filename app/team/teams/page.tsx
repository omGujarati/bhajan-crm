"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TeamLayout } from "@/components/team/team-layout";
import { PageHeader } from "@/components/team/page-header";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toast";
import { Users, ArrowRight } from "lucide-react";

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  teamIds?: string[];
  teamNames?: string[];
  teamId?: string;
  teamName?: string;
}

interface Team {
  _id: string;
  teamId: string;
  name: string;
  description?: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

export default function TeamTeamsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

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

    // Handle both team login and individual user login
    setUser(parsedUser);
    loadMyTeams();
  }, [router]);

  const loadMyTeams = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/teams/my-teams", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      } else {
        showToast.error("Error", "Failed to load teams");
      }
    } catch (error) {
      console.error("Error loading teams:", error);
      showToast.error("Error", "An error occurred while loading teams");
    } finally {
      setLoading(false);
    }
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
        user={user ? { 
          name: user.name || (user as any).teamName || "Team", 
          email: user.email || (user as any).teamEmail || "" 
        } : undefined}
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
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="My Teams"
          subtitle="View teams you are assigned to"
        />

        {teams.length === 0 ? (
          <div className="border rounded-lg p-12 bg-card text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Teams Assigned</h3>
            <p className="text-muted-foreground">
              You are not currently assigned to any teams.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <div
                key={team._id}
                className="border rounded-lg p-6 bg-card hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => router.push(`/team/teams/${team._id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{team.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      {team.teamId}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>

                {team.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {team.description}
                  </p>
                )}

                {team.department && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-muted rounded">
                      {team.department}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </TeamLayout>
  );
}

