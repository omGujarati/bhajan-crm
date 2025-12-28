import { Db, ObjectId } from "mongodb";
import { connectToDatabase } from "./connection";
import { User, Team, UserRole } from "../models/user";
import bcrypt from "bcryptjs";

const USERS_COLLECTION = "users";
const TEAMS_COLLECTION = "teams";

// Generate unique team ID
async function generateTeamId(): Promise<string> {
  const db = await connectToDatabase();
  
  // Find the highest team ID
  const teams = await db
    .collection(TEAMS_COLLECTION)
    .find({})
    .sort({ teamId: -1 })
    .limit(1)
    .toArray();
  
  if (teams.length === 0) {
    return "TEAM001";
  }
  
  const lastTeamId = teams[0].teamId || "";
  const match = lastTeamId.match(/TEAM(\d+)/);
  
  if (match) {
    const number = parseInt(match[1], 10);
    const nextNumber = number + 1;
    return `TEAM${nextNumber.toString().padStart(3, "0")}`;
  }
  
  return "TEAM001";
}

// User operations
export async function createUser(
  userData: Omit<User, "_id" | "createdAt" | "updatedAt">
): Promise<string> {
  const db = await connectToDatabase();
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const user: Omit<User, "_id"> = {
    ...userData,
    password: hashedPassword,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection(USERS_COLLECTION).insertOne(user);
  return result.insertedId.toString();
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await connectToDatabase();
  const user = await db
    .collection<User>(USERS_COLLECTION)
    .findOne({ email: email.toLowerCase() });
  return user;
}

export async function findUserByPhone(phone: string): Promise<User | null> {
  const db = await connectToDatabase();
  const user = await db.collection<User>(USERS_COLLECTION).findOne({ phone });
  return user;
}

export async function incrementFailedLoginAttempts(
  userId: string
): Promise<void> {
  const db = await connectToDatabase();
  const user = await findUserById(userId);
  if (!user) return;

  const failedAttempts = (user.failedLoginAttempts || 0) + 1;
  const maxAttempts = 5;
  const lockDuration = 30 * 60 * 1000; // 30 minutes

  const update: any = {
    failedLoginAttempts: failedAttempts,
    updatedAt: new Date(),
  };

  // Lock account after max attempts
  if (failedAttempts >= maxAttempts) {
    update.lockedUntil = new Date(Date.now() + lockDuration);
  }

  await db
    .collection(USERS_COLLECTION)
    .updateOne({ _id: new ObjectId(userId) }, { $set: update });
}

export async function resetFailedLoginAttempts(userId: string): Promise<void> {
  const db = await connectToDatabase();
  await db.collection(USERS_COLLECTION).updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date(),
        updatedAt: new Date(),
      },
    }
  );
}

export async function isAccountLocked(user: User): Promise<boolean> {
  if (!user.lockedUntil) return false;
  return new Date() < user.lockedUntil;
}

export async function findUserById(id: string): Promise<User | null> {
  const db = await connectToDatabase();
  const user = await db
    .collection<User>(USERS_COLLECTION)
    .findOne({ _id: new ObjectId(id) } as any);
  return user;
}

export async function findUsersByRole(role: UserRole): Promise<User[]> {
  const db = await connectToDatabase();
  const users = await db
    .collection<User>(USERS_COLLECTION)
    .find({ role })
    .toArray();
  return users;
}

export async function findUsersByTeam(teamId: string): Promise<User[]> {
  const db = await connectToDatabase();
  // Support both new array format and legacy single teamId format
  const users = await db
    .collection<User>(USERS_COLLECTION)
    .find({
      $or: [
        { teamIds: teamId }, // New format: teamId in array
        { teamId: teamId }, // Legacy format: single teamId
      ],
    })
    .toArray();
  return users;
}

