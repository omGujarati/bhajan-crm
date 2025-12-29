import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import {
  findTeamById,
  updateTeam,
  findUsersByTeam,
  findUserById,
} from "@/server/db/users";
import {
  sanitizeInput,
  containsSQLInjection,
  containsXSS,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Check if this is a team login or individual user login
    if (payload.teamId) {
      // Team login - check if this is their team
      const { findTeamByTeamId } = await import("@/server/db/users");
      const loggedInTeam = await findTeamByTeamId(payload.teamId);
      if (!loggedInTeam) {
        return NextResponse.json(
          { error: "Team not found" },
          { status: 404 }
        );
      }
      // Compare team._id (ObjectId) with params.id (string) - convert both to strings
      const teamIdStr = loggedInTeam._id?.toString();
      if (teamIdStr !== params.id) {
        return NextResponse.json(
          { error: "You can only view your own team" },
          { status: 403 }
        );
      }
    } else {
      // Individual user login
      if (payload.role === "admin") {
        // Admins can view any team
      } else {
        // Check if user is a member of this team
        const user = await findUserById(payload.userId);
        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        
        if (user.role !== "field_team") {
          return NextResponse.json(
            { error: "Only admins and team members can view team details" },
            { status: 403 }
          );
        }
        
        // Check if user is a member of this team
        const userTeamIds = user.teamIds || (user.teamId ? [user.teamId] : []);
        if (!userTeamIds.includes(params.id)) {
          return NextResponse.json(
            { error: "You can only view teams you are assigned to" },
            { status: 403 }
          );
        }
      }
    }

    const team = await findTeamById(params.id);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Get team members
    const members = await findUsersByTeam(params.id);

    return NextResponse.json({
      success: true,
      team,
      members: members.map(({ password, ...member }) => member),
    });
  } catch (error) {
    console.error("Get team error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
        { error: "Only admins can update teams" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, department, email, password } = body;

    const updates: {
      name?: string;
      description?: string;
      department?: string;
      email?: string;
      password?: string;
    } = {};

    // Validate and sanitize name
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

    // Validate and sanitize description
    if (description !== undefined) {
      if (description === "" || description === null) {
        updates.description = undefined;
      } else {
        const sanitizedDescription = sanitizeInput(description);
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

        updates.description = sanitizedDescription;
      }
    }

    // Validate and sanitize department
    if (department !== undefined) {
      if (department === "" || department === null) {
        updates.department = undefined;
      } else {
        const sanitizedDepartment = sanitizeInput(department);
        if (sanitizedDepartment.length < 2 || sanitizedDepartment.length > 100) {
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

        updates.department = sanitizedDepartment;
      }
    }

    // Validate and sanitize email
    if (email !== undefined) {
      const { validateEmailOrPhone } = await import("@/lib/validation");
      const emailValidation = validateEmailOrPhone(email);
      if (!emailValidation.isValid || emailValidation.type !== "email") {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }
      
      // Check if email is already taken by another team
      const { findTeamByEmail } = await import("@/server/db/users");
      const existingTeam = await findTeamByEmail(emailValidation.sanitized);
      if (existingTeam && existingTeam._id !== params.id) {
        return NextResponse.json(
          { error: "Email is already in use by another team" },
          { status: 400 }
        );
      }
      
      updates.email = emailValidation.sanitized;
    }

    // Validate password if provided
    if (password !== undefined && password !== "") {
      const { isValidPassword } = await import("@/lib/validation");
      if (!isValidPassword(password)) {
        return NextResponse.json(
          {
            error:
              "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number",
          },
          { status: 400 }
        );
      }
      updates.password = password; // Will be hashed in updateTeam
    }

    // Update team
    await updateTeam(params.id, updates);

    // Get updated team
    const updatedTeam = await findTeamById(params.id);
    if (!updatedTeam) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Team updated successfully",
      team: updatedTeam,
    });
  } catch (error) {
    console.error("Update team error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

