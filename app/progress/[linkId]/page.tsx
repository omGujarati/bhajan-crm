"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/ui/signature-pad";
import { showToast } from "@/lib/toast";
import { FileText, Calendar, Building, CheckCircle, XCircle, Clock, User, Mail, ClipboardList } from "lucide-react";

interface ProgressData {
  ticket: {
    ticketNo: string;
    assignmentName: string;
    description: string;
    fieldOfficerName: string;
  };
  progress: {
    day: number;
    progressSummary: string;
    photos?: string[]; // Array of photo URLs
    addedByName?: string;
    addedByEmail?: string;
    addedAt: Date | string;
    fieldOfficerSigned: boolean;
  };
}

export default function ProgressFormPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [signature, setSignature] = useState("");
  const [signatureType, setSignatureType] = useState<"text" | "image">("text");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const linkId = params.linkId as string;

  useEffect(() => {
    if (linkId) {
      loadProgressData();
    }
  }, [linkId]);

  const loadProgressData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/progress/${linkId}`);

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Invalid or expired link");
        return;
      }

      setProgressData(result);
      
      // If already signed, show success
      if (result.progress.fieldOfficerSigned) {
        setSuccess(true);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureChange = (sig: string, type: "text" | "image") => {
    setSignature(sig);
    setSignatureType(type);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signature || (!signature.trim() && !signature.startsWith("data:image"))) {
      setError("Please provide your signature");
      return;
    }

    if (signatureType === "text" && signature.trim().length < 2) {
      setError("Signature must be at least 2 characters");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/progress/${linkId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          signature: signatureType === "text" ? signature.trim() : signature,
          signatureType 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to submit signature");
        return;
      }

      setSuccess(true);
      showToast.success("Success", "Signature submitted successfully");
      
      // Reload progress data to show signed status
      setTimeout(() => {
        loadProgressData();
      }, 1000);
    } catch (error) {
      console.error("Error submitting signature:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <Clock className="h-8 w-8 mx-auto mb-4 text-muted-foreground animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !progressData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-card border rounded-lg p-6 text-center">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">
            This link may have expired or is invalid. Links expire after 2 hours or once submitted.
          </p>
        </div>
      </div>
    );
  }

  if (!progressData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-card border rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-primary/5 border-b p-4 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Daily Progress Review Form</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Please review the progress and sign below
            </p>
          </div>

          {/* Ticket Information */}
          <div className="p-4 sm:p-6 space-y-6 border-b">
            <div>
              <h2 className="text-lg font-semibold mb-4">Ticket Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Number</p>
                    <p className="font-semibold">{progressData.ticket.ticketNo}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Assignment Name</p>
                    <p className="font-semibold">{progressData.ticket.assignmentName}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{progressData.ticket.description}</p>
              </div>
            </div>
          </div>

          {/* Team Member Information */}
          <div className="p-4 sm:p-6 space-y-4 border-b bg-muted/30">
            <h2 className="text-lg font-semibold">Team Member Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {progressData.progress.addedByName && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-semibold">{progressData.progress.addedByName}</p>
                  </div>
                </div>
              )}
              {progressData.progress.addedByEmail && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-semibold break-all">{progressData.progress.addedByEmail}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress Details */}
          <div className="p-4 sm:p-6 space-y-4 border-b">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Day {progressData.progress.day} Progress Details</h2>
            </div>
            {progressData.progress.addedAt && (
              <p className="text-sm text-muted-foreground">
                Submitted on: {formatDate(progressData.progress.addedAt)}
              </p>
            )}
            <div className="bg-muted/50 rounded-lg p-4 sm:p-6">
              <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
                {progressData.progress.progressSummary}
              </p>
            </div>
            
            {/* Photos */}
            {progressData.progress.photos && progressData.progress.photos.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Progress Photos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {progressData.progress.photos.map((photoUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photoUrl}
                        alt={`Progress photo ${index + 1}`}
                        className="w-full h-40 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(photoUrl, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Signature Status */}
          {progressData.progress.fieldOfficerSigned && (
            <div className="p-4 sm:p-6 bg-green-50 border-b">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <p className="font-medium">This progress has been approved and signed</p>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                This link is no longer active as the signature has been submitted.
              </p>
            </div>
          )}

          {/* Signature Form */}
          {!progressData.progress.fieldOfficerSigned && !success && (
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-4">Your Signature</h2>
                <SignaturePad
                  value={signature}
                  onChange={handleSignatureChange}
                  label="Field Officer Signature"
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  By signing, you confirm that you have reviewed and approved this daily progress.
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={submitting || !signature}
                  className="flex-1"
                  size="lg"
                >
                  {submitting ? "Submitting..." : "Sign & Approve"}
                </Button>
              </div>
            </form>
          )}

          {success && (
            <div className="p-4 sm:p-6 bg-green-50">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <CheckCircle className="h-5 w-5" />
                <p className="font-medium">Signature submitted successfully!</p>
              </div>
              <p className="text-sm text-muted-foreground">
                This link is now inactive. You can close this page.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 sm:p-6 bg-muted/30 border-t">
            <p className="text-xs text-muted-foreground text-center">
              This link expires in 2 hours from generation or once submitted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
