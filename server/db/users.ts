import { Db, ObjectId } from "mongodb";
import { connectToDatabase } from "./connection";
import { User, Team, UserRole } from "../models/user";
import bcrypt from "bcryptjs";

const USERS_COLLECTION = "users";
const TEAMS_COLLECTION = "teams";

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
  const users = await db
    .collection<User>(USERS_COLLECTION)
    .find({ teamId })
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
  teamData: Omit<Team, "_id" | "createdAt" | "updatedAt">
): Promise<string> {
  const db = await connectToDatabase();

  const team: Omit<Team, "_id"> = {
    ...teamData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection(TEAMS_COLLECTION).insertOne(team);
  return result.insertedId.toString();
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
