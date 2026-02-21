"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { pb, auth } from "@/lib/pocketbase";
import type { UsersRecord } from "@/lib/pocketbase-types";
import { useRouter } from "next/navigation";

// ============================================
// Types
// ============================================

interface AuthContextType {
  user: UsersRecord | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  loginWithGoogle: () => Promise<void>;
  loginWithGitHub: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// Cookie Sync Helper
// ============================================

/**
 * Sync PocketBase auth with cookies for SSR/middleware support.
 * Uses PocketBase's built-in exportToCookie for correct formatting.
 */
function syncAuthCookie() {
  if (typeof document === "undefined") return;

  if (pb.authStore.isValid && pb.authStore.record) {
    // Use PocketBase's built-in cookie export
    const cookieValue = JSON.stringify({
      token: pb.authStore.token,
      record: {
        id: pb.authStore.record.id,
        email: (pb.authStore.record as UsersRecord).email,
      },
    });
    // Set cookie to expire in 7 days (matching PocketBase default)
    const expires = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toUTCString();
    const secure =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie = `pb_auth=${encodeURIComponent(cookieValue)}; path=/; expires=${expires}; SameSite=Lax${secure}`;
  } else {
    // Clear the cookie
    document.cookie =
      "pb_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}

// Token refresh interval: 6 hours (well before 7-day expiry)
const TOKEN_REFRESH_INTERVAL = 6 * 60 * 60 * 1000;

// ============================================
// Auth Provider
// ============================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsersRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  // Refresh user data from server
  const refreshUser = useCallback(async () => {
    if (pb.authStore.isValid) {
      try {
        const authData = await pb.collection("users").authRefresh();
        setUser(authData.record as UsersRecord);
        syncAuthCookie();
      } catch {
        // Token is invalid, clear auth
        pb.authStore.clear();
        setUser(null);
        syncAuthCookie();
      }
    }
  }, []);

  // Initialize auth state and set up auto-refresh
  useEffect(() => {
    // Check if there's a valid auth session
    if (pb.authStore.isValid && pb.authStore.record) {
      setUser(pb.authStore.record as UsersRecord);
      // Refresh on mount to validate the token is still good
      refreshUser();
    }
    syncAuthCookie();
    setIsLoading(false);

    // Listen for auth changes (including from other tabs)
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record as UsersRecord | null);
      syncAuthCookie();
    });

    // Set up periodic token refresh
    refreshIntervalRef.current = setInterval(() => {
      if (pb.authStore.isValid) {
        refreshUser();
      }
    }, TOKEN_REFRESH_INTERVAL);

    return () => {
      unsubscribe();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [refreshUser]);

  // Login with email and password
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const authData = await auth.loginWithEmail(email, password);
      setUser(authData.record as UsersRecord);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register with email and password
  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      setIsLoading(true);
      try {
        await auth.registerWithEmail(email, password, name);
        // After registration, user is auto-logged in
        setUser(pb.authStore.record as UsersRecord);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Login with Google OAuth
  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      const authData = await auth.loginWithOAuth2("google");
      setUser(authData.record as UsersRecord);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login with GitHub OAuth
  const loginWithGitHub = useCallback(async () => {
    setIsLoading(true);
    try {
      const authData = await auth.loginWithOAuth2("github");
      setUser(authData.record as UsersRecord);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    auth.logout();
    setUser(null);
    syncAuthCookie();
    router.push("/");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user && pb.authStore.isValid,
        login,
        register,
        logout,
        loginWithGoogle,
        loginWithGitHub,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
