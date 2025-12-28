import { NextRequest, NextResponse } from "next/server";
import { getProgressByLink, submitFieldOfficerSignature } from "@/server/db/progress";

export const dynamic = 'force-dynamic';

// Get progress form data by link
export async function GET(
  request: NextRequest,
  { params }: { params: { linkId: string } }
) {
  try {
    const result = await getProgressByLink(params.linkId);

    if (!result) {
      return NextResponse.json(
        { error: "Invalid or expired link" },
        { status: 404 }
      );
    }

    const { ticket, progress } = result;

    // Get team member info who added the progress
    const { findUserById } = await import("@/server/db/users");
    let teamMemberName = progress.addedByName || "Team Member";
    let teamMemberEmail = "";
    
    if (progress.addedBy) {
      const user = await findUserById(progress.addedBy);
      if (user) {
        teamMemberName = user.name;
        teamMemberEmail = user.email;
      }
    }

    return NextResponse.json({
      success: true,
      ticket: {
        ticketNo: ticket.ticketNo,
        assignmentName: ticket.assignmentName,
        description: ticket.description,
        fieldOfficerName: ticket.fieldOfficerName,
      },
      progress: {
        day: progress.day,
        progressSummary: progress.progressSummary,
        photos: progress.photos || [], // Include photos
        addedByName: teamMemberName,
        addedByEmail: teamMemberEmail,
        addedAt: progress.addedAt,
        fieldOfficerSigned: progress.fieldOfficerSigned,
      },
    });
  } catch (error) {
    console.error("Get progress by link error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Submit field officer signature
export async function POST(
  request: NextRequest,
  { params }: { params: { linkId: string } }
) {
  try {
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

    await submitFieldOfficerSignature(params.linkId, sanitizedSignature, signatureType);

    return NextResponse.json({
      success: true,
      message: "Signature submitted successfully",
    });
  } catch (error: any) {
    console.error("Submit signature error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

