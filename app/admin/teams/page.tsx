"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { PasswordInput } from "@/components/ui/password-input";
import { AdminLayout } from "@/components/admin/admin-layout";
import { PageHeader } from "@/components/admin/page-header";
import { showToast } from "@/lib/toast";

interface Team {
  _id: string;
  teamId: string;
  name: string;
  description?: string;
  department?: string;
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

export default function TeamsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingMembers, setExistingMembers] = useState<any[]>([]);
  const [showExistingMembers, setShowExistingMembers] = useState(false);
  const [selectedExistingMembers, setSelectedExistingMembers] = useState<string[]>([]);

  // Form states
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamDepartment, setTeamDepartment] = useState("");
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
    loadExistingMembers();
  }, [router]);

  const loadExistingMembers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users/list/all", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExistingMembers(data.users || []);
      }
    } catch (error) {
      console.error("Error loading existing members:", error);
    }
  };

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
        body: JSON.stringify({
          name: teamName,
          description: teamDescription || undefined,
          department: teamDepartment || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast.error("Create failed", result.error || "Failed to create team");
        return;
      }

      const newTeamId = result.teamId;

      // Assign selected existing members to the new team
      if (selectedExistingMembers.length > 0) {
        const team = await fetch(`/api/teams/${newTeamId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).then((res) => res.json());

        if (team.success) {
          for (const memberId of selectedExistingMembers) {
            try {
              await fetch(`/api/teams/${newTeamId}/members/assign`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ userId: memberId }),
              });
            } catch (error) {
              console.error("Error assigning member:", error);
            }
          }
        }
      }

      // Add new member if provided
      if (memberName && memberEmail && memberPassword) {
        try {
          await fetch(`/api/teams/${newTeamId}/members`, {
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
            }),
          });
        } catch (error) {
          console.error("Error adding new member:", error);
        }
      }

      setTeamName("");
      setTeamDescription("");
      setTeamDepartment("");
      setMemberName("");
      setMemberEmail("");
      setMemberPhone("");
      setMemberPassword("");
      setSelectedExistingMembers([]);
      setShowCreateTeam(false);
      showToast.success("Team created", "Team has been created successfully");
      loadTeams();
      loadExistingMembers();
    } catch (error) {
      showToast.error("Error", "An error occurred while creating team");
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
      <AdminLayout
        user={user ? { name: user.name, email: user.email } : undefined}
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <p>Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      user={user ? { name: user.name, email: user.email } : undefined}
      onLogout={handleLogout}
    >
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Teams"
          subtitle="Manage teams and team members"
        />

        <div className="space-y-6">
          {/* Create Team Section */}
          <div className="border rounded-lg p-6 bg-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Create New Team</h2>
              <Button onClick={() => setShowCreateTeam(!showCreateTeam)}>
                {showCreateTeam ? "Cancel" : "Create Team"}
              </Button>
            </div>

            {showCreateTeam && (
              <form onSubmit={handleCreateTeam} className="space-y-4 p-4 border rounded-lg bg-background">
                <TextField
                  label="Team Name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name"
                  required
                />
                <div>
                  <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                  <textarea
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    placeholder="Enter team description"
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <TextField
                  label="Department (Optional)"
                  value={teamDepartment}
                  onChange={(e) => setTeamDepartment(e.target.value)}
                  placeholder="Enter department name"
                />

                {/* Existing Members Selection */}
                {existingMembers.length > 0 && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium">
                        Add Existing Members (Optional)
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowExistingMembers(!showExistingMembers)}
                      >
                        {showExistingMembers ? "Hide" : "Show"} Members
                      </Button>
                    </div>
                    {showExistingMembers && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {existingMembers.map((member) => (
                          <label
                            key={member._id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-background cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedExistingMembers.includes(member._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedExistingMembers((prev) => [
                                    ...prev,
                                    member._id,
                                  ]);
                                } else {
                                  setSelectedExistingMembers((prev) =>
                                    prev.filter((id) => id !== member._id)
                                  );
                                }
                              }}
                              className="rounded"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {member.email} {((member as any).teamNames && (member as any).teamNames.length > 0) && `• ${(member as any).teamNames.join(", ")}`}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                    {selectedExistingMembers.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {selectedExistingMembers.length} member(s) selected
                      </p>
                    )}
                  </div>
                )}

                {/* Add New Member Section */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-3">Or Add New Member (Optional)</h3>
                  <div className="space-y-3">
                    <TextField
                      label="Name"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      placeholder="Enter member name"
                    />
                    <TextField
                      label="Email"
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="Enter email"
                    />
                    <TextField
                      label="Phone (Optional)"
                      type="tel"
                      value={memberPhone}
                      onChange={(e) => setMemberPhone(e.target.value)}
                      placeholder="Enter phone number"
                    />
                    <PasswordInput
                      label="Password"
                      value={memberPassword}
                      onChange={(e) => setMemberPassword(e.target.value)}
                      placeholder="Enter password"
                      helperText="Required if adding new member"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit">Create Team</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateTeam(false);
                      setTeamName("");
                      setTeamDescription("");
                      setTeamDepartment("");
                      setMemberName("");
                      setMemberEmail("");
                      setMemberPhone("");
                      setMemberPassword("");
                      setSelectedExistingMembers([]);
                      setShowExistingMembers(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Teams List */}
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-2xl font-semibold mb-4">All Teams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <p className="text-lg mb-2">No teams created yet</p>
                  <p className="text-sm">Create your first team to get started</p>
                </div>
              ) : (
                teams.map((team) => (
                  <div
                    key={team._id}
                    className="p-5 border rounded-lg cursor-pointer transition-all hover:bg-accent hover:shadow-md group"
                    onClick={() => router.push(`/admin/teams/${team._id}`)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        {team.name}
                      </h3>
                      <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                        {team.teamId}
                      </span>
                    </div>
                    {team.department && (
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <span className="font-medium">Dept:</span> {team.department}
                      </p>
                    )}
                    {team.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {team.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(team.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

