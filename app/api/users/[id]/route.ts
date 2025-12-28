import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import {
  findUserById,
  updateUser,
  deleteUser,
  findUserByEmail,
  findUserByPhone,
} from "@/server/db/users";
import {
  validateEmailOrPhone,
  sanitizeInput,
  containsSQLInjection,
  containsXSS,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(
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
        { error: "Only admins can update users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, phone } = body;

    const updates: { name?: string; email?: string; phone?: string } = {};

    // Get current user
    const currentUser = await findUserById(params.id);
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
        const existingUser = await findUserByEmail(emailValidation.sanitized);
        if (existingUser) {
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
        const currentPhone = currentUser.phone || "";
        const newPhone = phoneValidation.sanitized;

        if (currentPhone !== newPhone) {
          const existingPhoneUser = await findUserByPhone(phoneValidation.sanitized);
          if (existingPhoneUser) {
            const existingPhoneUserId = existingPhoneUser._id?.toString() || "";
            const currentUserId = currentUser._id?.toString() || "";

            if (existingPhoneUserId !== currentUserId) {
              return NextResponse.json(
                { error: "Phone number is already in use" },
                { status: 400 }
              );
            }
          }
        }

        updates.phone = phoneValidation.sanitized;
      }
    }

    // Update user
    await updateUser(params.id, updates);

    // Get updated user
    const updatedUser = await findUserById(params.id);
    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
        { error: "Only admins can delete users" },
        { status: 403 }
      );
    }

    // Verify user exists
    const user = await findUserById(params.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Don't allow deleting admin users
    if (user.role === "admin") {
      return NextResponse.json(
        { error: "Cannot delete admin users" },
        { status: 400 }
      );
    }

    // Delete user
    await deleteUser(params.id);

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

