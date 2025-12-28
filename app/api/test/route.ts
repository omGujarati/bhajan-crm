import { NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db/connection";

export async function GET() {
  try {
    // Test database connection
    let dbStatus = "disconnected";
    try {
      const db = await connectToDatabase();
      // Try to ping the database
      await db.admin().ping();
      dbStatus = "connected";
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      dbStatus = "error";
    }

    return NextResponse.json({
      message: "Test API is working!",
      timestamp: new Date().toISOString(),
      dbStatus: dbStatus,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        message: "Error occurred",
        timestamp: new Date().toISOString(),
        dbStatus: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
