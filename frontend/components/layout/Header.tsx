"use client";

import { Bell, Moon, Sun, User } from "lucide-react";

interface HeaderProps {
  isDark: boolean;
  setIsDark: (val: boolean) => void;
}

export default function Header({ isDark, setIsDark }: HeaderProps) {
  return (
    <header
      className={`h-14 flex items-center justify-between px-6 border-b ${
        isDark
          ? "bg-slate-900 border-slate-800 text-slate-100"
          : "bg-white border-gray-200 text-gray-800"
      }`}
    >
      <span className="text-xl font-bold tracking-tight text-blue-600">RxVKG</span>

      <div className="flex items-center gap-2">
        <IconButton isDark={isDark} aria-label="Notifications">
          <Bell size={18} />
        </IconButton>

        <IconButton isDark={isDark} aria-label="Toggle theme" onClick={() => setIsDark(!isDark)}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </IconButton>

        <button
          aria-label="User menu"
          className="w-9 h-9 flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          <User size={18} />
        </button>
      </div>
    </header>
  );
}

function IconButton({
  isDark,
  children,
  onClick,
  ...rest
}: {
  isDark: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  "aria-label": string;
}) {
  return (
    <button
      onClick={onClick}
      {...rest}
      className={`w-9 h-9 flex items-center justify-center rounded-md ${
        isDark
          ? "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}
