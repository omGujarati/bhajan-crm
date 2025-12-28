import { NextRequest, NextResponse } from "next/server";
import { createTeam } from "@/server/db/users";
import { verifyToken } from "@/lib/auth";
import { getTokenFromRequest } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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
        { error: "Only admins can create teams" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, department } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const { sanitizeInput, containsSQLInjection, containsXSS } = await import(
      "@/lib/validation"
    );

    const sanitizedName = sanitizeInput(name);
    if (sanitizedName.length < 2 || sanitizedName.length > 100) {
      return NextResponse.json(
        { error: "Name must be between 2 and 100 characters" },
        { status: 400 }
      );
    }

    if (containsSQLInjection(sanitizedName) || containsXSS(sanitizedName)) {
      return NextResponse.json(
        { error: "Invalid characters in name" },
        { status: 400 }
      );
    }

    let sanitizedDescription: string | undefined;
    if (description) {
      sanitizedDescription = sanitizeInput(description);
      if (sanitizedDescription.length > 500) {
        return NextResponse.json(
          { error: "Description must be less than 500 characters" },
          { status: 400 }
        );
      }
      if (
        containsSQLInjection(sanitizedDescription) ||
        containsXSS(sanitizedDescription)
      ) {
        return NextResponse.json(
          { error: "Invalid characters in description" },
          { status: 400 }
        );
      }
    }

    let sanitizedDepartment: string | undefined;
    if (department) {
      sanitizedDepartment = sanitizeInput(department);
      if (
        sanitizedDepartment.length < 2 ||
        sanitizedDepartment.length > 100
      ) {
        return NextResponse.json(
          { error: "Department must be between 2 and 100 characters" },
          { status: 400 }
        );
      }
      if (
        containsSQLInjection(sanitizedDepartment) ||
        containsXSS(sanitizedDepartment)
      ) {
        return NextResponse.json(
          { error: "Invalid characters in department" },
          { status: 400 }
        );
      }
    }

    const teamId = await createTeam({
      name: sanitizedName,
      description: sanitizedDescription,
      department: sanitizedDepartment,
      createdBy: payload.userId,
    });

    return NextResponse.json({
      success: true,
      message: "Team created successfully",
      teamId,
    });
  } catch (error) {
    console.error("Create team error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

