"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TeamLayout } from "@/components/team/team-layout";
import { PageHeader } from "@/components/team/page-header";
import { Avatar } from "@/components/ui/avatar";
import { TextField } from "@/components/ui/text-field";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Edit2, Save, X as XIcon } from "lucide-react";
import { showToast } from "@/lib/toast";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function TeamSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Profile edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
  });
  const [profileErrors, setProfileErrors] = useState({
    name: "",
    email: "",
  });

  // Password change states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

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

    loadUserProfile();
  }, [router]);

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setProfileData({
          name: data.user.name || "",
          email: data.user.email || "",
        });
      } else {
        // Fallback to localStorage user
        const userData = localStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setProfileData({
            name: parsedUser.name || "",
            email: parsedUser.email || "",
          });
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      // Fallback to localStorage user
      const userData = localStorage.getItem("user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setProfileData({
          name: parsedUser.name || "",
          email: parsedUser.email || "",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
    setProfileErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateProfile = (): boolean => {
    const errors = {
      name: "",
      email: "",
    };

    if (!profileData.name.trim()) {
      errors.name = "Name is required";
    } else if (profileData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    } else if (profileData.name.trim().length > 100) {
      errors.name = "Name must be less than 100 characters";
    }

    if (!profileData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email.trim())) {
      errors.email = "Invalid email format";
    }

    setProfileErrors(errors);
    return !errors.name && !errors.email;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) {
      return;
    }

    setLoadingProfile(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileData.name.trim(),
          email: profileData.email.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle field-specific errors
        if (result.error.toLowerCase().includes("email")) {
          setProfileErrors((prev) => ({ ...prev, email: result.error }));
        } else if (result.error.toLowerCase().includes("name")) {
          setProfileErrors((prev) => ({ ...prev, name: result.error }));
        } else {
          showToast.error("Update failed", result.error || "Failed to update profile");
        }
        return;
      }

      // Update local user data
      if (result.user) {
        setUser(result.user);
        localStorage.setItem("user", JSON.stringify(result.user));
      }

      setIsEditingProfile(false);
      showToast.success("Profile updated", "Your profile has been updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast.error("Update failed", "An error occurred. Please try again.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleCancelEditProfile = () => {
    if (user) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
      });
    }
    setProfileErrors({ name: "", email: "" });
    setIsEditingProfile(false);
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
    setPasswordErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validatePassword = (): boolean => {
    const errors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!passwordData.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters";
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      errors.newPassword = "Password must contain uppercase, lowercase, and number";
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setPasswordErrors(errors);
    return !errors.currentPassword && !errors.newPassword && !errors.confirmPassword;
  };

  const handleSavePassword = async () => {
    if (!validatePassword()) {
      return;
    }

    setLoadingPassword(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error.toLowerCase().includes("current")) {
          setPasswordErrors((prev) => ({ ...prev, currentPassword: result.error }));
        } else if (result.error.toLowerCase().includes("new")) {
          setPasswordErrors((prev) => ({ ...prev, newPassword: result.error }));
        } else {
          showToast.error("Password change failed", result.error || "Failed to change password");
        }
        return;
      }

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsChangingPassword(false);
      showToast.success("Password changed", "Your password has been changed successfully");
    } catch (error) {
      console.error("Error changing password:", error);
      showToast.error("Password change failed", "An error occurred. Please try again.");
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleCancelPassword = () => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordErrors({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setIsChangingPassword(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    showToast.success("Logged out", "You have been successfully logged out");
    router.push("/");
  };

  if (loading) {
    return (
      <TeamLayout
        user={user ? { 
          name: user.name || (user as any).teamName || "Team", 
          email: user.email || (user as any).teamEmail || "" 
        } : undefined}
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
      <div className="max-w-4xl mx-auto">
        <PageHeader title="Settings" subtitle="Manage your account settings" />

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="border rounded-lg p-6 bg-card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Profile</h2>
              {!isEditingProfile ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingProfile(true)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEditProfile}
                    disabled={loadingProfile}
                  >
                    <XIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={loadingProfile}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loadingProfile ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar name={user?.name || "User"} size="lg" />
                <div>
                  <p className="font-medium">{user?.name || "User"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <TextField
                  label="Name"
                  value={profileData.name}
                  onChange={(e) => handleProfileChange("name", e.target.value)}
                  placeholder="Enter your name"
                  error={profileErrors.name}
                  disabled={!isEditingProfile}
                  required
                />
                <TextField
                  label="Email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleProfileChange("email", e.target.value)}
                  placeholder="Enter your email"
                  error={profileErrors.email}
                  disabled={!isEditingProfile}
                  required
                />
              </div>
            </div>
          </div>

          {/* Password Change Section */}
          <div className="border rounded-lg p-6 bg-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">Password</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Change your account password
                </p>
              </div>
              {!isChangingPassword ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangingPassword(true)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelPassword}
                    disabled={loadingPassword}
                  >
                    <XIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePassword}
                    disabled={loadingPassword}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loadingPassword ? "Changing..." : "Change Password"}
                  </Button>
                </div>
              )}
            </div>

            {isChangingPassword && (
              <div className="space-y-4">
                <PasswordInput
                  label="Current Password"
                  value={passwordData.currentPassword}
                  onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                  placeholder="Enter current password"
                  error={passwordErrors.currentPassword}
                  required
                />
                <PasswordInput
                  label="New Password"
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                  placeholder="Enter new password"
                  error={passwordErrors.newPassword}
                  helperText="Must be at least 8 characters with uppercase, lowercase, and number"
                  required
                />
                <PasswordInput
                  label="Confirm New Password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                  placeholder="Confirm new password"
                  error={passwordErrors.confirmPassword}
                  required
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </TeamLayout>
  );
}

