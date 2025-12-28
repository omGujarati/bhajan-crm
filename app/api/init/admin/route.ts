import { NextResponse } from "next/server";
import {
  createUser,
  findUserByEmail,
  findUserByPhone,
} from "@/server/db/users";

export async function POST() {
  try {
    // Check if admin already exists
    const existingAdminByEmail = await findUserByEmail("admin@bhajan.com");
    const existingAdminByPhone = await findUserByPhone("9999955555");

    if (existingAdminByEmail || existingAdminByPhone) {
      return NextResponse.json({
        success: true,
        message: "Admin user already exists",
        existing: true,
      });
    }

    // Create admin with specified credentials
    // Note: Password "admin123" doesn't meet strong requirements but is allowed for initial setup
    // In production, enforce password reset on first login
    const adminId = await createUser({
      name: "Admin User",
      email: "admin@bhajan.com",
      phone: "9999955555",
      password: "admin123",
      role: "admin",
      isActive: true,
      failedLoginAttempts: 0,
    });

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      adminId,
      credentials: {
        email: "admin@bhajan.com",
        phone: "9999955555",
        password: "admin123",
      },
    });
  } catch (error) {
    console.error("Init admin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
