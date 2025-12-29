import { Db, ObjectId } from "mongodb";
import { connectToDatabase } from "./connection";
import { Ticket, DailyProgress } from "../models/ticket";
import crypto from "crypto";

const TICKETS_COLLECTION = "tickets";
const PROGRESS_LINKS_COLLECTION = "progress_links";

// Generate short unique link ID
function generateShortLinkId(): string {
  // Generate 8 character alphanumeric ID
  return crypto.randomBytes(4).toString("base64url").substring(0, 8).toUpperCase();
}

// Add daily progress to ticket (tracked per team, not per individual member)
export async function addDailyProgress(
  ticketId: string,
  day: number,
  progressSummary: string,
  addedByTeam: string, // Team ID
  addedByTeamName?: string,
  addedByTeamEmail?: string,
  addedBy?: string, // Optional: User ID who added (for tracking)
  addedByName?: string, // Optional: User name
  progressId?: string, // If provided, update existing progress
  photos?: string[] // Photos array
): Promise<string> {
  const db = await connectToDatabase();
  
  const ticket = await db
    .collection<Ticket>(TICKETS_COLLECTION)
    .findOne({ _id: new ObjectId(ticketId) as any });
  
  if (!ticket) {
    throw new Error("Ticket not found");
  }

  // Check if progress for this day already exists for this team
  // Only one progress entry per day per team
  if (!progressId) {
    const existingProgress = ticket.dailyProgress?.find(
      (p) => p.day === day && p.addedByTeam === addedByTeam
    );
    if (existingProgress) {
      // Update existing progress instead of creating new one
      progressId = existingProgress._id;
    }
  }

  // Generate unique ID for this progress entry
  const newProgressId = progressId || new ObjectId().toString();
  
  // If updating, preserve existing photos unless new ones are provided
  let finalPhotos: string[] = [];
  if (progressId) {
    const existingProgress = ticket.dailyProgress?.find((p) => p._id === progressId);
    finalPhotos = photos !== undefined ? photos : (existingProgress?.photos || []);
  } else {
    finalPhotos = photos || [];
  }
  
  const progress: DailyProgress = {
    _id: newProgressId,
    day,
    progressSummary,
    photos: finalPhotos,
    addedByTeam,
    addedByTeamName,
    addedByTeamEmail,
    addedBy, // Optional: track which team member added it
    addedByName, // Optional
    addedAt: new Date(),
    fieldOfficerSigned: false,
  };

  if (progressId && ticket.dailyProgress?.find((p) => p._id === progressId)) {
    // Update existing progress
    await db
      .collection(TICKETS_COLLECTION)
      .updateOne(
        { _id: new ObjectId(ticketId) as any },
        {
          $set: {
            "dailyProgress.$[elem].progressSummary": progressSummary,
            "dailyProgress.$[elem].photos": finalPhotos,
            "dailyProgress.$[elem].addedByTeam": addedByTeam,
            "dailyProgress.$[elem].addedByTeamName": addedByTeamName,
            "dailyProgress.$[elem].addedByTeamEmail": addedByTeamEmail,
            "dailyProgress.$[elem].addedBy": addedBy,
            "dailyProgress.$[elem].addedByName": addedByName,
            "dailyProgress.$[elem].addedAt": new Date(),
            updatedAt: new Date(),
          },
        },
        {
          arrayFilters: [{ "elem._id": progressId }],
        }
      );
  } else {
    // Add new progress (one per day per team)
    await db
      .collection(TICKETS_COLLECTION)
      .updateOne(
        { _id: new ObjectId(ticketId) as any },
        {
          $push: {
            dailyProgress: progress,
          } as any,
          $set: {
            updatedAt: new Date(),
          },
        }
      );
  }

  return newProgressId;
}

// Generate shareable link for specific progress entry
export async function generateShareableLink(
  ticketId: string,
  progressId: string
): Promise<string> {
  const db = await connectToDatabase();
  
  // Check if link already exists and is valid
  const existingLink = await db
    .collection(PROGRESS_LINKS_COLLECTION)
    .findOne({
      ticketId,
      progressId,
      expiresAt: { $gt: new Date() },
    });

  if (existingLink) {
    return existingLink.linkId;
  }

  // Generate new link
  const linkId = generateShortLinkId();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

  await db.collection(PROGRESS_LINKS_COLLECTION).insertOne({
    linkId,
    ticketId,
    progressId,
    expiresAt,
    createdAt: new Date(),
  });

  // Update ticket with link
  await db
    .collection(TICKETS_COLLECTION)
    .updateOne(
      { _id: new ObjectId(ticketId) as any },
      {
        $set: {
          "dailyProgress.$[elem].shareableLink": linkId,
          "dailyProgress.$[elem].linkExpiresAt": expiresAt,
          updatedAt: new Date(),
        },
      },
      {
        arrayFilters: [{ "elem._id": progressId }],
      }
    );

  return linkId;
}

