"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { APP_CONFIG } from "@/lib/config";

const { routes } = APP_CONFIG.api;

interface User {
  id: string;
  email: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// holds the signed-in user for the whole app; wraps everything in RootLayout
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // rehydrate the session once on mount from the auth cookie; stay null (guest) if it fails
  useEffect(() => {
    fetch(routes.authMe)
      .then((res) => {
        if (res.ok) {
          res.json().then((data) => setUser(data.user));
        }
      })
      .catch(() => {});
  }, []);

  // clear the cookie server-side, drop local state, hard-nav home so nothing stale lingers
  const logout = async () => {
    try {
      await fetch(routes.authLogout, { method: "POST" });
      setUser(null);
      window.location.href = "/";
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// grab auth state anywhere; throws if you forgot the provider
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
