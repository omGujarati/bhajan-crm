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

    // Check if user has permission (team member must be in assigned team)
    if (payload.role === "field_team") {
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

    // Validate day doesn't exceed working days
    if (dayNum > ticket.numberOfWorkingDays) {
      return NextResponse.json(
        { error: `Day number cannot exceed ${ticket.numberOfWorkingDays} working days` },
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

    // Sanitize input
    const { sanitizeInput } = await import("@/lib/validation");
    const sanitizedSummary = sanitizeInput(progressSummary);
    if (sanitizedSummary.length < 10) {
      return NextResponse.json(
        { error: "Progress summary must be at least 10 characters" },
        { status: 400 }
      );
    }

    // Add progress (each user can add their own progress for each day)
    const newProgressId = await addDailyProgress(
      params.id,
      dayNum,
      sanitizedSummary,
      payload.userId,
      user.name,
      user.email,
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

