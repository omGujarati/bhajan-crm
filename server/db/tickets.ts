import { Db, ObjectId } from "mongodb";
import { connectToDatabase } from "./connection";
import { Ticket, TicketStatus, TicketHistory } from "../models/ticket";

const TICKETS_COLLECTION = "tickets";

// Generate unique ticket number
async function generateTicketNo(): Promise<string> {
  const db = await connectToDatabase();

  // Find the highest ticket number
  const tickets = await db
    .collection(TICKETS_COLLECTION)
    .find({})
    .sort({ ticketNo: -1 })
    .limit(1)
    .toArray();

  if (tickets.length === 0) {
    return "TKT001";
  }

  const lastTicketNo = tickets[0].ticketNo || "";
  const match = lastTicketNo.match(/TKT(\d+)/);

  if (match) {
    const number = parseInt(match[1], 10);
    const nextNumber = number + 1;
    return `TKT${nextNumber.toString().padStart(3, "0")}`;
  }

  return "TKT001";
}

// Calculate completion date based on commencement date and working days
function calculateCompletionDate(
  dateOfCommencement: Date,
  numberOfWorkingDays: number
): Date {
  const completionDate = new Date(dateOfCommencement);
  let daysAdded = 0;
  let currentDate = new Date(dateOfCommencement);

  // Add working days (excluding weekends)
  while (daysAdded < numberOfWorkingDays) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return currentDate;
}

