import { NextRequest, NextResponse } from "next/server";
import { createTicket } from "@/server/db/tickets";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { findUserById } from "@/server/db/users";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    // Both admin and team members can create tickets
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

    // Validation
    if (!nameOfWork || !department || !fieldOfficerName || !contactNo || 
        !assignmentName || !description || !dateOfCommencement || !numberOfWorkingDays) {
      return NextResponse.json(
        { error: "All required fields must be provided" },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const { sanitizeInput, containsSQLInjection, containsXSS } = await import(
      "@/lib/validation"
    );

    const sanitizedNameOfWork = sanitizeInput(nameOfWork);
    if (sanitizedNameOfWork.length < 2 || sanitizedNameOfWork.length > 200) {
      return NextResponse.json(
        { error: "Name of work must be between 2 and 200 characters" },
        { status: 400 }
      );
    }

    if (containsSQLInjection(sanitizedNameOfWork) || containsXSS(sanitizedNameOfWork)) {
      return NextResponse.json(
        { error: "Invalid characters in name of work" },
        { status: 400 }
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

    // Parse dates
    const commencementDate = new Date(dateOfCommencement);
    if (isNaN(commencementDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date of commencement" },
        { status: 400 }
      );
    }

    let parsedCompletionDate: Date | undefined;
    if (completionDate) {
      parsedCompletionDate = new Date(completionDate);
      if (isNaN(parsedCompletionDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid completion date" },
          { status: 400 }
        );
      }
    }

    // Validate number of working days
    const workingDays = parseInt(numberOfWorkingDays, 10);
    if (isNaN(workingDays) || workingDays < 1 || workingDays > 1000) {
      return NextResponse.json(
        { error: "Number of working days must be between 1 and 1000" },
        { status: 400 }
      );
    }

    // Sanitize other fields
    const sanitizedDepartment = sanitizeInput(department);
    const sanitizedFieldOfficerName = sanitizeInput(fieldOfficerName);
    const sanitizedContactNo = sanitizeInput(contactNo);
    const sanitizedAssignmentName = sanitizeInput(assignmentName);
    const sanitizedDescription = sanitizeInput(description);

    // Handle team assignment for both admin and team members
    let assignedTeamId: string | undefined;
    let assignedTeamName: string | undefined;
    const { assignedTeamId: requestedTeamId } = body;
    
    if (requestedTeamId) {
      if (payload.role === "field_team") {
        // Team members can only assign to teams they belong to
        const teamIds = user.teamIds || (user.teamId ? [user.teamId] : []);
        const teamNames = user.teamNames || (user.teamName ? [user.teamName] : []);
        
        if (teamIds.includes(requestedTeamId)) {
          assignedTeamId = requestedTeamId;
          const teamIndex = teamIds.indexOf(requestedTeamId);
          assignedTeamName = teamNames[teamIndex] || teamNames[0];
        } else {
          return NextResponse.json(
            { error: "You can only assign tickets to teams you belong to" },
            { status: 400 }
          );
        }
      } else if (payload.role === "admin") {
        // Admin can assign to any team
        const { findTeamById } = await import("@/server/db/users");
        const team = await findTeamById(requestedTeamId);
        if (team) {
          assignedTeamId = requestedTeamId;
          assignedTeamName = team.name;
        } else {
          return NextResponse.json(
            { error: "Team not found" },
            { status: 404 }
          );
        }
      }
    }

    // Create ticket
    const ticketId = await createTicket({
      status: assignedTeamId ? "in_progress" : "pending", // Auto-set to in_progress if assigned
      nameOfWork: sanitizedNameOfWork,
      department: sanitizedDepartment,
      fieldOfficerName: sanitizedFieldOfficerName,
      contactNo: sanitizedContactNo,
      assignmentName: sanitizedAssignmentName,
      description: sanitizedDescription,
      dateOfCommencement: commencementDate,
      numberOfWorkingDays: workingDays,
      completionDate: parsedCompletionDate,
      assignedTeamId,
      assignedTeamName,
      createdBy: payload.userId,
      createdByName: user.name,
      dailyProgress: [], // Initialize empty array for daily progress
      adminSigned: false, // Initialize as not signed
    });

    return NextResponse.json({
      success: true,
      message: "Ticket created successfully",
      ticketId,
    });
  } catch (error) {
    console.error("Create ticket error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

