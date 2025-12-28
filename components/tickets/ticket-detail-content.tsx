"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { showToast } from "@/lib/toast";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Building,
  FileText,
  History,
  Plus,
  CheckCircle,
  ClipboardList,
  Edit,
  Link as LinkIcon,
  Trash2,
} from "lucide-react";
import { Ticket, TicketHistory } from "@/server/models/ticket";
import { ProgressForm } from "./progress-form";
import { EditTicketForm } from "./edit-ticket-form";
import { SignaturePad } from "@/components/ui/signature-pad";

interface TicketDetailContentProps {
  ticket: Ticket;
  isAdmin: boolean;
  teams?: { _id: string; name: string }[];
  onUpdate: () => void;
}

export function TicketDetailContent({
  ticket: initialTicket,
  isAdmin,
  teams = [],
  onUpdate,
}: TicketDetailContentProps) {
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>(
    initialTicket.status
  );
  const [selectedTeam, setSelectedTeam] = useState<string>(
    initialTicket.assignedTeamId || ""
  );
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingTeam, setUpdatingTeam] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [editingProgressDay, setEditingProgressDay] = useState<number | null>(
    null
  );
  const [signingAsAdmin, setSigningAsAdmin] = useState(false);
  const [showProgress, setShowProgress] = useState(true);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null); // Changed to progressId
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingProgressId, setEditingProgressId] = useState<string | null>(
    null
  );
  const [adminSignature, setAdminSignature] = useState("");
  const [adminSignatureType, setAdminSignatureType] = useState<
    "text" | "image"
  >("text");
  const [showAdminSignatureForm, setShowAdminSignatureForm] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | "all">(
    "all"
  ); // For admin member tabs

  useEffect(() => {
    setTicket(initialTicket);
    setSelectedStatus(initialTicket.status);
    setSelectedTeam(initialTicket.assignedTeamId || "");
    loadHistory();

    // Get current user ID from token (decode JWT payload on client)
    try {
      const token = localStorage.getItem("token");
      if (token) {
        // Decode JWT token (base64 decode the payload part)
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload && payload.userId) {
            setCurrentUserId(payload.userId);
          }
        }
      }
    } catch (error) {
      console.error("Error getting user ID:", error);
    }
  }, [initialTicket]);

  const loadTicket = async () => {
    if (!ticket._id) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tickets/${ticket._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.ticket) {
        setTicket(result.ticket);
        setSelectedStatus(result.ticket.status);
        setSelectedTeam(result.ticket.assignedTeamId || "");
      }
    } catch (error) {
      console.error("Error loading ticket:", error);
    }
  };

  const loadHistory = async () => {
    if (!ticket._id) return;
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tickets/${ticket._id}/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.history) {
        setHistory(result.history);
      }
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStatusChange = async () => {
    if (!ticket._id || !selectedStatus || selectedStatus === ticket.status)
      return;

    setUpdatingStatus(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tickets/${ticket._id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: selectedStatus }),
      });

      const result = await response.json();
      if (response.ok) {
        showToast.success("Success", "Ticket status updated successfully");
        loadTicket();
        loadHistory();
        onUpdate();
      } else {
        showToast.error("Error", result.error || "Failed to update status");
        setSelectedStatus(ticket.status);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      showToast.error("Error", "An error occurred. Please try again.");
      setSelectedStatus(ticket.status);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleTeamAssign = async () => {
    if (!ticket._id || !selectedTeam) return;

    setUpdatingTeam(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tickets/${ticket._id}/assign`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ teamId: selectedTeam }),
      });

      const result = await response.json();
      if (response.ok) {
        showToast.success("Success", "Ticket assigned to team successfully");
        loadTicket();
        loadHistory();
        onUpdate();
      } else {
        showToast.error("Error", result.error || "Failed to assign ticket");
      }
    } catch (error) {
      console.error("Error assigning ticket:", error);
      showToast.error("Error", "An error occurred. Please try again.");
    } finally {
      setUpdatingTeam(false);
    }
  };

  const handleAdminSign = async () => {
    if (!ticket._id) return;

    if (
      !adminSignature ||
      (!adminSignature.trim() && !adminSignature.startsWith("data:image"))
    ) {
      showToast.error("Error", "Please provide your signature");
      return;
    }

    setSigningAsAdmin(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tickets/${ticket._id}/admin-sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          signature:
            adminSignatureType === "text"
              ? adminSignature.trim()
              : adminSignature,
          signatureType: adminSignatureType,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        showToast.success(
          "Success",
          "Ticket signed and completed successfully"
        );
        setAdminSignature("");
        setShowAdminSignatureForm(false);
        loadTicket();
        loadHistory();
        onUpdate();
      } else {
        showToast.error("Error", result.error || "Failed to sign ticket");
      }
    } catch (error) {
      console.error("Error signing ticket:", error);
      showToast.error("Error", "An error occurred. Please try again.");
    } finally {
      setSigningAsAdmin(false);
    }
  };

  const handleGenerateLink = async (progressId: string, day: number) => {
    if (!ticket._id) return;

    setGeneratingLink(progressId);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/tickets/${ticket._id}/progress/${day}/link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ progressId }),
        }
      );

      const result = await response.json();
      if (response.ok) {
        showToast.success("Success", "Link generated successfully");
        loadTicket();
        // Copy to clipboard
        if (result.shareableUrl) {
          await navigator.clipboard.writeText(result.shareableUrl);
          showToast.success("Copied", "Link copied to clipboard");
        }
      } else {
        showToast.error("Error", result.error || "Failed to generate link");
      }
    } catch (error) {
      console.error("Error generating link:", error);
      showToast.error("Error", "An error occurred. Please try again.");
    } finally {
      setGeneratingLink(null);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date: Date | string) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

  // Get current day (next day to add progress) - based on current user's progress only
  const getCurrentDay = (): number | null => {
    if (!currentUserId) return null; // Wait for userId to be loaded

    if (!ticket.dailyProgress || ticket.dailyProgress.length === 0) {
      return 1;
    }

    // Filter progress entries by current user
    const userProgress = ticket.dailyProgress.filter(
      (p) => p.addedBy === currentUserId
    );

    if (userProgress.length === 0) {
      // User hasn't added any progress yet, start from day 1
      return 1;
    }

    // Get the maximum day for this user
    const maxDay = Math.max(...userProgress.map((p) => p.day));
    const maxDayProgress = userProgress.find((p) => p.day === maxDay);

    // Check if max day is signed
    if (maxDayProgress?.fieldOfficerSigned) {
      // If signed and we haven't reached the limit, allow next day
      if (maxDay < ticket.numberOfWorkingDays) {
        return maxDay + 1;
      }
      return null; // All days completed
    }

    // If max day is not signed, check if it's today's entry
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastProgressDate = maxDayProgress
      ? new Date(maxDayProgress.addedAt)
      : null;
    if (lastProgressDate) {
      lastProgressDate.setHours(0, 0, 0, 0);
    }

    // If there's unsigned progress for today, allow editing it
    if (lastProgressDate && lastProgressDate.getTime() === today.getTime()) {
      return maxDay;
    }

    // If max day is not signed but it's not today, allow adding for next day
    if (maxDay < ticket.numberOfWorkingDays) {
      return maxDay + 1;
    }

    return null;
  };

  const currentDay = getCurrentDay();

  return (
    <div className="space-y-6">
      {/* Status Badge */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-sm text-muted-foreground">Status:</span>
            <span
              className={`ml-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                ticket.status
              )}`}
            >
              {ticket.status.replace("_", " ").toUpperCase()}
            </span>
          </div>
          {ticket.assignedTeamName && (
            <div>
              <span className="text-sm text-muted-foreground">
                Assigned to:
              </span>
              <span className="ml-2 text-sm font-medium">
                {ticket.assignedTeamName}
              </span>
            </div>
          )}
        </div>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowEditForm(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Ticket
          </Button>
        )}
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
          <h3 className="font-semibold">Admin Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Select
                label="Change Status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={[
                  { value: "pending", label: "Pending" },
                  { value: "in_progress", label: "In Progress" },
                  { value: "done", label: "Done" },
                ]}
              />
              {selectedStatus !== ticket.status && (
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={handleStatusChange}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? "Updating..." : "Update Status"}
                </Button>
              )}
            </div>
            <div>
              <Select
                label="Assign to Team"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                options={[
                  { value: "", label: "Select a team" },
                  ...teams.map((team) => ({
                    value: team._id,
                    label: team.name,
                  })),
                ]}
              />
              {selectedTeam && selectedTeam !== ticket.assignedTeamId && (
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={handleTeamAssign}
                  disabled={updatingTeam}
                >
                  {updatingTeam ? "Assigning..." : "Assign Team"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ticket Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Name of Work</p>
              <p className="font-medium">{ticket.nameOfWork}</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Department</p>
              <p className="font-medium">{ticket.department}</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Field Officer</p>
              <p className="font-medium">{ticket.fieldOfficerName}</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Contact No.</p>
              <p className="font-medium">{ticket.contactNo}</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Assignment Name</p>
              <p className="font-medium">{ticket.assignmentName}</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">
                Date of Commencement
              </p>
              <p className="font-medium">
                {formatDate(ticket.dateOfCommencement)}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Working Days</p>
              <p className="font-medium">{ticket.numberOfWorkingDays} days</p>
            </div>
          </div>
        </div>
        {ticket.completionDate && (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Completion Date</p>
                <p className="font-medium">
                  {formatDate(ticket.completionDate)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Description</p>
        <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {/* Daily Progress Section */}
      {(ticket.assignedTeamId || isAdmin) && (
        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              <h3 className="text-lg font-semibold">
                Daily Progress (
                {(() => {
                  // Count unique days across all progress entries
                  if (
                    !ticket.dailyProgress ||
                    ticket.dailyProgress.length === 0
                  ) {
                    return 0;
                  }
                  const uniqueDays = new Set(
                    ticket.dailyProgress.map((p) => p.day)
                  );
                  return uniqueDays.size;
                })()}
                /{ticket.numberOfWorkingDays})
              </h3>
            </div>
            {!isAdmin &&
              ticket.status === "in_progress" &&
              ticket.assignedTeamId &&
              currentDay && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingProgressDay(null);
                    setEditingProgressId(null);
                    setShowProgressForm(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Today&apos;s Progress
                </Button>
              )}
          </div>

          <div className="space-y-4">
            {ticket.dailyProgress && ticket.dailyProgress.length > 0 ? (
              (() => {
                if (isAdmin) {
                  // For admin: Group by member, then by day for better organization
                  const progressByMember = new Map<
                    string,
                    Map<number, typeof ticket.dailyProgress>
                  >();

                  ticket.dailyProgress.forEach((p) => {
                    const memberId = p.addedBy || "unknown";
                    if (!progressByMember.has(memberId)) {
                      progressByMember.set(memberId, new Map());
                    }
                    const memberProgress = progressByMember.get(memberId)!;
                    if (!memberProgress.has(p.day)) {
                      memberProgress.set(p.day, []);
                    }
                    memberProgress.get(p.day)!.push(p);
                  });

                  // Get all members for tabs
                  const allMembers = Array.from(progressByMember.entries()).map(
                    ([memberId, dayMap]) => {
                      const firstProgress = Array.from(dayMap.values())[0]?.[0];
                      return {
                        id: memberId,
                        name: firstProgress?.addedByName || "Unknown Member",
                        email: firstProgress?.addedByEmail || "",
                      };
                    }
                  );

                  // Filter by selected member
                  const displayMembers =
                    selectedMemberId === "all"
                      ? Array.from(progressByMember.entries())
                      : Array.from(progressByMember.entries()).filter(
                          ([memberId]) => memberId === selectedMemberId
                        );

                  return (
                    <div className="space-y-4">
                      {/* Member Tabs */}
                      <div className="border-b">
                        <div className="flex gap-2 overflow-x-auto">
                          <button
                            onClick={() => setSelectedMemberId("all")}
                            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                              selectedMemberId === "all"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            All Members ({allMembers.length})
                          </button>
                          {allMembers.map((member) => (
                            <button
                              key={member.id}
                              onClick={() => setSelectedMemberId(member.id)}
                              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                selectedMemberId === member.id
                                  ? "border-primary text-primary"
                                  : "border-transparent text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {member.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Member Progress */}
                      <div className="space-y-6">
                        {displayMembers.map(([memberId, dayMap]) => {
                          const firstProgress = Array.from(
                            dayMap.values()
                          )[0]?.[0];
                          const memberName =
                            firstProgress?.addedByName || "Unknown Member";
                          const memberEmail = firstProgress?.addedByEmail || "";

                          return (
                            <div
                              key={memberId}
                              className="border rounded-lg p-4 sm:p-6 space-y-4 bg-card"
                            >
                              <div className="border-b pb-3 mb-4">
                                <h4 className="font-semibold text-lg">
                                  {memberName}
                                </h4>
                                {memberEmail && (
                                  <p className="text-sm text-muted-foreground">
                                    {memberEmail}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-4">
                                {Array.from(dayMap.entries())
                                  .sort(([a], [b]) => a - b)
                                  .map(([day, progressList]) => (
                                    <div
                                      key={day}
                                      className="border rounded-lg p-4 bg-muted/30 space-y-3"
                                    >
                                      <div className="flex items-center justify-between flex-wrap gap-2">
                                        <h5 className="font-medium">
                                          Day {day}
                                        </h5>
                                        <p className="text-xs text-muted-foreground">
                                          {progressList.length}{" "}
                                          {progressList.length === 1
                                            ? "entry"
                                            : "entries"}
                                        </p>
                                      </div>

                                      {progressList.map((progress, idx) => (
                                        <div
                                          key={progress._id || idx}
                                          className="border rounded-lg p-4 bg-background space-y-3"
                                        >
                                          <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                              {progress.fieldOfficerSigned ? (
                                                <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                                  <CheckCircle className="h-3 w-3" />
                                                  Approved
                                                </span>
                                              ) : (
                                                <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                                                  <Clock className="h-3 w-3" />
                                                  Pending Approval
                                                </span>
                                              )}
                                            </div>
                                            {progress.addedAt && (
                                              <p className="text-xs text-muted-foreground">
                                                {formatDateTime(
                                                  progress.addedAt
                                                )}
                                              </p>
                                            )}
                                          </div>
                                          <div className="bg-muted/50 rounded-lg p-3">
                                            <p className="text-sm whitespace-pre-wrap">
                                              {progress.progressSummary}
                                            </p>
                                          </div>

                                          {/* Photos */}
                                          {progress.photos &&
                                            progress.photos.length > 0 && (
                                              <div className="mt-3">
                                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                                  Photos:
                                                </p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                  {progress.photos.map(
                                                    (photoUrl, photoIndex) => (
                                                      <div
                                                        key={photoIndex}
                                                        className="relative group"
                                                      >
                                                        <img
                                                          src={photoUrl}
                                                          alt={`Progress photo ${
                                                            photoIndex + 1
                                                          }`}
                                                          className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                                          onClick={() =>
                                                            window.open(
                                                              photoUrl,
                                                              "_blank"
                                                            )
                                                          }
                                                        />
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              </div>
                                            )}

                                          {progress.fieldOfficerSigned &&
                                            progress.fieldOfficerSignature && (
                                              <div className="border-t pt-3">
                                                <p className="text-sm text-muted-foreground">
                                                  <span className="font-medium">
                                                    Approved by:
                                                  </span>{" "}
                                                  {progress.fieldOfficerSignatureType ===
                                                  "image" ? (
                                                    <img
                                                      src={
                                                        progress.fieldOfficerSignature
                                                      }
                                                      alt="Signature"
                                                      className="inline-block max-h-12 border rounded"
                                                    />
                                                  ) : (
                                                    progress.fieldOfficerSignature
                                                  )}
                                                  {progress.fieldOfficerSignedAt && (
                                                    <span className="ml-2">
                                                      on{" "}
                                                      {formatDateTime(
                                                        progress.fieldOfficerSignedAt
                                                      )}
                                                    </span>
                                                  )}
                                                </p>
                                              </div>
                                            )}
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                } else {
                  // For team members: Group by day, filter by current user
                  const progressByDay = new Map<
                    number,
                    typeof ticket.dailyProgress
                  >();
                  ticket.dailyProgress.forEach((p) => {
                    if (!progressByDay.has(p.day)) {
                      progressByDay.set(p.day, []);
                    }
                    progressByDay.get(p.day)!.push(p);
                  });

                  if (!currentUserId) {
                    return (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Loading progress...
                      </p>
                    );
                  }

                  // Filter progress by current user
                  const filteredProgress: Array<
                    [number, typeof ticket.dailyProgress]
                  > = Array.from(progressByDay.entries())
                    .map(
                      ([day, progressList]): [
                        number,
                        typeof ticket.dailyProgress
                      ] => [
                        day,
                        progressList.filter((p) => p.addedBy === currentUserId),
                      ]
                    )
                    .filter(([_, progressList]) => progressList.length > 0);

                  return filteredProgress.length > 0 ? (
                    <div className="space-y-6">
                      {filteredProgress
                        .sort(([a], [b]) => a - b)
                        .map(([day, progressList]) => (
                          <div
                            key={day}
                            className="border rounded-lg p-4 sm:p-6 space-y-4"
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <h4 className="font-semibold text-lg">
                                Day {day}
                              </h4>
                            </div>

                            <div className="space-y-4">
                              {progressList.map(
                                (
                                  progress: (typeof ticket.dailyProgress)[0],
                                  idx: number
                                ) => (
                                  <div
                                    key={progress._id || idx}
                                    className="border rounded-lg p-4 bg-muted/30 space-y-3"
                                  >
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <div className="flex items-center gap-2">
                                        {progress.fieldOfficerSigned ? (
                                          <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                            <CheckCircle className="h-3 w-3" />
                                            Approved
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                                            <Clock className="h-3 w-3" />
                                            Pending Approval
                                          </span>
                                        )}
                                        {progress.addedByName && (
                                          <span className="text-xs text-muted-foreground">
                                            by {progress.addedByName}
                                            {progress.addedByEmail &&
                                              ` (${progress.addedByEmail})`}
                                          </span>
                                        )}
                                      </div>
                                      {progress.addedAt && (
                                        <p className="text-xs text-muted-foreground">
                                          {formatDateTime(progress.addedAt)}
                                        </p>
                                      )}
                                    </div>
                                    <div className="bg-background rounded-lg p-3">
                                      <p className="text-sm whitespace-pre-wrap">
                                        {progress.progressSummary}
                                      </p>
                                    </div>

                                    {/* Photos */}
                                    {progress.photos &&
                                      progress.photos.length > 0 && (
                                        <div className="mt-3">
                                          <p className="text-xs font-medium text-muted-foreground mb-2">
                                            Photos:
                                          </p>
                                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {progress.photos.map(
                                              (
                                                photoUrl: string,
                                                photoIndex: number
                                              ) => (
                                                <div
                                                  key={photoIndex}
                                                  className="relative group"
                                                >
                                                  <img
                                                    src={photoUrl}
                                                    alt={`Progress photo ${
                                                      photoIndex + 1
                                                    }`}
                                                    className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() =>
                                                      window.open(
                                                        photoUrl,
                                                        "_blank"
                                                      )
                                                    }
                                                  />
                                                  {!isAdmin &&
                                                    !progress.fieldOfficerSigned &&
                                                    progress.addedBy ===
                                                      currentUserId && (
                                                      <button
                                                        onClick={async (e) => {
                                                          e.stopPropagation();
                                                          if (
                                                            !ticket._id ||
                                                            !progress._id
                                                          )
                                                            return;

                                                          try {
                                                            const token =
                                                              localStorage.getItem(
                                                                "token"
                                                              );
                                                            const response =
                                                              await fetch(
                                                                `/api/tickets/${ticket._id}/progress/upload-photo`,
                                                                {
                                                                  method:
                                                                    "DELETE",
                                                                  headers: {
                                                                    "Content-Type":
                                                                      "application/json",
                                                                    Authorization: `Bearer ${token}`,
                                                                  },
                                                                  body: JSON.stringify(
                                                                    {
                                                                      progressId:
                                                                        progress._id,
                                                                      photoUrl,
                                                                    }
                                                                  ),
                                                                }
                                                              );

                                                            const result =
                                                              await response.json();
                                                            if (response.ok) {
                                                              showToast.success(
                                                                "Success",
                                                                "Photo deleted successfully"
                                                              );
                                                              loadTicket();
                                                              onUpdate();
                                                            } else {
                                                              showToast.error(
                                                                "Error",
                                                                result.error ||
                                                                  "Failed to delete photo"
                                                              );
                                                            }
                                                          } catch (error) {
                                                            console.error(
                                                              "Error deleting photo:",
                                                              error
                                                            );
                                                            showToast.error(
                                                              "Error",
                                                              "Failed to delete photo"
                                                            );
                                                          }
                                                        }}
                                                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                      >
                                                        <Trash2 className="h-3 w-3" />
                                                      </button>
                                                    )}
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      )}

                                    {progress.fieldOfficerSigned &&
                                      progress.fieldOfficerSignature && (
                                        <div className="border-t pt-3">
                                          <p className="text-sm text-muted-foreground">
                                            <span className="font-medium">
                                              Approved by:
                                            </span>{" "}
                                            {progress.fieldOfficerSignatureType ===
                                            "image" ? (
                                              <img
                                                src={
                                                  progress.fieldOfficerSignature
                                                }
                                                alt="Signature"
                                                className="inline-block max-h-12 border rounded"
                                              />
                                            ) : (
                                              progress.fieldOfficerSignature
                                            )}
                                            {progress.fieldOfficerSignedAt && (
                                              <span className="ml-2">
                                                on{" "}
                                                {formatDateTime(
                                                  progress.fieldOfficerSignedAt
                                                )}
                                              </span>
                                            )}
                                          </p>
                                        </div>
                                      )}
                                    {!isAdmin &&
                                      !progress.fieldOfficerSigned &&
                                      progress.addedBy === currentUserId && (
                                        <div className="flex gap-2 pt-2 border-t">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setEditingProgressDay(
                                                progress.day
                                              );
                                              setEditingProgressId(
                                                progress._id || null
                                              );
                                              setShowProgressForm(true);
                                            }}
                                          >
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                          </Button>
                                          {(() => {
                                            const isLinkExpired =
                                              progress.linkExpiresAt
                                                ? new Date(
                                                    progress.linkExpiresAt
                                                  ) < new Date()
                                                : false;
                                            const hasValidLink =
                                              progress.shareableLink &&
                                              !isLinkExpired;

                                            if (hasValidLink) {
                                              return (
                                                <div className="flex-1 flex items-center gap-2">
                                                  <input
                                                    type="text"
                                                    value={`${
                                                      typeof window !==
                                                      "undefined"
                                                        ? window.location.origin
                                                        : ""
                                                    }/progress/${
                                                      progress.shareableLink
                                                    }`}
                                                    readOnly
                                                    className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
                                                  />
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={async () => {
                                                      const url = `${
                                                        typeof window !==
                                                        "undefined"
                                                          ? window.location
                                                              .origin
                                                          : ""
                                                      }/progress/${
                                                        progress.shareableLink
                                                      }`;
                                                      await navigator.clipboard.writeText(
                                                        url
                                                      );
                                                      showToast.success(
                                                        "Copied",
                                                        "Link copied to clipboard"
                                                      );
                                                    }}
                                                  >
                                                    <LinkIcon className="h-4 w-4" />
                                                  </Button>
                                                  {progress.linkExpiresAt && (
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                      Expires:{" "}
                                                      {formatDateTime(
                                                        progress.linkExpiresAt
                                                      )}
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            } else if (
                                              progress.shareableLink &&
                                              isLinkExpired
                                            ) {
                                              return (
                                                <div className="flex-1 flex items-center gap-2 flex-wrap">
                                                  <div className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md bg-yellow-50 border-yellow-200 text-yellow-700">
                                                    <Clock className="h-4 w-4" />
                                                    <span>Link expired</span>
                                                    {progress.linkExpiresAt && (
                                                      <span className="text-xs">
                                                        (Expired:{" "}
                                                        {formatDateTime(
                                                          progress.linkExpiresAt
                                                        )}
                                                        )
                                                      </span>
                                                    )}
                                                  </div>
                                                  <Button
                                                    size="sm"
                                                    onClick={() =>
                                                      handleGenerateLink(
                                                        progress._id ||
                                                          progress.day.toString(),
                                                        progress.day
                                                      )
                                                    }
                                                    disabled={
                                                      generatingLink ===
                                                      (progress._id ||
                                                        progress.day.toString())
                                                    }
                                                  >
                                                    {generatingLink ===
                                                    (progress._id ||
                                                      progress.day.toString()) ? (
                                                      "Generating..."
                                                    ) : (
                                                      <>
                                                        <LinkIcon className="h-4 w-4 mr-2" />
                                                        Generate New Link
                                                      </>
                                                    )}
                                                  </Button>
                                                </div>
                                              );
                                            } else {
                                              return (
                                                <Button
                                                  size="sm"
                                                  onClick={() =>
                                                    handleGenerateLink(
                                                      progress._id ||
                                                        progress.day.toString(),
                                                      progress.day
                                                    )
                                                  }
                                                  disabled={
                                                    generatingLink ===
                                                    (progress._id ||
                                                      progress.day.toString())
                                                  }
                                                >
                                                  {generatingLink ===
                                                  (progress._id ||
                                                    progress.day.toString()) ? (
                                                    "Generating..."
                                                  ) : (
                                                    <>
                                                      <LinkIcon className="h-4 w-4 mr-2" />
                                                      Generate Link
                                                    </>
                                                  )}
                                                </Button>
                                              );
                                            }
                                          })()}
                                        </div>
                                      )}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {isAdmin
                        ? "No progress added yet"
                        : "You haven't added any progress yet"}
                    </p>
                  );
                }
              })()
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No progress added yet
              </p>
            )}

            {/* Admin Final Signature */}
            {isAdmin &&
              ticket.dailyProgress &&
              ticket.dailyProgress.length > 0 && (
                <div className="border rounded-lg p-4 sm:p-6 bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h4 className="font-semibold text-lg">Final Signature</h4>
                      <p className="text-sm text-muted-foreground">
                        All daily progress must be approved before admin can
                        sign
                      </p>
                    </div>
                    {ticket.adminSigned ? (
                      <div className="space-y-2">
                        <span className="flex items-center gap-1 text-sm text-green-700 bg-green-100 px-3 py-1 rounded-full">
                          <CheckCircle className="h-4 w-4" />
                          Signed
                        </span>
                        {ticket.adminSignature && (
                          <div className="text-sm">
                            {ticket.adminSignatureType === "image" ? (
                              <img
                                src={ticket.adminSignature}
                                alt="Admin Signature"
                                className="max-h-16 border rounded"
                              />
                            ) : (
                              <p className="font-medium">
                                {ticket.adminSignature}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {!showAdminSignatureForm ? (
                          <Button
                            size="sm"
                            onClick={() => setShowAdminSignatureForm(true)}
                            disabled={
                              !ticket.dailyProgress ||
                              ticket.dailyProgress.length === 0 ||
                              !ticket.dailyProgress.every(
                                (p) => p.fieldOfficerSigned
                              )
                            }
                          >
                            Sign & Complete
                          </Button>
                        ) : (
                          <div className="space-y-3">
                            <SignaturePad
                              value={adminSignature}
                              onChange={(sig, type) => {
                                setAdminSignature(sig);
                                setAdminSignatureType(type);
                              }}
                              label="Admin Signature"
                              disabled={signingAsAdmin}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setShowAdminSignatureForm(false);
                                  setAdminSignature("");
                                }}
                                disabled={signingAsAdmin}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleAdminSign}
                                disabled={signingAsAdmin || !adminSignature}
                              >
                                {signingAsAdmin
                                  ? "Signing..."
                                  : "Sign & Complete"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {ticket.adminSigned && ticket.adminSignedAt && (
                    <p className="text-xs text-muted-foreground">
                      Signed on {formatDateTime(ticket.adminSignedAt)}
                    </p>
                  )}
                </div>
              )}
          </div>
        </div>
      )}

      {/* History */}
      <div className="border-t pt-6">
        <button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory && history.length === 0) {
              loadHistory();
            }
          }}
          className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
        >
          <History className="h-4 w-4" />
          Ticket History ({history.length})
        </button>
        {showHistory && (
          <div className="mt-4 space-y-3">
            {loadingHistory ? (
              <p className="text-sm text-muted-foreground">
                Loading history...
              </p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No history available
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((entry, index) => (
                  <div
                    key={index}
                    className="border-l-2 border-primary/20 pl-4 py-2"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {entry.description || entry.action}
                        </p>
                        {entry.oldValue && entry.newValue && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Changed from{" "}
                            <span className="font-medium">
                              {entry.oldValue}
                            </span>{" "}
                            to{" "}
                            <span className="font-medium">
                              {entry.newValue}
                            </span>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          by {entry.changedByName || "User"} •{" "}
                          {formatDateTime(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress Form */}
      {ticket && (
        <ProgressForm
          open={showProgressForm}
          onClose={() => {
            setShowProgressForm(false);
            setEditingProgressDay(null);
            setEditingProgressId(null);
          }}
          onSuccess={() => {
            loadTicket();
            onUpdate();
            setShowProgressForm(false);
            setEditingProgressDay(null);
            setEditingProgressId(null);
          }}
          ticket={ticket}
          editingDay={editingProgressDay}
          editingProgressId={editingProgressId}
        />
      )}

      {/* Edit Ticket Form */}
      {ticket && isAdmin && (
        <EditTicketForm
          open={showEditForm}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => {
            loadTicket();
            onUpdate();
            setShowEditForm(false);
          }}
          ticket={ticket}
        />
      )}
    </div>
  );
}
