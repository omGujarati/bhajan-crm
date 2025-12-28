/**
 * Security validation utilities
 */

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Phone validation regex (supports international formats)
const PHONE_REGEX =
  /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;

// Strong password requirements: min 8 chars, at least one uppercase, one lowercase, one number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

// Dangerous characters that could be used for injection
const DANGEROUS_CHARS = /[<>'"&;(){}[\]\\|`~]/;

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  if (email.length > 254) return false; // RFC 5321 limit
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;
  // Remove spaces and dashes for validation
  const cleaned = phone.replace(/[\s-]/g, "");
  if (cleaned.length < 10 || cleaned.length > 15) return false; // International phone length
  return PHONE_REGEX.test(phone.trim());
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  if (!password || typeof password !== "string") return false;
  if (password.length < 8) return false;
  if (password.length > 128) return false; // Prevent DoS
  return PASSWORD_REGEX.test(password);
}

/**
 * Sanitize input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return "";

  // Remove dangerous characters
  let sanitized = input.replace(DANGEROUS_CHARS, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length to prevent DoS
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500);
  }

  return sanitized;
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== "string") return "";
  return email.trim().toLowerCase().substring(0, 254);
}

/**
 * Sanitize phone input
 */
export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== "string") return "";
  // Remove all non-digit characters except +
  return phone.replace(/[^\d+]/g, "").substring(0, 15);
}

/**
 * Check if input contains SQL injection patterns
 */
export function containsSQLInjection(input: string): boolean {
  if (!input || typeof input !== "string") return false;
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/i,
    /(--|#|\/\*|\*\/|;)/,
    /(\bOR\b.*=.*=)/i,
    /(\bAND\b.*=.*=)/i,
  ];
  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Check if input contains XSS patterns
 */
export function containsXSS(input: string): boolean {
  if (!input || typeof input !== "string") return false;
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick=, onerror=, etc.
    /<img[^>]+src[^>]*=.*javascript:/gi,
  ];
  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Validate and sanitize email or phone input
 */
export function validateEmailOrPhone(input: string): {
  isValid: boolean;
  type: "email" | "phone" | null;
  sanitized: string;
  error?: string;
} {
  if (!input || typeof input !== "string") {
    return {
      isValid: false,
      type: null,
      sanitized: "",
      error: "Input is required",
    };
  }

  const trimmed = input.trim();

  // Check for injection attempts
  if (containsSQLInjection(trimmed) || containsXSS(trimmed)) {
    return {
      isValid: false,
      type: null,
      sanitized: "",
      error: "Invalid input format",
    };
  }

  // Check if it's an email
  if (isValidEmail(trimmed)) {
    return {
      isValid: true,
      type: "email",
      sanitized: sanitizeEmail(trimmed),
    };
  }

  // Check if it's a phone
  if (isValidPhone(trimmed)) {
    return {
      isValid: true,
      type: "phone",
      sanitized: sanitizePhone(trimmed),
    };
  }

  return {
    isValid: false,
    type: null,
    sanitized: "",
    error: "Invalid email or phone format",
  };
}

/**
 * Rate limiting storage (in-memory for now, can be moved to Redis in production)
 */
const loginAttempts = new Map<
  string,
  { count: number; lastAttempt: number; lockedUntil?: number }
>();

/**
 * Check if IP/identifier is rate limited
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil?: number;
} {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (!record) {
    return { allowed: true, remainingAttempts: maxAttempts };
  }

  // Check if account is locked
  if (record.lockedUntil && now < record.lockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: record.lockedUntil,
    };
  }

  // Reset if window has passed
  if (now - record.lastAttempt > windowMs) {
    loginAttempts.delete(identifier);
    return { allowed: true, remainingAttempts: maxAttempts };
  }

  // Check if max attempts reached
  if (record.count >= maxAttempts) {
    const lockDuration = 30 * 60 * 1000; // 30 minutes
    const lockedUntil = now + lockDuration;
    loginAttempts.set(identifier, {
      ...record,
      lockedUntil,
    });
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil,
    };
  }

  return {
    allowed: true,
    remainingAttempts: maxAttempts - record.count,
  };
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(identifier: string): void {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (record) {
    loginAttempts.set(identifier, {
      count: record.count + 1,
      lastAttempt: now,
      lockedUntil: record.lockedUntil,
    });
  } else {
    loginAttempts.set(identifier, {
      count: 1,
      lastAttempt: now,
    });
  }
}

/**
 * Clear failed attempts (on successful login)
 */
export function clearFailedAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
  // Check various headers for IP (considering proxies)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP.trim();
  }

  return "unknown";
}
