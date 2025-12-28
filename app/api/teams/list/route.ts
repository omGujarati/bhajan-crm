import { NextRequest, NextResponse } from "next/server";
import { findAllTeams } from "@/server/db/users";
import { verifyToken } from "@/lib/auth";
import { getTokenFromRequest } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can view teams" },
        { status: 403 }
      );
    }

    const teams = await findAllTeams();

    return NextResponse.json({
      success: true,
      teams,
    });
  } catch (error) {
    console.error("List teams error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

