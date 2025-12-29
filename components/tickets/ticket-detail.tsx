"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog } from "@/components/ui/dialog";
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
  X,
  Plus,
  CheckCircle,
  XCircle,
  ClipboardList,
} from "lucide-react";
import { Ticket, TicketHistory } from "@/server/models/ticket";
import { ProgressForm } from "./progress-form";

interface TicketDetailProps {
  open: boolean;
  onClose: () => void;
  ticketId: string | null;
  isAdmin: boolean;
  teams?: { _id: string; name: string }[];
  onUpdate: () => void;
}

export function TicketDetail({
  open,
  onClose,
  ticketId,
  isAdmin,
  teams = [],
  onUpdate,
}: TicketDetailProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingTeam, setUpdatingTeam] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [signingAsAdmin, setSigningAsAdmin] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
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
        setSelectedStatus(result.ticket.status);
        setSelectedTeam(result.ticket.assignedTeamId || "");
      } else {
        showToast.error("Error", result.error || "Failed to load ticket");
      }
    } catch (error) {
      console.error("Error loading ticket:", error);
      showToast.error("Error", "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  const loadHistory = useCallback(async () => {
    if (!ticketId) return;
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tickets/${ticketId}/history`, {
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
  }, [ticketId]);

  useEffect(() => {
    if (open && ticketId) {
      loadTicket();
      loadHistory();
    }
  }, [open, ticketId, loadTicket, loadHistory]);

  const handleStatusChange = async () => {
    if (!ticketId || !selectedStatus || selectedStatus === ticket?.status)
      return;

    setUpdatingStatus(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tickets/${ticketId}/status`, {
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
        setSelectedStatus(ticket?.status || "");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      showToast.error("Error", "An error occurred. Please try again.");
      setSelectedStatus(ticket?.status || "");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleTeamAssign = async () => {
    if (!ticketId || !selectedTeam) return;

    setUpdatingTeam(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tickets/${ticketId}/assign`, {
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
    if (!ticketId) return;

    setSigningAsAdmin(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tickets/${ticketId}/admin-sign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        showToast.success(
          "Success",
          "Ticket signed and completed successfully"
        );
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

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
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

  if (!open || !ticket) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title={`Ticket ${ticket.ticketNo}`}
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p>Loading...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status Badge */}
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
                  <p className="text-sm text-muted-foreground">
                    Assignment Name
                  </p>
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
                  <p className="font-medium">
                    {ticket.numberOfWorkingDays} days
                  </p>
                </div>
              </div>
            </div>
            {ticket.completionDate && (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Completion Date
                    </p>
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
          {ticket.assignedTeamId && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowProgress(!showProgress);
                  }}
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  <ClipboardList className="h-4 w-4" />
                  Daily Progress ({ticket.dailyProgress?.length || 0}/
                  {ticket.numberOfWorkingDays})
                </button>
                {!isAdmin && ticket.status === "in_progress" && (
                  <Button size="sm" onClick={() => setShowProgressForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Progress
                  </Button>
                )}
              </div>

              {showProgress && (
                <div className="space-y-4 mt-4">
                  {ticket.dailyProgress && ticket.dailyProgress.length > 0 ? (
                    <div className="space-y-3">
                      {ticket.dailyProgress
                        .sort((a, b) => a.day - b.day)
                        .map((progress, index) => (
                          <div
                            key={index}
                            className="border rounded-lg p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">
                                  Day {progress.day}
                                </h4>
                                {progress.fieldOfficerSigned ? (
                                  <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                    <CheckCircle className="h-3 w-3" />
                                    Signed
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                                    <Clock className="h-3 w-3" />
                                    Pending
                                  </span>
                                )}
                              </div>
                              {progress.addedAt && (
                                <p className="text-xs text-muted-foreground">
                                  {formatDateTime(progress.addedAt)}
                                </p>
                              )}
                            </div>
                            <div className="bg-muted/50 rounded p-3">
                              <p className="text-sm whitespace-pre-wrap">
                                {progress.progressSummary}
                              </p>
                            </div>
                            {progress.addedByName && (
                              <p className="text-xs text-muted-foreground">
                                Added by: {progress.addedByName}
                              </p>
                            )}
                            {progress.fieldOfficerSigned &&
                              progress.fieldOfficerSignature && (
                                <div className="border-t pt-3">
                                  <p className="text-xs text-muted-foreground">
                                    Signed by:{" "}
                                    <span className="font-medium">
                                      {progress.fieldOfficerSignature}
                                    </span>
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
                            {progress.shareableLink &&
                              !progress.fieldOfficerSigned && (
                                <div className="border-t pt-3">
                                  <p className="text-xs text-muted-foreground">
                                    Link: {progress.shareableLink}
                                    {progress.linkExpiresAt &&
                                      new Date(progress.linkExpiresAt) >
                                        new Date() && (
                                        <span className="ml-2">
                                          (Expires:{" "}
                                          {formatDateTime(
                                            progress.linkExpiresAt
                                          )}
                                          )
                                        </span>
                                      )}
                                  </p>
                                </div>
                              )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No progress added yet
                    </p>
                  )}

                  {/* Admin Final Signature */}
                  {isAdmin &&
                    ticket.dailyProgress &&
                    ticket.dailyProgress.length ===
                      ticket.numberOfWorkingDays && (
                      <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">Final Signature</h4>
                            <p className="text-sm text-muted-foreground">
                              All daily progress must be signed before admin can
                              sign
                            </p>
                          </div>
                          {ticket.adminSigned ? (
                            <span className="flex items-center gap-1 text-sm text-green-700 bg-green-100 px-3 py-1 rounded-full">
                              <CheckCircle className="h-4 w-4" />
                              Signed by {ticket.adminSignature}
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={handleAdminSign}
                              disabled={
                                signingAsAdmin ||
                                !ticket.dailyProgress?.every(
                                  (p) => p.fieldOfficerSigned
                                )
                              }
                            >
                              {signingAsAdmin
                                ? "Signing..."
                                : "Sign & Complete"}
                            </Button>
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
              )}
            </div>
          )}

          {/* History */}
          <div className="border-t pt-4">
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
        </div>
      )}

      {/* Progress Form */}
      {ticket && (
        <ProgressForm
          open={showProgressForm}
          onClose={() => setShowProgressForm(false)}
          onSuccess={() => {
            loadTicket();
            onUpdate();
          }}
          ticket={ticket}
        />
      )}
    </Dialog>
  );
}
