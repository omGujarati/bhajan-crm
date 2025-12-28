import { NextRequest, NextResponse } from "next/server";
import { findTicketById, updateTicket } from "@/server/db/tickets";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { findUserById } from "@/server/db/users";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Get user to check permissions
    const user = await findUserById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const ticket = await findTicketById(params.id);
    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to view this ticket
    if (payload.role === "field_team") {
      const teamIds = user.teamIds || (user.teamId ? [user.teamId] : []);
      // Team members can see tickets they created OR tickets assigned to their team
      if (ticket.createdBy !== payload.userId && (!ticket.assignedTeamId || !teamIds.includes(ticket.assignedTeamId))) {
        return NextResponse.json(
          { error: "You don't have permission to view this ticket" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error("Get ticket error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update ticket (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can edit tickets" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      nameOfWork,
      department,
      fieldOfficerName,
      contactNo,
      assignmentName,
      description,
      dateOfCommencement,
      numberOfWorkingDays,
      completionDate,
    } = body;

    // Check if ticket exists
    const ticket = await findTicketById(params.id);
    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Get user details
    const user = await findUserById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Sanitize inputs
    const { sanitizeInput } = await import("@/lib/validation");

    const updates: any = {};
    if (nameOfWork !== undefined) {
      updates.nameOfWork = sanitizeInput(nameOfWork);
    }
    if (department !== undefined) {
      updates.department = sanitizeInput(department);
    }
    if (fieldOfficerName !== undefined) {
      updates.fieldOfficerName = sanitizeInput(fieldOfficerName);
    }
    if (contactNo !== undefined) {
      updates.contactNo = sanitizeInput(contactNo);
    }
    if (assignmentName !== undefined) {
      updates.assignmentName = sanitizeInput(assignmentName);
    }
    if (description !== undefined) {
      updates.description = sanitizeInput(description);
    }
    if (dateOfCommencement !== undefined) {
      const commencementDate = new Date(dateOfCommencement);
      if (isNaN(commencementDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date of commencement" },
          { status: 400 }
        );
      }
      updates.dateOfCommencement = commencementDate;
    }
    if (numberOfWorkingDays !== undefined) {
      const workingDays = parseInt(numberOfWorkingDays, 10);
      if (isNaN(workingDays) || workingDays < 1 || workingDays > 1000) {
        return NextResponse.json(
          { error: "Number of working days must be between 1 and 1000" },
          { status: 400 }
        );
      }
      updates.numberOfWorkingDays = workingDays;
    }
    if (completionDate !== undefined) {
      if (completionDate === null || completionDate === "") {
        updates.completionDate = undefined;
      } else {
        const parsedCompletionDate = new Date(completionDate);
        if (isNaN(parsedCompletionDate.getTime())) {
          return NextResponse.json(
            { error: "Invalid completion date" },
            { status: 400 }
          );
        }
        updates.completionDate = parsedCompletionDate;
      }
    }

    // Update ticket
    await updateTicket(
      params.id,
      updates,
      payload.userId,
      user.name
    );

    return NextResponse.json({
      success: true,
      message: "Ticket updated successfully",
    });
  } catch (error) {
    console.error("Update ticket error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
