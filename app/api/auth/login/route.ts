import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmail,
  findUserByPhone,
  verifyPassword,
  incrementFailedLoginAttempts,
  resetFailedLoginAttempts,
  isAccountLocked,
  findTeamByEmail,
  findTeamByTeamId,
  incrementTeamFailedLoginAttempts,
  resetTeamFailedLoginAttempts,
  isTeamAccountLocked,
} from "@/server/db/users";
import { generateToken } from "@/lib/auth";
import {
  validateEmailOrPhone,
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
  getClientIP,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailOrPhone, email, phone, password } = body;

    // Get client IP for rate limiting
    const clientIP = getClientIP(request);

    // Support both old format (email/phone) and new format (emailOrPhone)
    const identifier = emailOrPhone || email || phone;

    // Basic validation
    if (!password || !identifier) {
      return NextResponse.json(
        { error: "Email/Phone and password are required" },
        { status: 400 }
      );
    }

    // Validate and sanitize input
    const validation = validateEmailOrPhone(identifier);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || "Invalid email or phone format" },
        { status: 400 }
      );
    }

    // Check rate limiting by IP
    const rateLimitCheck = checkRateLimit(clientIP, 10, 5 * 60 * 1000); // 5 attempts per 15 minutes
    if (!rateLimitCheck.allowed) {
      const minutesLeft = rateLimitCheck.lockedUntil
        ? Math.ceil((rateLimitCheck.lockedUntil - Date.now()) / 60000)
        : 0;
      return NextResponse.json(
        {
          error: `Too many login attempts. Please try again in ${minutesLeft} minutes.`,
        },
        { status: 429 }
      );
    }

    // Validate password format (basic check)
    if (typeof password !== "string" || password.length > 128) {
      return NextResponse.json(
        { error: "Invalid password format" },
        { status: 400 }
      );
    }

    // Find user by email or phone - using sanitized input
    let user = null;
    let team = null;
    
    if (validation.type === "email") {
      user = await findUserByEmail(validation.sanitized);
      // Also check if it's a team email
      if (!user) {
        team = await findTeamByEmail(validation.sanitized);
      }
    } else if (validation.type === "phone") {
      user = await findUserByPhone(validation.sanitized);
    } else {
      // Could be a teamId (alphanumeric)
      team = await findTeamByTeamId(identifier.toUpperCase());
    }

    // Handle team login
    if (team && !user) {
      // Check if team account is locked
      const teamLocked = await isTeamAccountLocked(team);
      if (teamLocked) {
        const lockedUntil = team.lockedUntil!;
        const minutesLeft = Math.ceil(
          (lockedUntil.getTime() - Date.now()) / 60000
        );
        return NextResponse.json(
          {
            error: `Account is locked due to multiple failed attempts. Please try again in ${minutesLeft} minutes.`,
          },
          { status: 423 } // 423 Locked
        );
      }

      // Verify team password
      const isValidTeamPassword = await verifyPassword(password, team.password);
      if (!isValidTeamPassword) {
        // Increment failed attempts in database
        await incrementTeamFailedLoginAttempts(team._id!);
        recordFailedAttempt(clientIP);
        return NextResponse.json(
          { error: "Invalid credentials" }, // Generic message
          { status: 401 }
        );
      }

      // Successful team login - reset failed attempts
      await resetTeamFailedLoginAttempts(team._id!);
      clearFailedAttempts(clientIP);

      // Generate token with team info
      const token = generateToken({
        userId: team._id!,
        email: team.email,
        role: "field_team", // Teams login as field_team role
        teamId: team.teamId,
      });

      // Return team data (without password) in user format for compatibility
      const { password: _, ...teamWithoutPassword } = team;
      return NextResponse.json({
        success: true,
        token,
        user: {
          _id: team._id,
          name: team.name,
          email: team.email,
          role: "field_team" as const,
          teamId: team.teamId,
          teamIds: [team._id!], // Use team _id as teamIds for compatibility
          teamNames: [team.name],
        },
      });
    }

    // Handle user login (existing logic)
    // Always return generic error to prevent user enumeration
    if (!user) {
      recordFailedAttempt(clientIP);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if account is locked
    const accountLocked = await isAccountLocked(user);
    if (accountLocked) {
      const lockedUntil = user.lockedUntil!;
      const minutesLeft = Math.ceil(
        (lockedUntil.getTime() - Date.now()) / 60000
      );
      return NextResponse.json(
        {
          error: `Account is locked due to multiple failed attempts. Please try again in ${minutesLeft} minutes.`,
        },
        { status: 423 } // 423 Locked
      );
    }

    if (!user.isActive) {
      recordFailedAttempt(clientIP);
      return NextResponse.json(
        { error: "Invalid credentials" }, // Generic message
        { status: 401 }
      );
    }

    // Verify password
    const isValidUserPassword = await verifyPassword(password, user.password);
    if (!isValidUserPassword) {
      // Increment failed attempts in database
      await incrementFailedLoginAttempts(user._id!);
      recordFailedAttempt(clientIP);
      return NextResponse.json(
        { error: "Invalid credentials" }, // Generic message
        { status: 401 }
      );
    }

    // Successful login - reset failed attempts
    await resetFailedLoginAttempts(user._id!);
    clearFailedAttempts(clientIP);

    // Generate token
    const token = generateToken({
      userId: user._id!,
      email: user.email,
      role: user.role,
    });

    // Return user data (without password)
    const { password: __, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
