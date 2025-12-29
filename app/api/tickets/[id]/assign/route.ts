import { NextRequest, NextResponse } from "next/server";
import { assignTicketToTeam, findTicketById } from "@/server/db/tickets";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { findUserById, findTeamById } from "@/server/db/users";

export const dynamic = 'force-dynamic';

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
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Only admins can assign tickets
    if (payload.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can assign tickets" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
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

    // Check if team exists
    const team = await findTeamById(teamId);
    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Get user details for admin name
    let adminName: string = "Admin";
    try {
      const user = await findUserById(payload.userId);
      if (user) {
        adminName = user.name;
      } else {
        // If user not found, use email from token as fallback
        adminName = payload.email || "Admin";
        console.warn(`User not found for userId: ${payload.userId}, using email as fallback`);
      }
    } catch (error) {
      // If there's an error finding user, use email from token as fallback
      adminName = payload.email || "Admin";
      console.error(`Error finding user for ticket assignment: ${error}`);
    }

    // Assign ticket to team
    await assignTicketToTeam(
      params.id,
      teamId,
      team.name,
      payload.userId,
      adminName
    );

    return NextResponse.json({
      success: true,
      message: "Ticket assigned to team successfully",
    });
  } catch (error) {
    console.error("Assign ticket error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

