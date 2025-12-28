import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import {
  findTeamById,
  findUserById,
  assignUserToTeam,
} from "@/server/db/users";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can assign team members" },
        { status: 403 }
      );
    }

    // Verify team exists
    const team = await findTeamById(params.id);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "field_team") {
      return NextResponse.json(
        { error: "Only field team members can be assigned to teams" },
        { status: 400 }
      );
    }

    // Assign user to team
    await assignUserToTeam(userId, params.id, team.name);

    return NextResponse.json({
      success: true,
      message: "User assigned to team successfully",
    });
  } catch (error) {
    console.error("Assign member error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

