import { NextRequest, NextResponse } from "next/server";
import { findTicketById } from "@/server/db/tickets";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { findUserById } from "@/server/db/users";
import { submitAdminSignature, isReadyForAdminSignature } from "@/server/db/progress";

export const dynamic = 'force-dynamic';

export async function POST(
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
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can sign tickets" },
        { status: 403 }
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

    // Check if ready for admin signature
    const ready = await isReadyForAdminSignature(params.id);
    if (!ready) {
      return NextResponse.json(
        { error: "All daily progress must be signed by field officer before admin can sign" },
        { status: 400 }
      );
    }

    // Get admin details
    const user = await findUserById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get signature from request body
    const body = await request.json();
    const { signature, signatureType = "text" } = body;

    if (!signature || (!signature.trim() && !signature.startsWith("data:image"))) {
      return NextResponse.json(
        { error: "Signature is required" },
        { status: 400 }
      );
    }

    // Validate signature type
    if (signatureType !== "text" && signatureType !== "image") {
      return NextResponse.json(
        { error: "Invalid signature type" },
        { status: 400 }
      );
    }

    // For text signatures, sanitize input
    let sanitizedSignature = signature;
    if (signatureType === "text") {
      const { sanitizeInput } = await import("@/lib/validation");
      sanitizedSignature = sanitizeInput(signature.trim());

      if (sanitizedSignature.length < 2) {
        return NextResponse.json(
          { error: "Signature must be at least 2 characters" },
          { status: 400 }
        );
      }
    }

    // Submit admin signature
    await submitAdminSignature(params.id, payload.userId, user.name, sanitizedSignature, signatureType);

    return NextResponse.json({
      success: true,
      message: "Ticket signed and completed successfully",
    });
  } catch (error: any) {
    console.error("Admin sign error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

