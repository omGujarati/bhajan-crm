import { NextRequest, NextResponse } from "next/server";
import {
  createUser,
  findUserByEmail,
  findUserByPhone,
} from "@/server/db/users";
import { verifyToken } from "@/lib/auth";
import { getTokenFromRequest } from "@/lib/auth";
import { UserRole } from "@/server/models/user";
import {
  validateEmailOrPhone,
  isValidPassword,
  sanitizeInput,
  containsSQLInjection,
  containsXSS,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can create users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    let { name, email, phone, password, role, teamId, teamName } = body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Name, email, password, and role are required" },
        { status: 400 }
      );
    }

    // Validate role
    if (role !== "admin" && role !== "field_team") {
      return NextResponse.json(
        { error: "Invalid role. Must be 'admin' or 'field_team'" },
        { status: 400 }
      );
    }

    // Sanitize and validate inputs
    name = sanitizeInput(name);
    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: "Name must be between 2 and 100 characters" },
        { status: 400 }
      );
    }

    // Check for injection attempts in name
    if (containsSQLInjection(name) || containsXSS(name)) {
      return NextResponse.json(
        { error: "Invalid characters in name" },
        { status: 400 }
      );
    }

    // Validate email
    const emailValidation = validateEmailOrPhone(email);
    if (!emailValidation.isValid || emailValidation.type !== "email") {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }
    email = emailValidation.sanitized;

    // Validate phone if provided
    if (phone) {
      const phoneValidation = validateEmailOrPhone(phone);
      if (!phoneValidation.isValid || phoneValidation.type !== "phone") {
        return NextResponse.json(
          { error: "Invalid phone format" },
          { status: 400 }
        );
      }
      phone = phoneValidation.sanitized;
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number",
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    if (phone) {
      const existingPhoneUser = await findUserByPhone(phone);
      if (existingPhoneUser) {
        return NextResponse.json(
          { error: "User with this phone number already exists" },
          { status: 400 }
        );
      }
    }

    // For field team members, teamId and teamName are required
    if (role === "field_team" && (!teamId || !teamName)) {
      return NextResponse.json(
        { error: "Team ID and team name are required for field team members" },
        { status: 400 }
      );
    }

    // Create user
    const userId = await createUser({
      name,
      email,
      phone: phone || undefined,
      password,
      role: role as UserRole,
      teamId: role === "field_team" ? teamId : undefined,
      teamName: role === "field_team" ? teamName : undefined,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      userId,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
