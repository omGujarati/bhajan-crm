import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { findAllTeamMembers } from "@/server/db/users";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can view all team members" },
        { status: 403 }
      );
    }

    const users = await findAllTeamMembers();
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);

    return NextResponse.json({
      success: true,
      users: usersWithoutPasswords,
    });
  } catch (error) {
    console.error("List all team members error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

