import { NextRequest, NextResponse } from "next/server";
import { findUsersByRole, findUsersByTeam } from "@/server/db/users";
import { verifyToken } from "@/lib/auth";
import { getTokenFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const teamId = searchParams.get("teamId");

    let users;
    if (teamId) {
      users = await findUsersByTeam(teamId);
    } else if (role) {
      users = await findUsersByRole(role as "admin" | "field_team");
    } else {
      return NextResponse.json(
        { error: "role or teamId parameter is required" },
        { status: 400 }
      );
    }

    // Remove passwords from response
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);

    return NextResponse.json({
      success: true,
      users: usersWithoutPasswords,
    });
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
