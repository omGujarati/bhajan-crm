import { NextRequest, NextResponse } from "next/server";
import { findTicketById } from "@/server/db/tickets";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { findUserById } from "@/server/db/users";
import { addDailyProgress } from "@/server/db/progress";

export const dynamic = 'force-dynamic';

export async function POST(
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

    // Both admin and team members can add progress
    const body = await request.json();
    const { day, progressSummary, progressId, photos } = body;

    if (!day || !progressSummary) {
      return NextResponse.json(
        { error: "Day and progress summary are required" },
        { status: 400 }
      );
    }

    // Validate day number
    const dayNum = parseInt(day, 10);
    if (isNaN(dayNum) || dayNum < 1) {
      return NextResponse.json(
        { error: "Invalid day number" },
        { status: 400 }
      );
    }

    // Check if ticket exists
    const ticket = await findTicketById(params.id);
    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Check if user/team has permission
    if (payload.role === "field_team") {
      if (payload.teamId) {
        // Team login - check if team matches assigned team
        const { findTeamByTeamId } = await import("@/server/db/users");
        const team = await findTeamByTeamId(payload.teamId);
        if (!team) {
          return NextResponse.json(
            { error: "Team not found" },
            { status: 404 }
          );
        }
        // Convert team._id to string for comparison (assignedTeamId is stored as string)
        const teamIdString = team._id?.toString();
        if (!ticket.assignedTeamId || ticket.assignedTeamId !== teamIdString) {
          return NextResponse.json(
            { error: "You don't have permission to add progress to this ticket" },
            { status: 403 }
          );
        }
      } else {
        // Individual user login - check if user's team matches assigned team
        const user = await findUserById(payload.userId);
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
        const teamIds = user.teamIds || (user.teamId ? [user.teamId] : []);
        if (!ticket.assignedTeamId || !teamIds.includes(ticket.assignedTeamId)) {
          return NextResponse.json(
            { error: "You don't have permission to add progress to this ticket" },
            { status: 403 }
          );
        }
      }
    }

    // Validate day doesn't exceed working days
    if (dayNum > ticket.numberOfWorkingDays) {
      return NextResponse.json(
        { error: `Day number cannot exceed ${ticket.numberOfWorkingDays} working days` },
        { status: 400 }
      );
    }

    // Get team details - check if user is logged in as team or individual
    let teamId: string | undefined;
    let teamName: string | undefined;
    let teamEmail: string | undefined;
    let addedBy: string | undefined;
    let addedByName: string | undefined;

    if (payload.role === "field_team") {
      // Check if this is a team login (has teamId in token) or individual user
      if (payload.teamId) {
        // Team login
        const { findTeamByTeamId } = await import("@/server/db/users");
        const team = await findTeamByTeamId(payload.teamId);
        if (!team) {
          return NextResponse.json(
            { error: "Team not found" },
            { status: 404 }
          );
        }
        // Convert team._id to string (assignedTeamId is stored as string)
        teamId = team._id?.toString() || team._id!;
        teamName = team.name;
        teamEmail = team.email;
      } else {
        // Individual user login - get their team
        const user = await findUserById(payload.userId);
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
        // Get the team ID from ticket assignment or user's first team
        teamId = ticket.assignedTeamId || user.teamIds?.[0] || user.teamId;
        if (!teamId) {
          return NextResponse.json(
            { error: "User is not assigned to a team" },
            { status: 403 }
          );
        }
        const { findTeamById } = await import("@/server/db/users");
        const team = await findTeamById(teamId);
        if (team) {
          teamName = team.name;
          teamEmail = team.email;
        }
        addedBy = user._id;
        addedByName = user.name;
      }
    } else if (payload.role === "admin") {
      // Admin can add progress - need team ID from ticket
      if (!ticket.assignedTeamId) {
        return NextResponse.json(
          { error: "Ticket must be assigned to a team to add progress" },
          { status: 400 }
        );
      }
      const { findTeamById } = await import("@/server/db/users");
      const team = await findTeamById(ticket.assignedTeamId);
      if (!team) {
        return NextResponse.json(
          { error: "Assigned team not found" },
          { status: 404 }
        );
      }
      teamId = team._id!;
      teamName = team.name;
      teamEmail = team.email;
      const user = await findUserById(payload.userId);
      if (user) {
        addedBy = user._id;
        addedByName = user.name;
      }
    }

    if (!teamId) {
      return NextResponse.json(
        { error: "Unable to determine team" },
        { status: 400 }
      );
    }

    // Sanitize input
    const { sanitizeInput } = await import("@/lib/validation");
    const sanitizedSummary = sanitizeInput(progressSummary);
    if (sanitizedSummary.length < 10) {
      return NextResponse.json(
        { error: "Progress summary must be at least 10 characters" },
        { status: 400 }
      );
    }

    // Add progress (tracked per team, not per individual member)
    const newProgressId = await addDailyProgress(
      params.id,
      dayNum,
      sanitizedSummary,
      teamId,
      teamName,
      teamEmail,
      addedBy, // Optional: track which user added it
      addedByName, // Optional
      progressId, // If editing existing progress
      photos // Include photos array if provided
    );

    return NextResponse.json({
      success: true,
      message: progressId ? "Progress updated successfully" : "Progress added successfully",
      progressId: newProgressId,
    });
  } catch (error) {
    console.error("Add progress error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

