export type UserRole = "admin" | "field_team";

export interface User {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  teamId?: string; // For field team members
  teamName?: string; // For field team members
  isActive: boolean;
  failedLoginAttempts?: number; // Track failed login attempts
  lockedUntil?: Date; // Account lockout timestamp
  lastLogin?: Date; // Last successful login
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  _id?: string;
  name: string;
  createdBy: string; // Admin user ID
  createdAt: Date;
  updatedAt: Date;
}

