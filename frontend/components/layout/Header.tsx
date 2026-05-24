"use client";

import { Bell, Sun, Moon, User } from "lucide-react";

interface HeaderProps {
  isDark: boolean;
  setIsDark: (val: boolean) => void;
}

export default function Header({ isDark, setIsDark }: HeaderProps) {
  return (
    <header
      className="h-14 flex items-center justify-between px-6 z-10 transition-colors duration-300"
      style={{
        background: isDark
          ? "rgba(15,23,42,0.95)"
          : "rgba(255,255,255,0.95)",
        backdropFilter: "blur(10px)",
        borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
        boxShadow: isDark ? "0 1px 12px rgba(0,0,0,0.4)" : "0 1px 6px rgba(0,0,0,0.06)",
      }}
    >
      {/* Brand */}
      <span
        className="text-2xl font-bold tracking-tight select-none"
        style={{
          background: "linear-gradient(135deg, #2196f3 0%, #1976d2 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        RxVKG
      </span>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Notification */}
        <button
          aria-label="Notifications"
          className="w-9 h-9 flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer transition-all duration-200"
          style={{ color: isDark ? "#94a3b8" : "#6b7280" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
            (e.currentTarget as HTMLElement).style.color = isDark ? "#e2e8f0" : "#1f2937";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "";
            (e.currentTarget as HTMLElement).style.color = isDark ? "#94a3b8" : "#6b7280";
          }}
        >
          <Bell size={20} />
        </button>

        {/* Dark mode toggle */}
        <button
          aria-label="Toggle theme"
          onClick={() => setIsDark(!isDark)}
          className="w-9 h-9 flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer transition-all duration-200"
          style={{ color: isDark ? "#facc15" : "#6b7280" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
            (e.currentTarget as HTMLElement).style.color = isDark ? "#fde68a" : "#1f2937";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "";
            (e.currentTarget as HTMLElement).style.color = isDark ? "#facc15" : "#6b7280";
          }}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* User avatar */}
        <button
          aria-label="User menu"
          className="w-9 h-9 flex items-center justify-center rounded-lg border-none text-white cursor-pointer transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "linear-gradient(135deg, #2196f3 0%, #1976d2 100%)",
            boxShadow: "0 2px 8px rgba(33,150,243,0.3)",
          }}
        >
          <User size={20} />
        </button>
      </div>
    </header>
  );
}
