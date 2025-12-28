"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin/admin-layout";
import { PageHeader } from "@/components/admin/page-header";
import { Avatar } from "@/components/ui/avatar";
import { TextField } from "@/components/ui/text-field";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Edit2, Save, X as XIcon, Check } from "lucide-react";
import { showToast } from "@/lib/toast";

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

export default function SettingsPage() {
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
    phone: "",
  });
  const [profileErrors, setProfileErrors] = useState({
    name: "",
    email: "",
    phone: "",
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
    // Check authentication
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "admin") {
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
          phone: data.user.phone || "",
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
            phone: parsedUser.phone || "",
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
          phone: parsedUser.phone || "",
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
      phone: "",
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

    if (profileData.phone && profileData.phone.trim()) {
      const phoneRegex =
        /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
      const cleaned = profileData.phone.replace(/[\s-]/g, "");
      if (cleaned.length < 10 || cleaned.length > 15) {
        errors.phone = "Invalid phone number length";
      } else if (!phoneRegex.test(profileData.phone.trim())) {
        errors.phone = "Invalid phone format";
      }
    }

    setProfileErrors(errors);
    return !errors.name && !errors.email && !errors.phone;
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
        body: JSON.stringify(profileData),
      });

      const result = await response.json();

      if (!response.ok) {
        // Show error toast
        showToast.error(
          "Profile update failed",
          result.error || "Failed to update profile"
        );

        // Handle field-specific errors - check phone first, then email, then name
        if (result.error.toLowerCase().includes("phone")) {
          setProfileErrors((prev) => ({ ...prev, phone: result.error }));
        } else if (result.error.toLowerCase().includes("email")) {
          setProfileErrors((prev) => ({ ...prev, email: result.error }));
        } else if (result.error.toLowerCase().includes("name")) {
          setProfileErrors((prev) => ({ ...prev, name: result.error }));
        } else {
          // Default: try to determine field from error message
          const lowerError = result.error.toLowerCase();
          if (lowerError.includes("phone number")) {
            setProfileErrors((prev) => ({ ...prev, phone: result.error }));
          } else if (lowerError.includes("email")) {
            setProfileErrors((prev) => ({ ...prev, email: result.error }));
          } else {
            // Generic error - don't assign to any specific field
            setProfileErrors((prev) => ({ ...prev, email: result.error }));
          }
        }
        return;
      }

      // Update user state and localStorage
      setUser(result.user);
      localStorage.setItem("user", JSON.stringify(result.user));
      setIsEditingProfile(false);
      showToast.success(
        "Profile updated",
        "Your profile has been updated successfully"
      );
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast.error("Update failed", "An error occurred. Please try again.");
      setProfileErrors((prev) => ({
        ...prev,
        email: "An error occurred. Please try again.",
      }));
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleCancelProfile = () => {
    if (user) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
    setProfileErrors({ name: "", email: "", phone: "" });
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
    } else if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)
    ) {
      errors.newPassword =
        "Password must contain uppercase, lowercase, and number";
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setPasswordErrors(errors);
    return (
      !errors.currentPassword && !errors.newPassword && !errors.confirmPassword
    );
  };

  const handleChangePassword = async () => {
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
        // Show error toast
        showToast.error(
          "Password update failed",
          result.error || "Failed to update password"
        );

        if (result.error.includes("Current password")) {
          setPasswordErrors((prev) => ({
            ...prev,
            currentPassword: result.error,
          }));
        } else if (result.error.includes("New password")) {
          setPasswordErrors((prev) => ({
            ...prev,
            newPassword: result.error,
          }));
        } else {
          setPasswordErrors((prev) => ({
            ...prev,
            newPassword: result.error,
          }));
        }
        return;
      }

      // Reset password form
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsChangingPassword(false);
      showToast.success(
        "Password updated",
        "Your password has been changed successfully"
      );
    } catch (error) {
      console.error("Error changing password:", error);
      showToast.error(
        "Password update failed",
        "An error occurred. Please try again."
      );
      setPasswordErrors((prev) => ({
        ...prev,
        newPassword: "An error occurred. Please try again.",
      }));
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
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Settings"
          subtitle="Manage your profile and account settings"
        />

        {/* Profile Section */}
        <div className="border rounded-lg p-6 bg-card mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Profile</h2>
            {!isEditingProfile ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingProfile(true)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelProfile}
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

          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <Avatar name={user?.name || "Admin"} size="lg" />
              <p className="text-sm text-muted-foreground mt-2 text-center md:text-left">
                {user?.name}
              </p>
            </div>

            {/* Profile Form */}
            <div className="flex-1 space-y-4">
              <TextField
                label="Name"
                value={profileData.name}
                onChange={(e) => handleProfileChange("name", e.target.value)}
                placeholder="Enter your name"
                disabled={!isEditingProfile}
                error={profileErrors.name}
                required
              />

              <TextField
                label="Email"
                type="email"
                value={profileData.email}
                onChange={(e) => handleProfileChange("email", e.target.value)}
                placeholder="Enter your email"
                disabled={!isEditingProfile}
                error={profileErrors.email}
                required
              />

              <TextField
                label="Phone"
                type="tel"
                value={profileData.phone}
                onChange={(e) => handleProfileChange("phone", e.target.value)}
                placeholder="Enter your phone number"
                disabled={!isEditingProfile}
                error={profileErrors.phone}
                helperText="Optional"
              />
            </div>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold">Change Password</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Update your password to keep your account secure
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
                  onClick={handleChangePassword}
                  disabled={loadingPassword}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {loadingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            )}
          </div>

          {isChangingPassword && (
            <div className="space-y-4 max-w-md">
              <PasswordInput
                label="Current Password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  handlePasswordChange("currentPassword", e.target.value)
                }
                placeholder="Enter current password"
                disabled={loadingPassword}
                error={passwordErrors.currentPassword}
                required
              />

              <PasswordInput
                label="New Password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  handlePasswordChange("newPassword", e.target.value)
                }
                placeholder="Enter new password"
                disabled={loadingPassword}
                error={passwordErrors.newPassword}
                helperText="Must be at least 8 characters with uppercase, lowercase, and number"
                required
              />

              <PasswordInput
                label="Confirm New Password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  handlePasswordChange("confirmPassword", e.target.value)
                }
                placeholder="Confirm new password"
                disabled={loadingPassword}
                error={passwordErrors.confirmPassword}
                required
              />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
