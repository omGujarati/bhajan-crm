"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Input } from "@/components/ui/input";

interface Team {
  _id: string;
  name: string;
  createdAt: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  teamId?: string;
  teamName?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [teamName, setTeamName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberPassword, setMemberPassword] = useState("");

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login/admin");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "admin") {
      router.push("/login/admin");
      return;
    }

    setUser(parsedUser);
    loadTeams();
  }, [router]);

  const loadTeams = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/teams/list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams);
      }
    } catch (error) {
      console.error("Error loading teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users/list?teamId=${teamId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.users);
      }
    } catch (error) {
      console.error("Error loading team members:", error);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/teams/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: teamName }),
      });

      if (response.ok) {
        setTeamName("");
        setShowCreateTeam(false);
        loadTeams();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to create team");
      }
    } catch (error) {
      alert("An error occurred");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) {
      alert("Please select a team first");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const team = teams.find((t) => t._id === selectedTeam);
      if (!team) {
        alert("Team not found");
        return;
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: memberName,
          email: memberEmail,
          phone: memberPhone || undefined,
          password: memberPassword,
          role: "field_team",
          teamId: selectedTeam,
          teamName: team.name,
        }),
      });

      if (response.ok) {
        setMemberName("");
        setMemberEmail("");
        setMemberPhone("");
        setMemberPassword("");
        setShowAddMember(false);
        if (selectedTeam) {
          loadTeamMembers(selectedTeam);
        }
      } else {
        const data = await response.json();
        alert(data.error || "Failed to add member");
      }
    } catch (error) {
      alert("An error occurred");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {user?.name}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Teams Section */}
          <div className="border rounded-lg p-6 bg-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Teams</h2>
              <Button onClick={() => setShowCreateTeam(true)}>Create Team</Button>
            </div>

            {showCreateTeam && (
              <form onSubmit={handleCreateTeam} className="mb-4 p-4 border rounded-lg bg-background">
                <TextField
                  label="Team Name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name"
                  required
                />
                <div className="flex gap-2 mt-4">
                  <Button type="submit">Create</Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreateTeam(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {teams.length === 0 ? (
                <p className="text-muted-foreground">No teams created yet</p>
              ) : (
                teams.map((team) => (
                  <div
                    key={team._id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTeam === team._id ? "bg-primary/10 border-primary" : "hover:bg-accent"
                    }`}
                    onClick={() => {
                      setSelectedTeam(team._id);
                      loadTeamMembers(team._id);
                    }}
                  >
                    <h3 className="font-semibold">{team.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(team.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Team Members Section */}
          <div className="border rounded-lg p-6 bg-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Team Members</h2>
              {selectedTeam && (
                <Button onClick={() => setShowAddMember(true)}>Add Member</Button>
              )}
            </div>

            {!selectedTeam ? (
              <p className="text-muted-foreground">Select a team to view members</p>
            ) : showAddMember ? (
              <form onSubmit={handleAddMember} className="space-y-4 p-4 border rounded-lg bg-background">
                <TextField
                  label="Name"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Enter member name"
                  required
                />
                <TextField
                  label="Email"
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="Enter email"
                  required
                />
                <TextField
                  label="Phone (Optional)"
                  type="tel"
                  value={memberPhone}
                  onChange={(e) => setMemberPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
                <TextField
                  label="Password"
                  type="password"
                  value={memberPassword}
                  onChange={(e) => setMemberPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
                <div className="flex gap-2">
                  <Button type="submit">Add Member</Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddMember(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                {teamMembers.length === 0 ? (
                  <p className="text-muted-foreground">No members in this team</p>
                ) : (
                  teamMembers.map((member) => (
                    <div key={member._id} className="p-4 border rounded-lg">
                      <h3 className="font-semibold">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      {member.phone && (
                        <p className="text-sm text-muted-foreground">{member.phone}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

