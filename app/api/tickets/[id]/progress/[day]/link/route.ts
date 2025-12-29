import { NextRequest, NextResponse } from "next/server";
import { findTicketById } from "@/server/db/tickets";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { findUserById } from "@/server/db/users";
import { generateShareableLink } from "@/server/db/progress";

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; day: string } }
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

    // Check if ticket exists
    const ticket = await findTicketById(params.id);
    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Check if user/team has permission (team member must be in assigned team)
    if (payload.role === "field_team") {
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
        // Convert team._id to string for comparison (assignedTeamId is stored as string)
        const teamIdString = team._id?.toString();
        if (!ticket.assignedTeamId || ticket.assignedTeamId !== teamIdString) {
          return NextResponse.json(
            { error: "You don't have permission to generate link for this ticket" },
            { status: 403 }
          );
        }
      } else {
        // Individual user login
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
            { error: "You don't have permission to generate link for this ticket" },
            { status: 403 }
          );
        }
      }
    }

    const dayNum = parseInt(params.day, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > ticket.numberOfWorkingDays) {
      return NextResponse.json(
        { error: "Invalid day number" },
        { status: 400 }
      );
    }

    // Get progressId from request body (for specific progress entry)
    const body = await request.json();
    const { progressId } = body;

    // Check if progress exists
    let progress;
    if (progressId) {
      progress = ticket.dailyProgress?.find((p) => p._id === progressId && p.day === dayNum);
    } else {
      // Legacy: find by day (for backward compatibility)
      progress = ticket.dailyProgress?.find((p) => p.day === dayNum);
    }

    if (!progress) {
      return NextResponse.json(
        { error: "Progress not found. Please add progress first." },
        { status: 400 }
      );
    }

    // Use progressId if available, otherwise use day (legacy)
    const targetProgressId = progressId || progress._id || dayNum.toString();

    // Generate shareable link
    const linkId = await generateShareableLink(params.id, targetProgressId);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const shareableUrl = `${baseUrl}/progress/${linkId}`;

    return NextResponse.json({
      success: true,
      linkId,
      shareableUrl,
      expiresAt: progress.linkExpiresAt || new Date(Date.now() + 2 * 60 * 60 * 1000),
    });
  } catch (error) {
    console.error("Generate link error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

