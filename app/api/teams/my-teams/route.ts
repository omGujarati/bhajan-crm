import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import {
  findUserById,
  findTeamById,
} from "@/server/db/users";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get current user
    const user = await findUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only field team members can access this
    if (user.role !== "field_team") {
      return NextResponse.json(
        { error: "Only team members can access their teams" },
        { status: 403 }
      );
    }

    // Get team IDs from user (support both new array format and legacy)
    const teamIds = user.teamIds || (user.teamId ? [user.teamId] : []);

    if (teamIds.length === 0) {
      return NextResponse.json({
        success: true,
        teams: [],
      });
    }

    // Fetch team details for each team ID
    const teams = await Promise.all(
      teamIds.map(async (teamId) => {
        const team = await findTeamById(teamId);
        return team;
      })
    );

    // Filter out null teams (in case a team was deleted)
    const validTeams = teams.filter((team) => team !== null);

    return NextResponse.json({
      success: true,
      teams: validTeams,
    });
  } catch (error) {
    console.error("Get my teams error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

