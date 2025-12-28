export type TicketStatus = "pending" | "in_progress" | "done";

export interface TicketHistory {
  action: string; // "created", "status_changed", "assigned", "updated"
  changedBy: string; // User ID
  changedByName?: string; // User name for display
  oldValue?: string;
  newValue?: string;
  timestamp: Date;
  description?: string;
}

export interface DailyProgress {
  _id?: string; // Unique ID for this progress entry
  day: number; // Day number (1, 2, 3, etc.)
  progressSummary: string;
  photos?: string[]; // Array of photo URLs/paths
  addedBy: string; // User ID who added the progress
  addedByName?: string; // User name for display
  addedByEmail?: string; // User email for display
  addedAt: Date;
  shareableLink?: string; // Short link for field officer
  linkExpiresAt?: Date; // Link expiry time (2 hours)
  fieldOfficerSigned: boolean;
  fieldOfficerSignature?: string; // Field officer signature (text or image data)
  fieldOfficerSignatureType?: "text" | "image"; // Type of signature
  fieldOfficerSignedAt?: Date;
}

export interface Ticket {
  _id?: string;
  ticketNo: string; // Unique ticket number like TKT001
  status: TicketStatus;
  nameOfWork: string;
  department: string;
  fieldOfficerName: string;
  contactNo: string;
  assignmentName: string;
  description: string;
  dateOfCommencement: Date;
  numberOfWorkingDays: number;
  completionDate?: Date; // Can be auto-generated or manually set
  assignedTeamId?: string; // Team ID
  assignedTeamName?: string; // Team name for display
  createdBy: string; // User ID who created the ticket
  createdByName?: string; // User name for display
  history: TicketHistory[]; // Complete history of changes
  dailyProgress: DailyProgress[]; // Daily progress tracking
  adminSigned: boolean; // Admin final signature
  adminSignature?: string; // Admin signature (text or image data)
  adminSignatureType?: "text" | "image"; // Type of signature
  adminSignedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