export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// Team operations
export async function createTeam(
  teamData: Omit<Team, "_id" | "teamId" | "createdAt" | "updatedAt">
): Promise<string> {
  const db = await connectToDatabase();

  // Generate unique team ID
  const teamId = await generateTeamId();

  const team: Omit<Team, "_id"> = {
    ...teamData,
    teamId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection(TEAMS_COLLECTION).insertOne(team);
  return result.insertedId.toString();
}

export async function updateTeam(
  teamId: string,
  updates: {
    name?: string;
    description?: string;
    department?: string;
  }
): Promise<void> {
  const db = await connectToDatabase();
  const updateData: any = {
    ...updates,
    updatedAt: new Date(),
  };

  await db
    .collection(TEAMS_COLLECTION)
    .updateOne(
      { _id: new ObjectId(teamId) as any },
      { $set: updateData }
    );
}

export async function findTeamByTeamId(teamId: string): Promise<Team | null> {
  const db = await connectToDatabase();
  const team = await db
    .collection<Team>(TEAMS_COLLECTION)
    .findOne({ teamId });
  return team;
}

export async function deleteTeam(teamId: string): Promise<void> {
  const db = await connectToDatabase();
  
  // Get team to find team name for removal
  const team = await findTeamById(teamId);
  const teamName = team?.name;

  // Find all users in this team (support both new array format and legacy single teamId format)
  const usersInTeam = await db
    .collection<User>(USERS_COLLECTION)
    .find({
      $or: [
        { teamIds: teamId },
        { teamId: teamId },
      ],
    })
    .toArray();

  // Unassign each user from this team
  for (const user of usersInTeam) {
    await unassignUserFromTeam(user._id!.toString(), teamId, teamName || "");
  }

  // Delete the team
  await db
    .collection(TEAMS_COLLECTION)
    .deleteOne({ _id: new ObjectId(teamId) as any });
}

export async function findAllTeamMembers(): Promise<User[]> {
  const db = await connectToDatabase();
  const users = await db
    .collection<User>(USERS_COLLECTION)
    .find({ role: "field_team" })
    .toArray();
  return users;
}

export async function updateUser(
  userId: string,
  updates: {
    name?: string;
    email?: string;
    phone?: string;
  }
): Promise<void> {
  const db = await connectToDatabase();
  const updateData: any = {
    ...updates,
    updatedAt: new Date(),
  };

  await db
    .collection(USERS_COLLECTION)
    .updateOne(
      { _id: new ObjectId(userId) as any },
      { $set: updateData }
    );
}

export async function deleteUser(userId: string): Promise<void> {
  const db = await connectToDatabase();
  await db
    .collection(USERS_COLLECTION)
    .deleteOne({ _id: new ObjectId(userId) as any });
}

export async function assignUserToTeam(
  userId: string,
  teamId: string,
  teamName: string
): Promise<void> {
  const db = await connectToDatabase();
  
  // Get current user to check existing teams
  const user = await findUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Initialize arrays if they don't exist
  const currentTeamIds = user.teamIds || [];
  const currentTeamNames = user.teamNames || [];

  // Check if user is already in this team
  if (currentTeamIds.includes(teamId)) {
    return; // Already assigned, no need to update
  }

  // Add new team to arrays
  const updatedTeamIds = [...currentTeamIds, teamId];
  const updatedTeamNames = [...currentTeamNames, teamName];

  // Update user with new team arrays
  await db
    .collection(USERS_COLLECTION)
    .updateOne(
      { _id: new ObjectId(userId) as any },
      {
        $set: {
          teamIds: updatedTeamIds,
          teamNames: updatedTeamNames,
          updatedAt: new Date(),
        },
      }
    );
}

export async function findTeamById(id: string): Promise<Team | null> {
  const db = await connectToDatabase();
  const team = await db
    .collection<Team>(TEAMS_COLLECTION)
    .findOne({ _id: new ObjectId(id) } as any);
  return team;
}

export async function findAllTeams(): Promise<Team[]> {
  const db = await connectToDatabase();
  const teams = await db.collection<Team>(TEAMS_COLLECTION).find({}).toArray();
  return teams;
}

export async function updateUserTeam(
  userId: string,
  teamId: string,
  teamName: string
): Promise<void> {
  const db = await connectToDatabase();
  await db
    .collection(USERS_COLLECTION)
    .updateOne(
      { _id: new ObjectId(userId) },
      { $set: { teamId, teamName, updatedAt: new Date() } }
    );
}

export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    email?: string;
    phone?: string | undefined;
  }
): Promise<void> {
  const db = await connectToDatabase();
  const updateData: any = {
    updatedAt: new Date(),
  };

  // Only include fields that are actually being updated
  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }
  if (updates.email !== undefined) {
    updateData.email = updates.email;
  }
  if (updates.phone !== undefined) {
    // If phone is explicitly set to undefined, remove it from the document
    if (updates.phone === undefined || updates.phone === null || updates.phone === "") {
      updateData.phone = null;
    } else {
      updateData.phone = updates.phone;
    }
  }

  await db
    .collection(USERS_COLLECTION)
    .updateOne({ _id: new ObjectId(userId) as any }, { $set: updateData });
}

export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const db = await connectToDatabase();
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await db
    .collection(USERS_COLLECTION)
    .updateOne(
      { _id: new ObjectId(userId) as any },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      }
    );
}

export async function unassignUserFromTeam(
  userId: string,
  teamId: string,
  teamName: string
): Promise<void> {
  const db = await connectToDatabase();
  
  // Get current user to check existing teams
  const user = await findUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Get current team arrays
  const currentTeamIds = user.teamIds || [];
  const currentTeamNames = user.teamNames || [];

  // Check if user is in this team
  if (!currentTeamIds.includes(teamId)) {
    // Also check legacy format
    if (user.teamId !== teamId) {
      return; // Not in this team, nothing to do
    }
  }

  // Remove team from arrays
  const updatedTeamIds = currentTeamIds.filter((id) => id !== teamId);
  const updatedTeamNames = currentTeamNames.filter((name) => name !== teamName);

  // Build update object
  const update: any = {
    updatedAt: new Date(),
  };

  // Update arrays
  if (updatedTeamIds.length > 0) {
    update.teamIds = updatedTeamIds;
    update.teamNames = updatedTeamNames;
  } else {
    // If no teams left, clear arrays
    update.teamIds = [];
    update.teamNames = [];
  }

  // Also clear legacy fields if they match
  if (user.teamId === teamId) {
    update.teamId = null;
    update.teamName = null;
  }

  await db
    .collection(USERS_COLLECTION)
    .updateOne(
      { _id: new ObjectId(userId) as any },
      { $set: update }
    );
}
