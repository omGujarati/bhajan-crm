import { NextRequest, NextResponse } from "next/server";
import { getTicketHistory, findTicketById } from "@/server/db/tickets";
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

    // Check if ticket exists
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
      if (!ticket.assignedTeamId || !teamIds.includes(ticket.assignedTeamId)) {
        return NextResponse.json(
          { error: "You don't have permission to view this ticket" },
          { status: 403 }
        );
      }
    }

    const history = await getTicketHistory(params.id);

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("Get ticket history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

