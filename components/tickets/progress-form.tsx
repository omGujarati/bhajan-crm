"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/lib/toast";
import { X, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { Ticket } from "@/server/models/ticket";

interface ProgressFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ticket: Ticket;
  editingDay?: number | null;
  editingProgressId?: string | null; // ID of progress entry being edited
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export function ProgressForm({
  open,
  onClose,
  onSuccess,
  ticket,
  editingDay,
  editingProgressId,
}: ProgressFormProps) {
  const [loading, setLoading] = useState(false);
  const [progressSummary, setProgressSummary] = useState("");
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<string[]>([]); // Array of photo URLs
  const [uploadingPhotos, setUploadingPhotos] = useState<string[]>([]); // Array of file names being uploaded
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current user ID from token
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
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
  }, []);

  // Determine which day we're working on (based on team progress, not individual member)
  const getCurrentDay = (): number | null => {
    if (editingDay !== null && editingDay !== undefined) {
      return editingDay;
    }

    // Auto-detect: next day to add progress for the team
    if (!ticket.dailyProgress || ticket.dailyProgress.length === 0) {
      return 1;
    }

    // Get team progress (filter by assigned team)
    const teamProgress = ticket.dailyProgress.filter(
      (p) => p.addedByTeam === ticket.assignedTeamId
    );

    if (teamProgress.length === 0) {
      // Team hasn't added any progress yet, start from day 1
      return 1;
    }

    // Get the maximum day for this team
    const maxDay = Math.max(...teamProgress.map((p) => p.day));
    const maxDayProgress = teamProgress.find((p) => p.day === maxDay);

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

  useEffect(() => {
    if (open) {
      if (editingDay !== null && editingDay !== undefined) {
        // Load existing progress for editing
        const progress = editingProgressId
          ? ticket.dailyProgress?.find(
              (p) => p._id === editingProgressId && p.day === editingDay
            )
          : ticket.dailyProgress?.find((p) => p.day === editingDay);
        if (progress) {
          setProgressSummary(progress.progressSummary);
          setPhotos(progress.photos || []);
        } else {
          setProgressSummary("");
          setPhotos([]);
        }
      } else {
        // New progress - start empty
        setProgressSummary("");
        setPhotos([]);
      }
      setError("");
    }
  }, [open, editingDay, editingProgressId, ticket.dailyProgress]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast.error(
        "Error",
        "Invalid file type. Only JPG, PNG, and JPEG are allowed."
      );
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      showToast.error("Error", "File size exceeds 50MB limit");
      return;
    }

    // Upload file
    setUploadingPhotos([...uploadingPhotos, file.name]);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      // If editing existing progress, use its progressId
      // Otherwise, we'll need to upload after progress is created
      const progressIdToUse = editingProgressId || "";
      formData.append("progressId", progressIdToUse);

      const response = await fetch(
        `/api/tickets/${ticket._id}/progress/upload-photo`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        showToast.error("Error", result.error || "Failed to upload photo");
        return;
      }

      // If we have a progressId, the photo is already saved to the database
      // If not, we'll store it locally and upload it after progress is created
      if (progressIdToUse) {
        // Photo is already linked to progress entry
        setPhotos([...photos, result.photoUrl]);
      } else {
        // Store locally - will be uploaded when progress is created
        // For now, just add to local state. The upload endpoint will handle it
        // when we create the progress entry with a progressId
        setPhotos([...photos, result.photoUrl]);
      }

      showToast.success("Success", "Photo uploaded successfully");
    } catch (error) {
      console.error("Error uploading photo:", error);
      showToast.error("Error", "Failed to upload photo");
    } finally {
      setUploadingPhotos(uploadingPhotos.filter((name) => name !== file.name));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    if (!editingProgressId) {
      // If no progressId yet, just remove from local state
      setPhotos(photos.filter((url) => url !== photoUrl));
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/tickets/${ticket._id}/progress/upload-photo`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            progressId: editingProgressId,
            photoUrl,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        showToast.error("Error", result.error || "Failed to delete photo");
        return;
      }

      setPhotos(photos.filter((url) => url !== photoUrl));
      showToast.success("Success", "Photo deleted successfully");
    } catch (error) {
      console.error("Error deleting photo:", error);
      showToast.error("Error", "Failed to delete photo");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentDay) {
      setError("Cannot add progress - all days are completed");
      return;
    }

    if (!progressSummary.trim()) {
      setError("Please enter progress summary");
      return;
    }

    if (progressSummary.trim().length < 10) {
      setError("Progress summary must be at least 10 characters");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");

      // First, save progress to get/create progressId
      const response = await fetch(`/api/tickets/${ticket._id}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          day: currentDay,
          progressSummary: progressSummary.trim(),
          progressId: editingProgressId || undefined,
          photos: photos, // Include photos array
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast.error("Error", result.error || "Failed to add progress");
        setError(result.error || "Failed to add progress");
        return;
      }

      // Photos are already included in the request above, so they should be linked
      showToast.success(
        "Success",
        editingDay
          ? "Progress updated successfully"
          : "Progress added successfully"
      );
      setProgressSummary("");
      setPhotos([]);
      onSuccess();
    } catch (error) {
      console.error("Error adding progress:", error);
      showToast.error("Error", "An error occurred. Please try again.");
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setProgressSummary("");
    setPhotos([]);
    setError("");
    onClose();
  };

  if (!open || !currentDay) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative z-50 w-full max-w-2xl bg-card border rounded-lg shadow-xl max-h-[90vh] overflow-y-auto mx-4">
        <div className="sticky top-0 bg-card border-b p-4 sm:p-6 flex items-center justify-between z-10">
          <h2 className="text-lg sm:text-xl font-semibold">
            {editingDay
              ? `Edit Day ${editingDay} Progress`
              : `Add Day ${currentDay} Progress`}
          </h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-1">
              Day {currentDay} of {ticket.numberOfWorkingDays}
            </p>
            <p className="text-xs text-muted-foreground">
              {editingDay
                ? "Update your progress summary for this day"
                : "Add your daily progress summary"}
            </p>
          </div>

          <Textarea
            label="Progress Summary"
            value={progressSummary}
            onChange={(e) => {
              setProgressSummary(e.target.value);
              setError("");
            }}
            error={error}
            rows={8}
            placeholder="Enter detailed progress summary for today's work..."
            required
          />

          {/* Photo Upload Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Photos (Optional)
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFileSelect}
                className="hidden"
                id="photo-upload"
                disabled={loading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || uploadingPhotos.length > 0}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingPhotos.length > 0 ? "Uploading..." : "Upload Photo"}
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, JPEG (Max 50MB)
              </p>
            </div>

            {/* Photo Preview Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                {photos.map((photoUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photoUrl}
                      alt={`Progress photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(photoUrl)}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !progressSummary.trim()}>
              {loading
                ? "Saving..."
                : editingDay
                ? "Update Progress"
                : "Save Progress"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
