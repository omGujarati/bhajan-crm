import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { findUserById, updateUserProfile, findUserByEmail, findUserByPhone, findTeamById, findTeamByTeamId } from "@/server/db/users";
import {
  validateEmailOrPhone,
  sanitizeInput,
  containsSQLInjection,
  containsXSS,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Check if this is a team login
    if (payload.teamId) {
      const team = await findTeamByTeamId(payload.teamId);
      if (!team) {
        return NextResponse.json({ error: "Team not found" }, { status: 404 });
      }
      
      // Return team data in user format for compatibility
      const { password: _, ...teamWithoutPassword } = team;
      return NextResponse.json({
        success: true,
        user: {
          _id: team._id,
          name: team.name,
          email: team.email,
          role: "field_team" as const,
          teamId: team.teamId,
          teamIds: [team._id!],
          teamNames: [team.name],
        },
      });
    }

    // Individual user login
    const user = await findUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone } = body;

    // Teams cannot update their profile through this endpoint (use team update endpoint)
    if (payload.teamId) {
      return NextResponse.json(
        { error: "Team profiles should be updated through team management" },
        { status: 403 }
      );
    }

    const updates: { name?: string; email?: string; phone?: string } = {};

    // Get current user
    const currentUser = await findUserById(payload.userId);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update name if provided
    if (name !== undefined) {
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

      updates.name = sanitizedName;
    }

    // Update email if provided
    if (email !== undefined) {
      const emailValidation = validateEmailOrPhone(email);
      if (!emailValidation.isValid || emailValidation.type !== "email") {
        return NextResponse.json(
          { error: emailValidation.error || "Invalid email format" },
          { status: 400 }
        );
      }

      // Only check for duplicates if email is different from current email
      const currentEmail = currentUser.email?.toLowerCase() || "";
      const newEmail = emailValidation.sanitized.toLowerCase();
      
      if (currentEmail !== newEmail) {
        // Check if email is already taken by another user
        const existingUser = await findUserByEmail(emailValidation.sanitized);
        if (existingUser) {
          // Convert ObjectIds to strings for comparison
          const existingUserId = existingUser._id?.toString() || "";
          const currentUserId = currentUser._id?.toString() || "";
          
          if (existingUserId !== currentUserId) {
            return NextResponse.json(
              { error: "Email is already in use" },
              { status: 400 }
            );
          }
        }
      }

      updates.email = emailValidation.sanitized;
    }

    // Update phone if provided
    if (phone !== undefined) {
      if (phone === "" || phone === null) {
        updates.phone = undefined;
      } else {
        const phoneValidation = validateEmailOrPhone(phone);
        if (!phoneValidation.isValid || phoneValidation.type !== "phone") {
          return NextResponse.json(
            { error: phoneValidation.error || "Invalid phone format" },
            { status: 400 }
          );
        }

        // Only check for duplicates if phone is different from current phone
        const currentPhone = (currentUser.phone || "").trim();
        const newPhone = phoneValidation.sanitized.trim();
        
        // Only check for duplicates if the phone number actually changed
        if (currentPhone !== newPhone) {
          // Check if phone is already taken by another user
          const existingPhoneUser = await findUserByPhone(phoneValidation.sanitized);
          if (existingPhoneUser) {
            // Convert ObjectIds to strings for comparison
            const existingPhoneUserId = existingPhoneUser._id?.toString() || "";
            const currentUserId = currentUser._id?.toString() || "";
            
            // Only error if it's a different user
            if (existingPhoneUserId !== currentUserId) {
              return NextResponse.json(
                { error: "Phone number is already in use" },
                { status: 400 }
              );
            }
            // If it's the same user, allow them to re-add their own phone number
          }
        }

        updates.phone = phoneValidation.sanitized;
      }
    }

    // Update user profile
    await updateUserProfile(payload.userId, updates);

    // Get updated user
    const updatedUser = await findUserById(payload.userId);
    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

