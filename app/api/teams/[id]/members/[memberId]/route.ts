import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import {
  findTeamById,
  findUserById,
  unassignUserFromTeam,
} from "@/server/db/users";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can unassign team members" },
        { status: 403 }
      );
    }

    // Verify team exists
    const team = await findTeamById(params.id);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Verify user exists
    const user = await findUserById(params.memberId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "field_team") {
      return NextResponse.json(
        { error: "Only field team members can be unassigned from teams" },
        { status: 400 }
      );
    }

    // Unassign user from team (only from this team, not all teams)
    await unassignUserFromTeam(params.memberId, params.id, team.name);

    return NextResponse.json({
      success: true,
      message: "User unassigned from team successfully",
    });
  } catch (error) {
    console.error("Unassign member error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

