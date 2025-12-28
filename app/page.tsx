"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { PasswordInput } from "@/components/ui/password-input";
import { showToast } from "@/lib/toast";

interface ApiResponse {
  message: string;
  timestamp: string;
  dbStatus: string;
}

type LoginType = "admin" | "team";

export default function Home() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<LoginType>("admin");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [emailOrPhoneError, setEmailOrPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [adminInitialized, setAdminInitialized] = useState(false);

  useEffect(() => {
    fetchTestAPI();
    checkAdmin();
  }, []);

  const fetchTestAPI = async () => {
    try {
      setStatusLoading(true);
      const response = await fetch("/api/test");

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const result: ApiResponse = await response.json();
      setData(result);
    } catch (err) {
      console.error("Status fetch error:", err);
    } finally {
      setStatusLoading(false);
    }
  };

  const checkAdmin = async () => {
    try {
      const response = await fetch("/api/init/admin", { method: "POST" });
      if (response.ok) {
        setAdminInitialized(true);
      }
    } catch (error) {
      console.error("Error initializing admin:", error);
    }
  };

  const handleInitAdmin = async () => {
    try {
      const response = await fetch("/api/init/admin", { method: "POST" });
      const result = await response.json();
      if (response.ok) {
        alert(
          `Admin created successfully!\nEmail: ${result.credentials.email}\nPassword: ${result.credentials.password}`
        );
        setAdminInitialized(true);
      } else {
        alert(result.message || "Failed to create admin");
      }
    } catch (error) {
      alert("An error occurred");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailOrPhoneError("");
    setPasswordError("");
    setLoading(true);

    // Client-side validation
    let hasError = false;

    if (!emailOrPhone.trim()) {
      setEmailOrPhoneError("Email or phone is required");
      hasError = true;
    } else {
      // Basic format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex =
        /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
      const cleanedPhone = emailOrPhone.replace(/[\s-]/g, "");

      if (!emailRegex.test(emailOrPhone) && !phoneRegex.test(emailOrPhone)) {
        setEmailOrPhoneError("Invalid email or phone format");
        hasError = true;
      }
    }

    if (!password) {
      setPasswordError("Password is required");
      hasError = true;
    }

    if (hasError) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailOrPhone,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.error || "Login failed";

        // Show error toast
        if (errorMessage.toLowerCase().includes("locked")) {
          showToast.warning("Account locked", errorMessage);
        } else if (errorMessage.toLowerCase().includes("too many")) {
          showToast.warning("Too many attempts", errorMessage);
        } else {
          showToast.error("Login failed", errorMessage);
        }

        // Parse error to determine which field
        if (
          errorMessage.toLowerCase().includes("email") ||
          errorMessage.toLowerCase().includes("phone") ||
          errorMessage.toLowerCase().includes("format") ||
          errorMessage.toLowerCase().includes("invalid input")
        ) {
          setEmailOrPhoneError(errorMessage);
        } else if (errorMessage.toLowerCase().includes("password")) {
          setPasswordError(errorMessage);
        } else if (
          errorMessage.toLowerCase().includes("credentials") ||
          errorMessage.toLowerCase().includes("invalid")
        ) {
          // For generic credential errors, show on both or password field
          setPasswordError(errorMessage);
        } else if (errorMessage.toLowerCase().includes("locked")) {
          setEmailOrPhoneError(errorMessage);
        } else if (errorMessage.toLowerCase().includes("too many")) {
          setEmailOrPhoneError(errorMessage);
        } else {
          // Default to email/phone field for unknown errors
          setEmailOrPhoneError(errorMessage);
        }

        setLoading(false);
        return;
      }

      // Check role matches login type
      if (loginType === "admin" && result.user.role !== "admin") {
        showToast.warning(
          "Invalid account type",
          "This is not an admin account"
        );
        setEmailOrPhoneError("This is not an admin account");
        setLoading(false);
        return;
      }

      if (loginType === "team" && result.user.role !== "field_team") {
        showToast.warning(
          "Invalid account type",
          "This is not a team member account"
        );
        setEmailOrPhoneError("This is not a team member account");
        setLoading(false);
        return;
      }

      // Store token and user data
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));

      // Show success toast
      showToast.success(
        "Login successful!",
        `Welcome back, ${result.user.name || "User"}`
      );

      // Redirect based on role
      if (result.user.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/team/dashboard");
      }
    } catch (err) {
      showToast.error(
        "Login failed",
        "An unexpected error occurred. Please try again."
      );
      setEmailOrPhoneError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Bhajan CRM
            </h1>
            <p className="text-muted-foreground">
              Customer Relationship Management
            </p>
          </div>

          {/* Login Card */}
          <div className="w-full max-w-md">
            <div className="bg-card border rounded-2xl shadow-lg p-8">
              {/* Tab Selection */}
              <div className="flex gap-2 mb-6 bg-muted p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setLoginType("admin");
                    setEmailOrPhoneError("");
                    setPasswordError("");
                    setEmailOrPhone("");
                    setPassword("");
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                    loginType === "admin"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Admin Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginType("team");
                    setEmailOrPhoneError("");
                    setPasswordError("");
                    setEmailOrPhone("");
                    setPassword("");
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                    loginType === "team"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Team Login
                </button>
              </div>

              {/* Form Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-1">
                  {loginType === "admin"
                    ? "Admin Access"
                    : "Team Member Access"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {loginType === "admin"
                    ? "Management team login"
                    : "Field team member login"}
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <TextField
                  label="Email or Phone"
                  type="text"
                  value={emailOrPhone}
                  onChange={(e) => {
                    setEmailOrPhone(e.target.value);
                    if (emailOrPhoneError) setEmailOrPhoneError("");
                  }}
                  placeholder={
                    loginType === "admin"
                      ? "admin@bhajan.com"
                      : "Enter email or phone number"
                  }
                  required
                  disabled={loading}
                  error={emailOrPhoneError}
                  helperText={
                    !emailOrPhoneError
                      ? "You can login with either email or phone number"
                      : undefined
                  }
                />

                <PasswordInput
                  label="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  error={passwordError}
                />

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>

              {/* Admin Initialization */}
              {!adminInitialized && loginType === "admin" && (
                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                    Admin user not initialized
                  </p>
                  <Button
                    onClick={handleInitAdmin}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Initialize Admin User
                  </Button>
                </div>
              )}
            </div>

            {/* System Status Card */}
            <div className="mt-6 bg-card border rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">System Status</h3>
                <Button
                  onClick={fetchTestAPI}
                  disabled={statusLoading}
                  variant="ghost"
                  size="sm"
                >
                  {statusLoading ? "Loading..." : "Refresh"}
                </Button>
              </div>

              {data && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium">{data.message}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Database:</span>
                    <span
                      className={
                        data.dbStatus === "connected"
                          ? "text-green-600 font-medium"
                          : "text-destructive font-medium"
                      }
                    >
                      {data.dbStatus}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
