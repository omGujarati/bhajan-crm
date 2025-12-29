export type UserRole = "admin" | "field_team";

export interface User {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  teamIds?: string[]; // Array of team IDs for field team members (supports multiple teams)
  teamNames?: string[]; // Array of team names for field team members (supports multiple teams)
  // Legacy fields for backward compatibility (will be migrated)
  teamId?: string;
  teamName?: string;
  isActive: boolean;
  failedLoginAttempts?: number; // Track failed login attempts
  lockedUntil?: Date; // Account lockout timestamp
  lastLogin?: Date; // Last successful login
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  _id?: string;
  teamId: string; // Unique team ID like TEAM001
  name: string;
  description?: string;
  department?: string;
  email: string; // Team email for login
  password: string; // Hashed team password for login
  createdBy: string; // Admin user ID
  failedLoginAttempts?: number; // Track failed login attempts
  lockedUntil?: Date; // Account lockout timestamp
  lastLogin?: Date; // Last successful login
  createdAt: Date;
  updatedAt: Date;
}