// Create a new ticket
export async function createTicket(
  ticketData: Omit<
    Ticket,
    "_id" | "ticketNo" | "createdAt" | "updatedAt" | "history"
  >
): Promise<string> {
  const db = await connectToDatabase();

  // Generate unique ticket number
  const ticketNo = await generateTicketNo();

  // Calculate completion date if not provided
  let completionDate = ticketData.completionDate;
  if (
    !completionDate &&
    ticketData.dateOfCommencement &&
    ticketData.numberOfWorkingDays
  ) {
    completionDate = calculateCompletionDate(
      ticketData.dateOfCommencement,
      ticketData.numberOfWorkingDays
    );
  }

  // Create initial history entry
  const history: TicketHistory[] = [
    {
      action: "created",
      changedBy: ticketData.createdBy,
      changedByName: ticketData.createdByName,
      timestamp: new Date(),
      description: `Ticket created by ${ticketData.createdByName || "User"}`,
    },
  ];

  const ticket: Omit<Ticket, "_id"> = {
    ...ticketData,
    ticketNo,
    completionDate,
    history,
    dailyProgress: [],
    adminSigned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection(TICKETS_COLLECTION).insertOne(ticket);
  return result.insertedId.toString();
}

// Find ticket by ID
export async function findTicketById(id: string): Promise<Ticket | null> {
  const db = await connectToDatabase();
  const ticket = await db
    .collection<Ticket>(TICKETS_COLLECTION)
    .findOne({ _id: new ObjectId(id) } as any);
  return ticket;
}

// Find ticket by ticket number
export async function findTicketByTicketNo(
  ticketNo: string
): Promise<Ticket | null> {
  const db = await connectToDatabase();
  const ticket = await db
    .collection<Ticket>(TICKETS_COLLECTION)
    .findOne({ ticketNo });
  return ticket;
}

// Find all tickets (with optional filters)
export async function findAllTickets(filters?: {
  status?: TicketStatus;
  assignedTeamId?: string | { $in: string[] };
  createdBy?: string;
  $or?: any[];
}): Promise<Ticket[]> {
  const db = await connectToDatabase();

  const query: any = {};
  if (filters?.status) {
    query.status = filters.status;
  }
  if (filters?.assignedTeamId) {
    query.assignedTeamId = filters.assignedTeamId;
  }
  if (filters?.createdBy) {
    query.createdBy = filters.createdBy;
  }
  if (filters?.$or) {
    query.$or = filters.$or;
  }

  const tickets = await db
    .collection<Ticket>(TICKETS_COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  return tickets;
}

// Update ticket status
export async function updateTicketStatus(
  ticketId: string,
  newStatus: TicketStatus,
  changedBy: string,
  changedByName?: string
): Promise<void> {
  const db = await connectToDatabase();

  const ticket = await findTicketById(ticketId);
  if (!ticket) {
    throw new Error("Ticket not found");
  }

  const oldStatus = ticket.status;

  // Add history entry
  const historyEntry: TicketHistory = {
    action: "status_changed",
    changedBy,
    changedByName,
    oldValue: oldStatus,
    newValue: newStatus,
    timestamp: new Date(),
    description: `Status changed from ${oldStatus} to ${newStatus} by ${
      changedByName || "User"
    }`,
  };

  await db.collection(TICKETS_COLLECTION).updateOne(
    { _id: new ObjectId(ticketId) as any },
    {
      $set: {
        status: newStatus,
        updatedAt: new Date(),
      },
      $push: {
        history: historyEntry,
      } as any,
    }
  );
}

// Assign ticket to team
export async function assignTicketToTeam(
  ticketId: string,
  teamId: string,
  teamName: string,
  assignedBy: string,
  assignedByName?: string
): Promise<void> {
  const db = await connectToDatabase();

  const ticket = await findTicketById(ticketId);
  if (!ticket) {
    throw new Error("Ticket not found");
  }

  const oldTeamId = ticket.assignedTeamId;
  const oldTeamName = ticket.assignedTeamName;

  // Add history entry
  const historyEntry: TicketHistory = {
    action: "assigned",
    changedBy: assignedBy,
    changedByName: assignedByName,
    oldValue: oldTeamName || oldTeamId || "Unassigned",
    newValue: teamName,
    timestamp: new Date(),
    description: `Ticket assigned to ${teamName} by ${
      assignedByName || "User"
    }`,
  };

  // Update ticket with assignment and set status to in_progress if it's pending
  const updateData: any = {
    assignedTeamId: teamId,
    assignedTeamName: teamName,
    updatedAt: new Date(),
  };

  // Auto-set status to in_progress when assigned
  if (ticket.status === "pending") {
    updateData.status = "in_progress";
    historyEntry.description = `Ticket assigned to ${teamName} and status changed to in_progress by ${
      assignedByName || "User"
    }`;
  }

  await db.collection(TICKETS_COLLECTION).updateOne(
    { _id: new ObjectId(ticketId) as any },
    {
      $set: updateData,
      $push: {
        history: historyEntry,
      } as any,
    }
  );
}

// Update ticket (general update)
export async function updateTicket(
  ticketId: string,
  updates: {
    nameOfWork?: string;
    department?: string;
    fieldOfficerName?: string;
    contactNo?: string;
    assignmentName?: string;
    description?: string;
    dateOfCommencement?: Date;
    numberOfWorkingDays?: number;
    completionDate?: Date;
  },
  updatedBy: string,
  updatedByName?: string
): Promise<void> {
  const db = await connectToDatabase();

  const ticket = await findTicketById(ticketId);
  if (!ticket) {
    throw new Error("Ticket not found");
  }

  // Recalculate completion date if working days or commencement date changed
  let completionDate = updates.completionDate;
  if (
    (updates.numberOfWorkingDays !== undefined ||
      updates.dateOfCommencement !== undefined) &&
    !completionDate
  ) {
    const dateOfCommencement =
      updates.dateOfCommencement || ticket.dateOfCommencement;
    const numberOfWorkingDays =
      updates.numberOfWorkingDays ?? ticket.numberOfWorkingDays;
    completionDate = calculateCompletionDate(
      dateOfCommencement,
      numberOfWorkingDays
    );
  }

  // Add history entry
  const historyEntry: TicketHistory = {
    action: "updated",
    changedBy: updatedBy,
    changedByName: updatedByName,
    timestamp: new Date(),
    description: `Ticket updated by ${updatedByName || "User"}`,
  };

  const updateData: any = {
    ...updates,
    updatedAt: new Date(),
  };

  if (completionDate) {
    updateData.completionDate = completionDate;
  }

  await db.collection(TICKETS_COLLECTION).updateOne(
    { _id: new ObjectId(ticketId) as any },
    {
      $set: updateData,
      $push: {
        history: historyEntry,
      } as any,
    }
  );
}

// Get ticket history
export async function getTicketHistory(
  ticketId: string
): Promise<TicketHistory[]> {
  const ticket = await findTicketById(ticketId);
  if (!ticket) {
    throw new Error("Ticket not found");
  }
  return ticket.history || [];
}
