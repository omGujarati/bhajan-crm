"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { showToast } from "@/lib/toast";
import { X } from "lucide-react";

interface TicketFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isTeamMember?: boolean;
  userTeams?: { _id: string; name: string }[];
  isAdmin?: boolean;
  allTeams?: { _id: string; name: string }[]; // All teams for admin
}

export function TicketForm({ open, onClose, onSuccess, isTeamMember = false, userTeams = [], isAdmin = false, allTeams = [] }: TicketFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nameOfWork: "",
    department: "",
    fieldOfficerName: "",
    contactNo: "",
    assignmentName: "",
    description: "",
    dateOfCommencement: "",
    numberOfWorkingDays: "",
    completionDate: "",
    assignedTeamId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoCalculateCompletion, setAutoCalculateCompletion] = useState(true);

  useEffect(() => {
    if (autoCalculateCompletion && formData.dateOfCommencement && formData.numberOfWorkingDays) {
      const commencementDate = new Date(formData.dateOfCommencement);
      if (!isNaN(commencementDate.getTime())) {
        const workingDays = parseInt(formData.numberOfWorkingDays, 10);
        if (!isNaN(workingDays) && workingDays > 0) {
          const completionDate = calculateCompletionDate(commencementDate, workingDays);
          setFormData((prev) => ({
            ...prev,
            completionDate: completionDate.toISOString().split("T")[0],
          }));
        }
      }
    }
  }, [formData.dateOfCommencement, formData.numberOfWorkingDays, autoCalculateCompletion]);

  const calculateCompletionDate = (commencementDate: Date, workingDays: number): Date => {
    const completionDate = new Date(commencementDate);
    let daysAdded = 0;
    let currentDate = new Date(commencementDate);

    while (daysAdded < workingDays) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }

    return currentDate;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nameOfWork.trim()) {
      newErrors.nameOfWork = "Name of work is required";
    }
    if (!formData.department.trim()) {
      newErrors.department = "Department is required";
    }
    if (!formData.fieldOfficerName.trim()) {
      newErrors.fieldOfficerName = "Field officer name is required";
    }
    if (!formData.contactNo.trim()) {
      newErrors.contactNo = "Contact number is required";
    } else if (!/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(formData.contactNo)) {
      newErrors.contactNo = "Invalid contact number format";
    }
    if (!formData.assignmentName.trim()) {
      newErrors.assignmentName = "Assignment name is required";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!formData.dateOfCommencement) {
      newErrors.dateOfCommencement = "Date of commencement is required";
    }
    if (!formData.numberOfWorkingDays) {
      newErrors.numberOfWorkingDays = "Number of working days is required";
    } else {
      const days = parseInt(formData.numberOfWorkingDays, 10);
      if (isNaN(days) || days < 1 || days > 1000) {
        newErrors.numberOfWorkingDays = "Number of working days must be between 1 and 1000";
      }
    }
    if (isTeamMember && !formData.assignedTeamId) {
      newErrors.assignedTeamId = "Team selection is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/tickets/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          numberOfWorkingDays: parseInt(formData.numberOfWorkingDays, 10),
          completionDate: formData.completionDate || undefined,
          assignedTeamId: formData.assignedTeamId || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast.error("Error", result.error || "Failed to create ticket");
        return;
      }

      showToast.success("Success", "Ticket created successfully");
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error creating ticket:", error);
      showToast.error("Error", "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      nameOfWork: "",
      department: "",
      fieldOfficerName: "",
      contactNo: "",
      assignmentName: "",
      description: "",
      dateOfCommencement: "",
      numberOfWorkingDays: "",
      completionDate: "",
      assignedTeamId: "",
    });
    setErrors({});
    setAutoCalculateCompletion(true);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative z-50 w-full max-w-3xl bg-card border rounded-lg shadow-xl max-h-[90vh] overflow-y-auto mx-4">
        <div className="sticky top-0 bg-card border-b p-4 sm:p-6 flex items-center justify-between z-10">
          <h2 className="text-lg sm:text-xl font-semibold">Create New Ticket</h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Name of Work"
              value={formData.nameOfWork}
              onChange={(e) => {
                setFormData({ ...formData, nameOfWork: e.target.value });
                setErrors({ ...errors, nameOfWork: "" });
              }}
              error={errors.nameOfWork}
              required
            />
            <TextField
              label="Department"
              value={formData.department}
              onChange={(e) => {
                setFormData({ ...formData, department: e.target.value });
                setErrors({ ...errors, department: "" });
              }}
              error={errors.department}
              required
            />
            <TextField
              label="Field Officer Name"
              value={formData.fieldOfficerName}
              onChange={(e) => {
                setFormData({ ...formData, fieldOfficerName: e.target.value });
                setErrors({ ...errors, fieldOfficerName: "" });
              }}
              error={errors.fieldOfficerName}
              required
            />
            <TextField
              label="Contact No."
              type="tel"
              value={formData.contactNo}
              onChange={(e) => {
                setFormData({ ...formData, contactNo: e.target.value });
                setErrors({ ...errors, contactNo: "" });
              }}
              error={errors.contactNo}
              required
            />
            <TextField
              label="Assignment Name"
              value={formData.assignmentName}
              onChange={(e) => {
                setFormData({ ...formData, assignmentName: e.target.value });
                setErrors({ ...errors, assignmentName: "" });
              }}
              error={errors.assignmentName}
              required
            />
            <TextField
              label="Date of Commencement"
              type="date"
              value={formData.dateOfCommencement}
              onChange={(e) => {
                setFormData({ ...formData, dateOfCommencement: e.target.value });
                setErrors({ ...errors, dateOfCommencement: "" });
              }}
              error={errors.dateOfCommencement}
              required
            />
            <TextField
              label="No. of Working Days"
              type="number"
              min="1"
              max="1000"
              value={formData.numberOfWorkingDays}
              onChange={(e) => {
                setFormData({ ...formData, numberOfWorkingDays: e.target.value });
                setErrors({ ...errors, numberOfWorkingDays: "" });
              }}
              error={errors.numberOfWorkingDays}
              required
            />
            <div>
              <TextField
                label="Completion Date"
                type="date"
                value={formData.completionDate}
                onChange={(e) => {
                  setFormData({ ...formData, completionDate: e.target.value });
                  setAutoCalculateCompletion(false);
                }}
                helperText={autoCalculateCompletion ? "Auto-calculated based on working days" : "Manually set"}
              />
              <button
                type="button"
                onClick={() => {
                  setAutoCalculateCompletion(true);
                  if (formData.dateOfCommencement && formData.numberOfWorkingDays) {
                    const commencementDate = new Date(formData.dateOfCommencement);
                    const workingDays = parseInt(formData.numberOfWorkingDays, 10);
                    if (!isNaN(commencementDate.getTime()) && !isNaN(workingDays)) {
                      const completionDate = calculateCompletionDate(commencementDate, workingDays);
                      setFormData((prev) => ({
                        ...prev,
                        completionDate: completionDate.toISOString().split("T")[0],
                      }));
                    }
                  }
                }}
                className="text-xs text-primary hover:underline mt-1"
              >
                Auto-calculate
              </button>
            </div>
          </div>
          {(isTeamMember && userTeams.length > 0) || (isAdmin && allTeams.length > 0) ? (
            <Select
              label={isTeamMember ? "Assign to Team" : "Assign to Team (Optional)"}
              value={formData.assignedTeamId}
              onChange={(e) => {
                setFormData({ ...formData, assignedTeamId: e.target.value });
              }}
              options={[
                { value: "", label: isTeamMember ? "Select a team" : "Leave unassigned (Admin will assign later)" },
                ...(isTeamMember ? userTeams : allTeams).map((team) => ({
                  value: team._id,
                  label: team.name,
                })),
              ]}
              helperText={isTeamMember ? "Select a team to assign this ticket to. Status will be set to 'in_progress'." : "Select a team to assign this ticket to, or leave unassigned"}
              error={isTeamMember && !formData.assignedTeamId ? "Team selection is required" : errors.assignedTeamId}
            />
          ) : null}
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => {
              setFormData({ ...formData, description: e.target.value });
              setErrors({ ...errors, description: "" });
            }}
            error={errors.description}
            rows={4}
            required
          />
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Ticket"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

