"use client";

import Link from "next/link";
import { Moon, Sun, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import NotificationBell from "@/components/layout/NotificationBell";

interface HeaderProps {
  isDark: boolean;
  setIsDark: (val: boolean) => void;
}

export default function Header({ isDark, setIsDark }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header
      className={`h-14 flex items-center justify-between px-6 border-b ${isDark
        ? "bg-slate-900 border-slate-800 text-slate-100"
        : "bg-white border-gray-200 text-gray-800"
        }`}
    >
      <Link
        href="/homepage"
        aria-label="Go to homepage"
        className="text-xl font-bold tracking-tight text-blue-600 hover:text-blue-700 transition-colors"
      >
        RxVKG
      </Link>

      <div className="flex items-center gap-2">
        <NotificationBell isDark={isDark} />

        <IconButton isDark={isDark} aria-label="Toggle theme" onClick={() => setIsDark(!isDark)}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </IconButton>

        {user && (
          <span
            className={`text-sm font-medium px-2 hidden sm:block ${isDark ? "text-slate-300" : "text-gray-600"
              }`}
          >
            {user.username}
          </span>
        )}

        <Link
          href="/profile"
          aria-label="My Profile"
          title="My Profile"
          className="w-9 h-9 flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          <User size={18} />
        </Link>
      </div>
    </header>
  );
}

function IconButton({
  isDark,
  children,
  onClick,
  className,
  ...rest
}: {
  isDark: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  "aria-label": string;
}) {
  return (
    <button
      onClick={onClick}
      {...rest}
      className={`w-9 h-9 flex items-center justify-center rounded-md transition-colors ${className
        ? className
        : (isDark
          ? "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800")
        }`}
    >
      {children}
    </button>
  );
}
