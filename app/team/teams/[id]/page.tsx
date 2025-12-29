"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { TeamLayout } from "@/components/team/team-layout";
import { PageHeader } from "@/components/team/page-header";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toast";
import { Users, ArrowLeft, Building2, FileText } from "lucide-react";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
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

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

export default function TeamDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTeamDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/teams/${teamId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeam(data.team);
        setMembers(data.members || []);
      } else {
        const result = await response.json();
        showToast.error("Error", result.error || "Failed to load team details");
        router.push("/team/teams");
      }
    } catch (error) {
      console.error("Error loading team details:", error);
      showToast.error("Error", "An error occurred while loading team details");
    } finally {
      setLoading(false);
    }
  }, [teamId, router]);

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
    loadTeamDetails();
  }, [router, teamId, loadTeamDetails]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    showToast.success("Logged out", "You have been successfully logged out");
    router.push("/");
  };

  const getUserDisplay = () => {
    if (!user) return undefined;
    return {
      name: user.name || (user as any).teamName || "Team",
      email: user.email || (user as any).teamEmail || "",
    };
  };

  if (loading) {
    return (
      <TeamLayout
        user={getUserDisplay()}
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <p>Loading...</p>
        </div>
      </TeamLayout>
    );
  }

  if (!team) {
    return (
      <TeamLayout
        user={getUserDisplay()}
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <p>Team not found</p>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout
      user={getUserDisplay()}
      onLogout={handleLogout}
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/team/teams")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
          <PageHeader title={team.name} subtitle={team.teamId} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Team Information */}
            <div className="border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Team Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Team ID
                  </label>
                  <p className="text-base font-mono">{team.teamId}</p>
                </div>
                {team.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Description
                    </label>
                    <p className="text-base">{team.description}</p>
                  </div>
                )}
                {team.department && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Department
                    </label>
                    <p className="text-base">{team.department}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Team Members */}
            <div className="border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members ({members.length})
              </h2>
              {members.length === 0 ? (
                <p className="text-muted-foreground">No members in this team</p>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member._id}
                      className="p-4 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                    >
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.email}
                      </p>
                      {member.phone && (
                        <p className="text-sm text-muted-foreground">
                          {member.phone}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="border rounded-lg p-6 bg-card">
              <h3 className="font-semibold mb-4">Team Statistics</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                  <p className="text-2xl font-bold">{members.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Team ID</p>
                  <p className="text-sm font-mono">{team.teamId}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TeamLayout>
  );
}

