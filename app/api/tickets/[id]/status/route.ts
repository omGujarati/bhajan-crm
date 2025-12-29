import { NextRequest, NextResponse } from "next/server";
import { updateTicketStatus, findTicketById } from "@/server/db/tickets";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { findUserById } from "@/server/db/users";

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

    // Only admins can change ticket status
    if (payload.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can change ticket status" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !["pending", "in_progress", "done"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be pending, in_progress, or done" },
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
      console.error(`Error finding user for status update: ${error}`);
    }

    // Update status
    await updateTicketStatus(
      params.id,
      status,
      payload.userId,
      adminName
    );

    return NextResponse.json({
      success: true,
      message: "Ticket status updated successfully",
    });
  } catch (error) {
    console.error("Update ticket status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

