"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TeamLayout } from "@/components/team/team-layout";
import { PageHeader } from "@/components/team/page-header";
import { showToast } from "@/lib/toast";
import { Ticket } from "lucide-react";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function TeamTicketsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "field_team") {
      router.push("/");
      return;
    }

    setUser(parsedUser);
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    showToast.success("Logged out", "You have been successfully logged out");
    router.push("/");
  };

  if (loading) {
    return (
      <TeamLayout
        user={user ? { name: user.name, email: user.email } : undefined}
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <p>Loading...</p>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout
      user={user ? { name: user.name, email: user.email } : undefined}
      onLogout={handleLogout}
    >
      <div className="max-w-7xl mx-auto">
        <PageHeader title="Tickets" subtitle="Manage your tickets" />

        <div className="border rounded-lg p-12 bg-card text-center">
          <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Tickets Coming Soon</h3>
          <p className="text-muted-foreground">
            Ticket management features will be available here soon.
          </p>
        </div>
      </div>
    </TeamLayout>
  );
}

