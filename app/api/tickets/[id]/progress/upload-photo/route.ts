import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { findTicketById } from "@/server/db/tickets";
import { findUserById } from "@/server/db/users";
import { ObjectId } from "mongodb";

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

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
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
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

    // Check permissions (team member must be in assigned team)
    if (payload.role === "field_team") {
      const user = await findUserById(payload.userId);
      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      const teamIds = user.teamIds || (user.teamId ? [user.teamId] : []);
      if (!ticket.assignedTeamId || !teamIds.includes(ticket.assignedTeamId)) {
        return NextResponse.json(
          { error: "You don't have permission to upload photos for this ticket" },
          { status: 403 }
        );
      }
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const progressId = formData.get("progressId") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // progressId is optional - if not provided, we'll just save the file
    // and it will be linked when progress is created

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, and JPEG are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "progress-photos");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${params.id}_${progressId}_${timestamp}_${randomStr}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Generate public URL
    const photoUrl = `/progress-photos/${fileName}`;

    // If progressId is provided, link the photo to the progress entry
    if (progressId && progressId.trim() !== "") {
      const { connectToDatabase } = await import("@/server/db/connection");
      const db = await connectToDatabase();
      const TICKETS_COLLECTION = "tickets";

      // Get current progress to add photo to existing array
      const currentProgress = ticket.dailyProgress?.find((p) => p._id === progressId);
      const currentPhotos = currentProgress?.photos || [];

      await db.collection(TICKETS_COLLECTION).updateOne(
        { _id: new ObjectId(params.id) as any },
        {
          $set: {
            "dailyProgress.$[elem].photos": [...currentPhotos, photoUrl],
            updatedAt: new Date(),
          },
        },
        {
          arrayFilters: [{ "elem._id": progressId }],
        }
      );
    }
    // If no progressId, the photo is saved to disk but not linked yet
    // It will be linked when the progress entry is created

    return NextResponse.json({
      success: true,
      photoUrl,
      message: "Photo uploaded successfully",
    });
  } catch (error) {
    console.error("Upload photo error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete photo
export async function DELETE(
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

    const body = await request.json();
    const { progressId, photoUrl } = body;

    if (!progressId || !photoUrl) {
      return NextResponse.json(
        { error: "Progress ID and photo URL are required" },
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

    // Check permissions
    if (payload.role === "field_team") {
      const user = await findUserById(payload.userId);
      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      const teamIds = user.teamIds || (user.teamId ? [user.teamId] : []);
      const progress = ticket.dailyProgress?.find((p) => p._id === progressId);
      
      // Team member can only delete their own photos
      if (!progress || progress.addedBy !== payload.userId) {
        return NextResponse.json(
          { error: "You can only delete photos from your own progress" },
          { status: 403 }
        );
      }
    }

    // Delete file from filesystem
    const fileName = photoUrl.split('/').pop();
    if (fileName) {
      const filePath = join(process.cwd(), "public", "progress-photos", fileName);
      try {
        if (existsSync(filePath)) {
          await unlink(filePath);
        }
      } catch (error) {
        console.error("Error deleting file:", error);
        // Continue even if file deletion fails
      }
    }

    // Remove photo URL from ticket
    const { connectToDatabase } = await import("@/server/db/connection");
    const db = await connectToDatabase();
    const TICKETS_COLLECTION = "tickets";

    const currentProgress = ticket.dailyProgress?.find((p) => p._id === progressId);
    const currentPhotos = currentProgress?.photos || [];
    const updatedPhotos = currentPhotos.filter((url) => url !== photoUrl);

    await db.collection(TICKETS_COLLECTION).updateOne(
      { _id: new ObjectId(params.id) as any },
      {
        $set: {
          "dailyProgress.$[elem].photos": updatedPhotos,
          updatedAt: new Date(),
        },
      },
      {
        arrayFilters: [{ "elem._id": progressId }],
      }
    );

    return NextResponse.json({
      success: true,
      message: "Photo deleted successfully",
    });
  } catch (error) {
    console.error("Delete photo error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

