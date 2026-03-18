"use client";

import { useState } from "react";
import { Bell, Sun, Moon, User } from "lucide-react";

export default function Header() {
  const [isDark, setIsDark] = useState(false);

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-white/95 backdrop-blur border-b border-black/[0.08] shadow-sm z-10">
      {/* Brand */}
      <span className="text-2xl font-bold tracking-tight select-none"
        style={{
          background: "linear-gradient(135deg, #2196f3 0%, #1976d2 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
        RxVKG
      </span>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Notification */}
        <button
          aria-label="Notifications"
          className="w-9 h-9 flex items-center justify-center rounded-lg border-none bg-transparent text-gray-500 hover:bg-black/5 hover:text-gray-800 transition-all duration-200 cursor-pointer"
        >
          <Bell size={20} />
        </button>

        {/* Dark mode toggle */}
        <button
          aria-label="Toggle theme"
          onClick={() => setIsDark(!isDark)}
          className="w-9 h-9 flex items-center justify-center rounded-lg border-none bg-transparent text-gray-500 hover:bg-black/5 hover:text-gray-800 transition-all duration-200 cursor-pointer"
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
