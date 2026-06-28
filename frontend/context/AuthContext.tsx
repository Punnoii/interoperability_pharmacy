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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch(routes.authMe)
      .then((res) => {
        if (res.ok) {
          res.json().then((data) => setUser(data.user));
        }
      })
      .catch(() => {});
  }, []);

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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
