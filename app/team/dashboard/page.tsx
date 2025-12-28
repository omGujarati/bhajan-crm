"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  teamIds?: string[];
  teamNames?: string[];
  teamId?: string;
  teamName?: string;
}

export default function TeamDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login/team");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "field_team") {
      router.push("/login/team");
      return;
    }

    setUser(parsedUser);
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-semibold">Team Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {user?.name}</p>
            {user?.teamName && (
              <p className="text-muted-foreground">
                Team{(user.teamNames && user.teamNames.length > 1) ? "s" : ""}: {user.teamNames && user.teamNames.length > 0 ? user.teamNames.join(", ") : (user.teamName || "N/A")}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">Your Information</h2>
          <div className="space-y-2">
            <p><strong>Name:</strong> {user?.name}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            {user?.phone && <p><strong>Phone:</strong> {user?.phone}</p>}
            {user?.teamName && <p><strong>Team:</strong> {user?.teamName}</p>}
          </div>
        </div>

        <div className="mt-6 text-center text-muted-foreground">
          <p>Team member features will be added here</p>
        </div>
      </div>
    </main>
  );
}

