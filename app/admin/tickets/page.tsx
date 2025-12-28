"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin/admin-layout";
import { PageHeader } from "@/components/admin/page-header";
import { showToast } from "@/lib/toast";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function TicketsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login/admin");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "admin") {
      router.push("/login/admin");
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
      <AdminLayout
        user={user ? { name: user.name, email: user.email } : undefined}
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <p>Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      user={user ? { name: user.name, email: user.email } : undefined}
      onLogout={handleLogout}
    >
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Tickets"
          subtitle="Manage support tickets"
        />

        <div className="border rounded-lg p-8 bg-card text-center">
          <p className="text-muted-foreground">Tickets feature coming soon</p>
        </div>
      </div>
    </AdminLayout>
  );
}

