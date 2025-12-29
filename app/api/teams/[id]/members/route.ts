import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import {
  findTeamById,
  createUser,
  findUserByEmail,
  findUserByPhone,
  assignUserToTeam,
} from "@/server/db/users";
import { UserRole } from "@/server/models/user";
import {
  validateEmailOrPhone,
  isValidPassword,
  sanitizeInput,
  containsSQLInjection,
  containsXSS,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can add team members" },
        { status: 403 }
      );
    }

    // Verify team exists
    const team = await findTeamById(params.id);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const body = await request.json();
    let { name, email, phone } = body;

    // Validate required fields (password no longer required - members don't have individual logins)
    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
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

    // Check if user already exists (members are just records, not login accounts)
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      // If user exists, just assign them to the team if not already assigned
      const userTeamIds = existingUser.teamIds || (existingUser.teamId ? [existingUser.teamId] : []);
      if (!userTeamIds.includes(params.id)) {
        await assignUserToTeam(existingUser._id!, params.id, team.name);
      }
      return NextResponse.json({
        success: true,
        message: "Team member added successfully",
        userId: existingUser._id,
      });
    }

    if (phone) {
      const existingPhoneUser = await findUserByPhone(phone);
      if (existingPhoneUser) {
        const userTeamIds = existingPhoneUser.teamIds || (existingPhoneUser.teamId ? [existingPhoneUser.teamId] : []);
        if (!userTeamIds.includes(params.id)) {
          await assignUserToTeam(existingPhoneUser._id!, params.id, team.name);
        }
        return NextResponse.json({
          success: true,
          message: "Team member added successfully",
          userId: existingPhoneUser._id,
        });
      }
    }

    // Create user record without password (members don't have individual logins)
    // Use a placeholder password that will never be used
    const placeholderPassword = `placeholder_${Date.now()}_${Math.random()}`;
    const userId = await createUser({
      name,
      email,
      phone: phone || undefined,
      password: placeholderPassword, // Placeholder - not used for login
      role: "field_team" as UserRole,
      teamIds: [params.id],
      teamNames: [team.name],
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: "Team member added successfully",
      userId,
    });
  } catch (error) {
    console.error("Add team member error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

