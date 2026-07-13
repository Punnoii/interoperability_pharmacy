"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Bell,
  Check,
  Trash2,
  X,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNotifications, type NotificationType } from "@/lib/notifications";
import { timeAgo } from "@/lib/format";

// no-op store for useSyncExternalStore, we only use it to detect client-side mount (see below)
const emptySubscribe = () => () => {};

// icon + color per notification severity
const TYPE_META: Record<NotificationType, { Icon: LucideIcon; light: string; dark: string }> = {
  info: { Icon: Info, light: "text-blue-600", dark: "text-blue-400" },
  success: { Icon: CheckCircle2, light: "text-emerald-600", dark: "text-emerald-400" },
  warning: { Icon: AlertTriangle, light: "text-amber-600", dark: "text-amber-400" },
  error: { Icon: AlertCircle, light: "text-red-600", dark: "text-red-400" },
};

// bell + dropdown backed by the zustand notifications store. handles unread badge, mark-read,
// dismiss, and closing on outside-click / escape.
export default function NotificationBell({ isDark }: { isDark: boolean }) {
  const items = useNotifications((s) => s.items);
  const markRead = useNotifications((s) => s.markRead);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const remove = useNotifications((s) => s.remove);
  const clear = useNotifications((s) => s.clear);
  const seedOnce = useNotifications((s) => s.seedOnce);

  const [open, setOpen] = useState(false);
  // false during SSR/first paint, true once hydrated, gates the unread count so server and client
  // markup match and we don't get a hydration mismatch on a persisted count
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    seedOnce();
  }, [seedOnce]);

  // close on click-outside / escape, only while the dropdown is open
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = mounted ? items.filter((i) => !i.read).length : 0;

  const btnCls = isDark
    ? "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
    : "text-gray-500 hover:bg-gray-100 hover:text-gray-800";
  const panel = isDark
    ? "bg-slate-900 border-slate-700 text-slate-100"
    : "bg-white border-gray-200 text-gray-800";
  const divider = isDark ? "border-slate-800" : "border-gray-200";
  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const rowHover = isDark ? "hover:bg-slate-800/60" : "hover:bg-gray-50";
  const unreadBg = isDark ? "bg-slate-800/40" : "bg-blue-50/60";

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`relative w-9 h-9 flex items-center justify-center rounded-md transition-colors ${btnCls}`}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute right-0 mt-2 w-80 max-w-[90vw] rounded-lg border shadow-lg z-50 ${panel}`}>
          <div className={`flex items-center justify-between px-3 py-2 border-b ${divider}`}>
            <span className="text-sm font-semibold">
              Notifications{unread > 0 ? ` (${unread})` : ""}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={markAllRead}
                disabled={unread === 0}
                title="Mark all as read"
                className={`p-1 rounded transition-colors disabled:opacity-40 ${rowHover}`}
              >
                <Check size={15} />
              </button>
              <button
                type="button"
                onClick={clear}
                disabled={items.length === 0}
                title="Clear all"
                className={`p-1 rounded transition-colors disabled:opacity-40 ${rowHover}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className={`flex flex-col items-center justify-center gap-2 py-10 ${muted}`}>
                <Bell size={26} strokeWidth={1.3} />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              items.map((n) => {
                const meta = TYPE_META[n.type];
                const Icon = meta.Icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`group flex gap-2.5 px-3 py-2.5 border-b cursor-pointer transition-colors ${divider} ${rowHover} ${n.read ? "" : unreadBg}`}
                  >
                    <Icon size={16} className={`mt-0.5 shrink-0 ${isDark ? meta.dark : meta.light}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${n.read ? "font-medium" : "font-semibold"}`}>
                          {n.title}
                        </p>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                      </div>
                      {n.message && <p className={`text-xs mt-0.5 ${muted}`}>{n.message}</p>}
                      <p className={`text-[11px] mt-1 ${muted}`}>{timeAgo(n.timestamp)}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Dismiss notification"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(n.id);
                      }}
                      className={`opacity-0 group-hover:opacity-100 p-1 rounded self-start transition-opacity ${muted} ${rowHover}`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