// Get progress by link ID
export async function getProgressByLink(linkId: string): Promise<{
  ticket: Ticket;
  progress: DailyProgress;
} | null> {
  const db = await connectToDatabase();
  
  const link = await db
    .collection(PROGRESS_LINKS_COLLECTION)
    .findOne({ linkId });

  if (!link) {
    return null;
  }

  // Check if link is expired or invalidated (expiresAt set to epoch)
  if (new Date(link.expiresAt) < new Date() || new Date(link.expiresAt).getTime() === 0) {
    return null;
  }

  const ticket = await db
    .collection<Ticket>(TICKETS_COLLECTION)
    .findOne({ _id: new ObjectId(link.ticketId) } as any);

  if (!ticket) {
    return null;
  }

  // Find progress by progressId (new) or day (legacy)
  const progress = ticket.dailyProgress?.find(
    (p) => (link.progressId && p._id === link.progressId) || (!link.progressId && p.day === link.day)
  );

  if (!progress) {
    return null;
  }

  return { ticket, progress };
}

// Submit field officer signature
export async function submitFieldOfficerSignature(
  linkId: string,
  signature: string,
  signatureType: "text" | "image" = "text"
): Promise<void> {
  const db = await connectToDatabase();
  
  const link = await db
    .collection(PROGRESS_LINKS_COLLECTION)
    .findOne({ linkId });

  if (!link) {
    throw new Error("Invalid link");
  }

  // Check if link is expired
  if (new Date(link.expiresAt) < new Date()) {
    throw new Error("Link has expired");
  }

  // Check if already signed
  const ticket = await db
    .collection<Ticket>(TICKETS_COLLECTION)
    .findOne({ _id: new ObjectId(link.ticketId) as any });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  // Find progress by progressId (new) or day (legacy)
  const progress = ticket.dailyProgress?.find(
    (p) => (link.progressId && p._id === link.progressId) || (!link.progressId && p.day === link.day)
  );
  
  if (!progress) {
    throw new Error("Progress not found");
  }

  if (progress.fieldOfficerSigned) {
    throw new Error("This progress has already been signed");
  }

  // Update ticket with signature
  const arrayFilter = link.progressId 
    ? { "elem._id": link.progressId }
    : { "elem.day": link.day };

  await db
    .collection(TICKETS_COLLECTION)
    .updateOne(
      { _id: new ObjectId(link.ticketId) as any },
      {
        $set: {
          "dailyProgress.$[elem].fieldOfficerSigned": true,
          "dailyProgress.$[elem].fieldOfficerSignature": signature,
          "dailyProgress.$[elem].fieldOfficerSignatureType": signatureType,
          "dailyProgress.$[elem].fieldOfficerSignedAt": new Date(),
          updatedAt: new Date(),
        },
      },
      {
        arrayFilters: [arrayFilter],
      }
    );

  // Invalidate the link by setting expiry to past (makes it unusable)
  await db
    .collection(PROGRESS_LINKS_COLLECTION)
    .updateOne(
      { linkId },
      {
        $set: {
          expiresAt: new Date(0), // Set to epoch to invalidate
        },
      }
    );
}

// Submit admin final signature
export async function submitAdminSignature(
  ticketId: string,
  adminId: string,
  adminName: string,
  signature: string,
  signatureType: "text" | "image" = "text"
): Promise<void> {
  const db = await connectToDatabase();
  
  const ticket = await db
    .collection<Ticket>(TICKETS_COLLECTION)
    .findOne({ _id: new ObjectId(ticketId) as any });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  // Check if all progress entries are signed by field officer
  if (!ticket.dailyProgress || ticket.dailyProgress.length === 0) {
    throw new Error("No progress entries found");
  }

  const allProgressSigned = ticket.dailyProgress.every(
    (p) => p.fieldOfficerSigned
  );

  if (!allProgressSigned) {
    throw new Error("All daily progress must be signed by field officer before admin can sign");
  }

  // Update ticket with admin signature and unassign from team
  await db
    .collection(TICKETS_COLLECTION)
    .updateOne(
      { _id: new ObjectId(ticketId) as any },
      {
        $set: {
          adminSigned: true,
          adminSignature: signature,
          adminSignatureType: signatureType,
          adminSignedAt: new Date(),
          status: "done",
          assignedTeamId: null,
          assignedTeamName: null,
          updatedAt: new Date(),
        },
      }
    );

  // Add history entry
  const historyEntry = {
    action: "admin_signed",
    changedBy: adminId,
    changedByName: adminName,
    timestamp: new Date(),
    description: `Ticket completed and signed by admin ${adminName}`,
  };

  await db
    .collection(TICKETS_COLLECTION)
    .updateOne(
      { _id: new ObjectId(ticketId) as any },
      {
        $push: {
          history: historyEntry,
        } as any,
      }
    );
}

// Check if all progress is complete and ready for admin signature
export async function isReadyForAdminSignature(ticketId: string): Promise<boolean> {
  const db = await connectToDatabase();
  
  const ticket = await db
    .collection<Ticket>(TICKETS_COLLECTION)
    .findOne({ _id: new ObjectId(ticketId) as any });

  if (!ticket) {
    return false;
  }

  if (!ticket.dailyProgress || ticket.dailyProgress.length === 0) {
    return false;
  }

  // Group progress by day and check if all entries for each day are signed
  const progressByDay = new Map<number, DailyProgress[]>();
  ticket.dailyProgress.forEach((p) => {
    if (!progressByDay.has(p.day)) {
      progressByDay.set(p.day, []);
    }
    progressByDay.get(p.day)!.push(p);
  });

  // Check if we have progress for all working days
  if (progressByDay.size !== ticket.numberOfWorkingDays) {
    return false;
  }

  // Check if all progress entries are signed by field officer
  return ticket.dailyProgress.every((p) => p.fieldOfficerSigned);
}

