"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
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
 * This allows the Next.js middleware to check auth state.
 */
function syncAuthCookie() {
  if (typeof document === "undefined") return;

  if (pb.authStore.isValid) {
    // Set cookie with auth data for middleware
    const cookieValue = JSON.stringify({
      token: pb.authStore.token,
      record: pb.authStore.record,
    });
    // Set cookie to expire in 7 days (matching PocketBase default)
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `pb_auth=${encodeURIComponent(cookieValue)}; path=/; expires=${expires}; SameSite=Lax`;
  } else {
    // Clear the cookie
    document.cookie = "pb_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}

// ============================================
// Auth Provider
// ============================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsersRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state from PocketBase authStore
  useEffect(() => {
    // Check if there's a valid auth session
    if (pb.authStore.isValid && pb.authStore.record) {
      setUser(pb.authStore.record as UsersRecord);
    }
    // Sync cookie on initial load
    syncAuthCookie();
    setIsLoading(false);

    // Listen for auth changes (including from other tabs)
    const unsubscribe = pb.authStore.onChange((token, record) => {
      setUser(record as UsersRecord | null);
      // Sync cookie whenever auth changes
      syncAuthCookie();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Refresh user data from server
  const refreshUser = useCallback(async () => {
    if (pb.authStore.isValid) {
      try {
        const authData = await pb.collection("users").authRefresh();
        setUser(authData.record as UsersRecord);
      } catch {
        // Token is invalid, clear auth
        pb.authStore.clear();
        setUser(null);
      }
    }
  }, []);

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
  const register = useCallback(async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    try {
      await auth.registerWithEmail(email, password, name);
      // After registration, user is auto-logged in
      setUser(pb.authStore.record as UsersRecord);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
