"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { PasswordInput } from "@/components/ui/password-input";
import { AdminLayout } from "@/components/admin/admin-layout";
import { PageHeader } from "@/components/admin/page-header";
import { showToast } from "@/lib/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ArrowLeft,
  Edit2,
  Save,
  X as XIcon,
  Users,
  Building2,
  FileText,
  UserPlus,
  Trash2,
  MoreVertical,
} from "lucide-react";

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

interface User {
  _id: string;
  name: string;
  email: string;
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
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showDeleteTeamDialog, setShowDeleteTeamDialog] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [showDeleteMemberDialog, setShowDeleteMemberDialog] = useState<string | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [existingMembers, setExistingMembers] = useState<any[]>([]);
  const [showExistingMembers, setShowExistingMembers] = useState(false);
  const [selectedExistingMembers, setSelectedExistingMembers] = useState<string[]>([]);

  // Form states
  const [teamData, setTeamData] = useState({
    name: "",
    description: "",
    department: "",
  });

  const [memberData, setMemberData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [editMemberData, setEditMemberData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [errors, setErrors] = useState({
    name: "",
    description: "",
    department: "",
  });

  const [memberErrors, setMemberErrors] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

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
        setTeamData({
          name: data.team.name || "",
          description: data.team.description || "",
          department: data.team.department || "",
        });
      } else {
        showToast.error("Error", "Failed to load team details");
        router.push("/admin/teams");
      }
    } catch (error) {
      console.error("Error loading team:", error);
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
    if (parsedUser.role !== "admin") {
      router.push("/");
      return;
    }

    setUser(parsedUser);
    loadTeamDetails();
  }, [router, teamId, loadTeamDetails]);

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
        // Filter out members that are already in this team
        const currentMemberIds = members.map((m) => m._id);
        const availableMembers = (data.users || []).filter(
          (member: any) => !currentMemberIds.includes(member._id)
        );
        setExistingMembers(availableMembers);
      }
    } catch (error) {
      console.error("Error loading existing members:", error);
    }
  };


  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (team) {
      setTeamData({
        name: team.name || "",
        description: team.description || "",
        department: team.department || "",
      });
    }
    setErrors({ name: "", description: "", department: "" });
    setIsEditing(false);
  };

  const validateTeamData = (): boolean => {
    const newErrors = {
      name: "",
      description: "",
      department: "",
    };

    if (!teamData.name.trim()) {
      newErrors.name = "Team name is required";
    } else if (teamData.name.trim().length < 2) {
      newErrors.name = "Team name must be at least 2 characters";
    } else if (teamData.name.trim().length > 100) {
      newErrors.name = "Team name must be less than 100 characters";
    }

    if (teamData.description && teamData.description.length > 500) {
      newErrors.description = "Description must be less than 500 characters";
    }

    if (teamData.department) {
      if (teamData.department.length < 2) {
        newErrors.department = "Department must be at least 2 characters";
      } else if (teamData.department.length > 100) {
        newErrors.department = "Department must be less than 100 characters";
      }
    }

    setErrors(newErrors);
    return !newErrors.name && !newErrors.description && !newErrors.department;
  };

  const handleSaveTeam = async () => {
    if (!validateTeamData()) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/teams/${teamId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(teamData),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast.error("Update failed", result.error || "Failed to update team");
        return;
      }

      setTeam(result.team);
      setIsEditing(false);
      showToast.success("Team updated", "Team details have been updated successfully");
    } catch (error) {
      console.error("Error updating team:", error);
      showToast.error("Update failed", "An error occurred. Please try again.");
    }
  };

  const handleAddMember = () => {
    setIsAddingMember(true);
    setMemberData({ name: "", email: "", phone: "", password: "" });
    setMemberErrors({ name: "", email: "", phone: "", password: "" });
    setSelectedExistingMembers([]);
    setShowExistingMembers(false);
    loadExistingMembers();
  };

  const handleCancelAddMember = () => {
    setIsAddingMember(false);
    setMemberData({ name: "", email: "", phone: "", password: "" });
    setMemberErrors({ name: "", email: "", phone: "", password: "" });
    setSelectedExistingMembers([]);
    setShowExistingMembers(false);
  };

  const validateMemberData = (): boolean => {
    const newErrors = {
      name: "",
      email: "",
      phone: "",
      password: "",
    };

    // Only validate if user is trying to add a new member (has entered some data)
    const hasNewMemberData = memberData.name || memberData.email || memberData.password;

    if (hasNewMemberData) {
      if (!memberData.name.trim()) {
        newErrors.name = "Name is required";
      } else if (memberData.name.trim().length < 2) {
        newErrors.name = "Name must be at least 2 characters";
      }

      if (!memberData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberData.email.trim())) {
        newErrors.email = "Invalid email format";
      }

      if (memberData.phone && memberData.phone.trim()) {
        const phoneRegex =
          /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
        const cleaned = memberData.phone.replace(/[\s-]/g, "");
        if (cleaned.length < 10 || cleaned.length > 15) {
          newErrors.phone = "Invalid phone number length";
        } else if (!phoneRegex.test(memberData.phone.trim())) {
          newErrors.phone = "Invalid phone format";
        }
      }

      if (!memberData.password) {
        newErrors.password = "Password is required";
      } else if (memberData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(memberData.password)) {
        newErrors.password =
          "Password must contain uppercase, lowercase, and number";
      }
    }

    setMemberErrors(newErrors);
    return (
      !newErrors.name &&
      !newErrors.email &&
      !newErrors.phone &&
      !newErrors.password
    );
  };

  const handleSaveMember = async () => {
    // If adding existing members, validate that at least one is selected or new member data is provided
    if (selectedExistingMembers.length === 0) {
      if (!validateMemberData()) {
        return;
      }
    }

    const token = localStorage.getItem("token");
    let successCount = 0;
    let errorCount = 0;

    // Assign selected existing members
    if (selectedExistingMembers.length > 0) {
      for (const memberId of selectedExistingMembers) {
        try {
          const response = await fetch(`/api/teams/${teamId}/members/assign`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ userId: memberId }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error("Error assigning member:", error);
          errorCount++;
        }
      }
    }

    // Add new member if provided
    if (memberData.name && memberData.email && memberData.password) {
      try {
        const response = await fetch(`/api/teams/${teamId}/members`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(memberData),
        });

        const result = await response.json();

        if (!response.ok) {
          showToast.error("Add member failed", result.error || "Failed to add team member");
          
          // Set field-specific errors
          if (result.error.toLowerCase().includes("email")) {
            setMemberErrors((prev) => ({ ...prev, email: result.error }));
          } else if (result.error.toLowerCase().includes("phone")) {
            setMemberErrors((prev) => ({ ...prev, phone: result.error }));
          } else if (result.error.toLowerCase().includes("password")) {
            setMemberErrors((prev) => ({ ...prev, password: result.error }));
          } else {
            setMemberErrors((prev) => ({ ...prev, email: result.error }));
          }
          return;
        }

        successCount++;
      } catch (error) {
        console.error("Error adding member:", error);
        errorCount++;
      }
    }

    // Show success/error messages
    if (successCount > 0 && errorCount === 0) {
      showToast.success(
        "Members added",
        `${successCount} member(s) have been added successfully`
      );
    } else if (successCount > 0 && errorCount > 0) {
      showToast.warning(
        "Partial success",
        `${successCount} member(s) added, ${errorCount} failed`
      );
    } else if (errorCount > 0) {
      showToast.error("Add failed", "Failed to add members");
      return;
    } else {
      // No members selected and no new member data
      showToast.warning("No members", "Please select existing members or add a new member");
      return;
    }

    setIsAddingMember(false);
    setMemberData({ name: "", email: "", phone: "", password: "" });
    setSelectedExistingMembers([]);
    setShowExistingMembers(false);
    loadTeamDetails();
  };

  const handleDeleteTeam = async () => {
    setDeletingTeam(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/teams/${teamId}/delete`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        showToast.error("Delete failed", result.error || "Failed to delete team");
        return;
      }

      showToast.success("Team deleted", "Team has been deleted and members unassigned");
      router.push("/admin/teams");
    } catch (error) {
      console.error("Error deleting team:", error);
      showToast.error("Delete failed", "An error occurred. Please try again.");
    } finally {
      setDeletingTeam(false);
      setShowDeleteTeamDialog(false);
    }
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMemberId(member._id);
    setEditMemberData({
      name: member.name,
      email: member.email,
      phone: member.phone || "",
    });
  };

  const handleCancelEditMember = () => {
    setEditingMemberId(null);
    setEditMemberData({ name: "", email: "", phone: "" });
  };

  const handleSaveEditMember = async () => {
    if (!editingMemberId) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users/${editingMemberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editMemberData),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast.error("Update failed", result.error || "Failed to update member");
        return;
      }

      showToast.success("Member updated", "Team member has been updated successfully");
      setEditingMemberId(null);
      setEditMemberData({ name: "", email: "", phone: "" });
      loadTeamDetails();
    } catch (error) {
      console.error("Error updating member:", error);
      showToast.error("Update failed", "An error occurred. Please try again.");
    }
  };

  const handleDeleteMember = async () => {
    if (!showDeleteMemberDialog) return;

    setDeletingMemberId(showDeleteMemberDialog);
    try {
      const token = localStorage.getItem("token");
      // Unassign member from this team (not delete the user)
      const response = await fetch(`/api/teams/${teamId}/members/${showDeleteMemberDialog}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        showToast.error("Unassign failed", result.error || "Failed to unassign member");
        return;
      }

      showToast.success("Member unassigned", "Team member has been unassigned from this team");
      setShowDeleteMemberDialog(null);
      loadTeamDetails();
    } catch (error) {
      console.error("Error unassigning member:", error);
      showToast.error("Unassign failed", "An error occurred. Please try again.");
    } finally {
      setDeletingMemberId(null);
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

  if (!team) {
    return null;
  }

  return (
    <AdminLayout
      user={user ? { name: user.name, email: user.email } : undefined}
      onLogout={handleLogout}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/teams")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
          <PageHeader title={team.name} subtitle={`Team ID: ${team.teamId}`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Details Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Team Information Card */}
            <div className="border rounded-lg p-6 bg-card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Team Information</h2>
                <div className="flex gap-2">
                  {!isEditing ? (
                    <>
                      <Button variant="outline" size="sm" onClick={handleEdit}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeleteTeamDialog(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={handleCancel}>
                        <XIcon className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveTeam}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Team ID</label>
                  </div>
                  <div className="px-3 py-2 bg-muted rounded-md text-sm font-mono">
                    {team.teamId}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unique identifier for this team
                  </p>
                </div>

                <TextField
                  label="Team Name"
                  value={teamData.name}
                  onChange={(e) => {
                    setTeamData((prev) => ({ ...prev, name: e.target.value }));
                    setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  placeholder="Enter team name"
                  disabled={!isEditing}
                  error={errors.name}
                  required
                />

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Description</label>
                  </div>
                  <textarea
                    value={teamData.description}
                    onChange={(e) => {
                      setTeamData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }));
                      setErrors((prev) => ({ ...prev, description: "" }));
                    }}
                    placeholder="Enter team description (optional)"
                    disabled={!isEditing}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md bg-background ${
                      errors.description
                        ? "border-destructive"
                        : "border-input"
                    } ${!isEditing ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                  {errors.description && (
                    <p className="mt-2 text-sm text-destructive">
                      {errors.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional: Describe the team&apos;s purpose and responsibilities
                  </p>
                </div>

                <TextField
                  label="Department"
                  value={teamData.department}
                  onChange={(e) => {
                    setTeamData((prev) => ({
                      ...prev,
                      department: e.target.value,
                    }));
                    setErrors((prev) => ({ ...prev, department: "" }));
                  }}
                  placeholder="Enter department name (optional)"
                  disabled={!isEditing}
                  error={errors.department}
                />
              </div>
            </div>

            {/* Team Members Section */}
            <div className="border rounded-lg p-6 bg-card">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <h2 className="text-2xl font-semibold">Team Members</h2>
                  <span className="text-sm text-muted-foreground">
                    ({members.length})
                  </span>
                </div>
                <Button onClick={handleAddMember} size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>

              {isAddingMember ? (
                <div className="border rounded-lg p-4 bg-background space-y-4">
                  <h3 className="font-semibold">Add Team Members</h3>

                  {/* Existing Members Selection */}
                  {existingMembers.length > 0 && (
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-medium">
                          Add Existing Members
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

                  {/* Divider */}
                  {(existingMembers.length > 0 && (memberData.name || memberData.email || memberData.password)) && (
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or</span>
                      </div>
                    </div>
                  )}

                  {/* Add New Member Section */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Add New Member (Optional)</h4>
                    <div className="space-y-4">
                      <TextField
                        label="Name"
                        value={memberData.name}
                        onChange={(e) => {
                          setMemberData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }));
                          setMemberErrors((prev) => ({ ...prev, name: "" }));
                        }}
                        placeholder="Enter member name"
                        error={memberErrors.name}
                      />
                      <TextField
                        label="Email"
                        type="email"
                        value={memberData.email}
                        onChange={(e) => {
                          setMemberData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }));
                          setMemberErrors((prev) => ({ ...prev, email: "" }));
                        }}
                        placeholder="Enter email"
                        error={memberErrors.email}
                      />
                      <TextField
                        label="Phone (Optional)"
                        type="tel"
                        value={memberData.phone}
                        onChange={(e) => {
                          setMemberData((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }));
                          setMemberErrors((prev) => ({ ...prev, phone: "" }));
                        }}
                        placeholder="Enter phone number"
                        error={memberErrors.phone}
                      />
                      <PasswordInput
                        label="Password"
                        value={memberData.password}
                        onChange={(e) => {
                          setMemberData((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }));
                          setMemberErrors((prev) => ({ ...prev, password: "" }));
                        }}
                        placeholder="Enter password"
                        error={memberErrors.password}
                        helperText="Required if adding new member. Must be at least 8 characters with uppercase, lowercase, and number"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSaveMember}>
                      {selectedExistingMembers.length > 0 && memberData.name
                        ? "Add Members"
                        : selectedExistingMembers.length > 0
                        ? "Add Selected Members"
                        : "Add Member"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelAddMember}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No members in this team yet</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddMember}
                        className="mt-4"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add First Member
                      </Button>
                    </div>
                  ) : (
                    members.map((member) => (
                      <div
                        key={member._id}
                        className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        {editingMemberId === member._id ? (
                          <div className="space-y-3">
                            <TextField
                              label="Name"
                              value={editMemberData.name}
                              onChange={(e) =>
                                setEditMemberData((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              placeholder="Enter member name"
                              required
                            />
                            <TextField
                              label="Email"
                              type="email"
                              value={editMemberData.email}
                              onChange={(e) =>
                                setEditMemberData((prev) => ({
                                  ...prev,
                                  email: e.target.value,
                                }))
                              }
                              placeholder="Enter email"
                              required
                            />
                            <TextField
                              label="Phone (Optional)"
                              type="tel"
                              value={editMemberData.phone}
                              onChange={(e) =>
                                setEditMemberData((prev) => ({
                                  ...prev,
                                  phone: e.target.value,
                                }))
                              }
                              placeholder="Enter phone number"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveEditMember}>
                                <Save className="h-4 w-4 mr-2" />
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEditMember}
                              >
                                <XIcon className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold">{member.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {member.email}
                              </p>
                              {member.phone && (
                                <p className="text-sm text-muted-foreground">
                                  {member.phone}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditMember(member)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDeleteMemberDialog(member._id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Team Stats Sidebar */}
          <div className="space-y-6">
            <div className="border rounded-lg p-6 bg-card">
              <h3 className="font-semibold mb-4">Team Statistics</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                  <p className="text-2xl font-bold">{members.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">
                    {new Date(team.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {team.updatedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="text-sm">
                      {new Date(team.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Team Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteTeamDialog}
        onClose={() => setShowDeleteTeamDialog(false)}
        onConfirm={handleDeleteTeam}
        title="Delete Team"
        description={`Are you sure you want to delete "${team.name}"? All team members will be unassigned but not deleted. This action cannot be undone.`}
        confirmText="Delete Team"
        variant="destructive"
        loading={deletingTeam}
      />

      {/* Delete Member Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteMemberDialog !== null}
        onClose={() => setShowDeleteMemberDialog(null)}
        onConfirm={handleDeleteMember}
        title="Remove Team Member"
        description="Are you sure you want to remove this team member from this team? The member will not be deleted, only unassigned from this team."
        confirmText="Remove Member"
        variant="destructive"
        loading={deletingMemberId === showDeleteMemberDialog}
      />
    </AdminLayout>
  );
}

