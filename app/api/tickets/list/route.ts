import { NextRequest, NextResponse } from "next/server";
import { findAllTickets } from "@/server/db/tickets";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { findUserById } from "@/server/db/users";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    // Build filters based on user/team role
    const filters: any = {};
    
    if (payload.role === "field_team") {
      if (payload.teamId) {
        // Team login - get team ID
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
        // Team can see tickets assigned to them OR tickets they created
        filters.$or = [
          { createdBy: payload.userId }, // Tickets created by team
          { assignedTeamId: teamIdString }, // Tickets assigned to this team
        ];
      } else {
        // Individual user login
        const user = await findUserById(payload.userId);
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
        // Team members can see:
        // 1. Tickets they created (createdBy)
        // 2. Tickets assigned to their teams (assignedTeamId)
        const teamIds = user.teamIds || (user.teamId ? [user.teamId] : []);
        
        // Build OR condition for MongoDB query
        const orConditions: any[] = [
          { createdBy: payload.userId }, // Tickets created by this user
        ];
        
        if (teamIds.length > 0) {
          orConditions.push({ assignedTeamId: { $in: teamIds } });
        }
        
        if (orConditions.length > 0) {
          filters.$or = orConditions;
        } else {
          // If user has no teams and hasn't created any tickets, return empty
          return NextResponse.json({
            success: true,
            tickets: [],
          });
        }
      }
    }
    // Admins can see all tickets (no filter)

    // Get status filter from query params if provided
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    if (status && ["pending", "in_progress", "done"].includes(status)) {
      filters.status = status;
    }

    const tickets = await findAllTickets(filters);

    return NextResponse.json({
      success: true,
      tickets,
    });
  } catch (error) {
    console.error("List tickets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

