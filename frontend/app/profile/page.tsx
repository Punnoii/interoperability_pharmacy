"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Key, Loader2, Pencil, User as UserIcon, X } from "lucide-react";
import Header from "@/components/layout/Header";
import { useDarkMode } from "@/lib/useDarkMode";
import { getHistory, type HistoryEntry } from "@/lib/queryHistory";

type ProfileTab = "bookmarks" | "history";

interface UserInfo {
  id: string;
  username: string | null;
  email: string | null;
  role: string;
  darkMode: boolean;
  createdAt: string;
}
interface Stats {
  totalSavedQueries: number;
}
interface BookmarkRow {
  id: string;
  name: string;
  createdAt: string;
}

export default function ProfilePage() {
  const [isDark, setIsDark] = useDarkMode();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileTab>("bookmarks");
  const [loading, setLoading] = useState(true);

  const [editNameOpen, setEditNameOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, bmRes] = await Promise.all([
        fetch("/api/me", { cache: "no-store" }),
        fetch("/api/bookmarks", { cache: "no-store" }),
      ]);
      if (meRes.ok) {
        const data = await meRes.json();
        setUser(data.user);
        setStats(data.stats);
      }
      if (bmRes.ok) {
        const data = await bmRes.json();
        setBookmarks(Array.isArray(data.bookmarks) ? data.bookmarks : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    setHistory(getHistory());
  }, [loadAll]);

  const bg = isDark
    ? "bg-slate-950 text-slate-100"
    : "bg-gray-50 text-gray-900";
  const card = isDark
    ? "bg-slate-900 border-slate-800"
    : "bg-white border-gray-200";
  const heading = isDark ? "text-slate-100" : "text-gray-900";
  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const subtle = isDark ? "text-slate-300" : "text-gray-700";

  return (
    <div className={`flex flex-col min-h-screen ${bg}`}>
      <Header isDark={isDark} setIsDark={setIsDark} />

      <main className="flex-1 px-6 py-8 max-w-6xl w-full mx-auto">
        <Link
          href="/homepage"
          className={`inline-flex items-center gap-2 text-sm font-medium mb-4 transition-colors ${
            isDark
              ? "text-slate-400 hover:text-slate-100"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>

        <h1 className={`text-3xl font-bold mb-8 ${heading}`} style={{ fontFamily: "Georgia, serif" }}>
          My Profile
        </h1>

        {loading ? (
          <div className={`flex items-center justify-center py-24 ${muted}`}>
            <Loader2 size={20} className="animate-spin mr-2" />
            <span className="text-sm">Loading profile…</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className={`rounded-2xl border p-6 ${card} h-fit`}>
              <div className="flex flex-col items-center gap-2 mb-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  isDark ? "bg-slate-800" : "bg-blue-50"
                }`}>
                  <UserIcon size={56} className="text-blue-500" strokeWidth={1.5} />
                </div>
                <h2 className={`text-xl font-semibold mt-2 ${heading}`}>
                  {user?.username ?? "—"}
                </h2>
                <p className={`text-sm ${muted}`}>{user?.email ?? "—"}</p>
              </div>

              <button
                onClick={() => setEditNameOpen(true)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors mb-3 ${
                  isDark
                    ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Pencil size={14} />
                <span>Edit Name</span>
              </button>

              <hr className={`my-2 ${isDark ? "border-slate-800" : "border-gray-200"}`} />

              <button
                onClick={() => setChangePwOpen(true)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors mt-3 ${
                  isDark
                    ? "border-blue-700/50 text-blue-300 hover:bg-blue-900/30"
                    : "border-blue-200 text-blue-600 hover:bg-blue-50"
                }`}
              >
                <Key size={14} />
                <span>Change Password</span>
              </button>
            </section>

            <section className="lg:col-span-2 flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <StatBox
                  isDark={isDark}
                  label="Total Query"
                  value={stats?.totalSavedQueries ?? 0}
                  active={activeTab === "bookmarks"}
                  onClick={() => setActiveTab("bookmarks")}
                />
                <StatBox
                  isDark={isDark}
                  label="Query History"
                  value={history.length}
                  active={activeTab === "history"}
                  onClick={() => setActiveTab("history")}
                />
              </div>

              <div className={`rounded-2xl border p-6 ${card} min-h-[400px]`}>
                {activeTab === "bookmarks" ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-base font-semibold ${heading}`}>Save Queries</h3>
                      <span className={`text-sm tabular-nums ${muted}`}>{bookmarks.length}</span>
                    </div>
                    {bookmarks.length === 0 ? (
                      <p className={`text-sm italic ${muted} py-12 text-center`}>
                        Don't have any saved queries go to Manual SPARQL mode and click Save
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {bookmarks.map((b) => (
                          <li
                            key={b.id}
                            className={`px-4 py-3 rounded-lg ${
                              isDark ? "bg-slate-800/50" : "bg-gray-100"
                            }`}
                          >
                            <div className={`text-sm font-medium ${subtle}`}>{b.name}</div>
                            <div className={`text-xs mt-0.5 ${muted}`}>
                              {new Date(b.createdAt).toLocaleDateString("en-GB")}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-base font-semibold ${heading}`}>Query History</h3>
                      <span className={`text-sm tabular-nums ${muted}`}>{history.length}</span>
                    </div>
                    {history.length === 0 ? (
                      <p className={`text-sm italic ${muted} py-12 text-center`}>
                        Don't have any history yet. Run some queries on the homepage to see them here.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2 max-h-[520px] overflow-auto">
                        {history.map((h) => (
                          <li
                            key={h.id}
                            className={`px-4 py-3 rounded-lg ${
                              isDark ? "bg-slate-800/50" : "bg-gray-100"
                            }`}
                          >
                            <div className={`text-xs flex items-center gap-2 flex-wrap mb-1 ${muted}`}>
                              <span>{new Date(h.timestamp).toLocaleString("en-GB")}</span>
                              {typeof h.resultCount === "number" && (
                                <>
                                  <span>·</span>
                                  <span className={isDark ? "text-emerald-400" : "text-emerald-600"}>
                                    {h.resultCount} row{h.resultCount === 1 ? "" : "s"}
                                  </span>
                                </>
                              )}
                              {h.error && (
                                <>
                                  <span>·</span>
                                  <span className={isDark ? "text-red-400" : "text-red-600"}>
                                    error
                                  </span>
                                </>
                              )}
                            </div>
                            <pre
                              className={`text-xs font-mono leading-relaxed overflow-x-auto max-h-24 ${
                                isDark ? "text-slate-300" : "text-gray-700"
                              }`}
                            >
                              {h.query.length > 240 ? h.query.slice(0, 240) + "\n..." : h.query}
                            </pre>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {editNameOpen && user && (
        <EditNameModal
          isDark={isDark}
          currentName={user.username ?? ""}
          onClose={() => setEditNameOpen(false)}
          onSaved={(next) => {
            setUser((u) => (u ? { ...u, username: next } : u));
            setEditNameOpen(false);
          }}
        />
      )}
      {changePwOpen && (
        <ChangePasswordModal
          isDark={isDark}
          onClose={() => setChangePwOpen(false)}
          onSaved={() => setChangePwOpen(false)}
        />
      )}
    </div>
  );
}

function StatBox({
  isDark,
  label,
  value,
  active,
  onClick,
}: {
  isDark: boolean;
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  const baseCard = isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200";
  const activeCard = isDark
    ? "bg-blue-900/20 border-blue-700"
    : "bg-blue-50 border-blue-400";
  const card = active ? activeCard : baseCard;
  const headingCls = active
    ? (isDark ? "text-blue-300" : "text-blue-700")
    : (isDark ? "text-slate-200" : "text-gray-700");
  const valueCls = isDark ? "text-slate-100" : "text-gray-900";
  const hover = !active
    ? (isDark ? "hover:bg-slate-800" : "hover:bg-gray-50")
    : "";
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-5 transition-colors text-left w-full cursor-pointer ${card} ${hover}`}
    >
      <p className={`text-sm font-medium mb-3 ${headingCls}`}>{label}</p>
      <p className={`text-3xl font-semibold text-right tabular-nums ${valueCls}`}>{value}</p>
    </button>
  );
}

function EditNameModal({
  isDark,
  currentName,
  onClose,
  onSaved,
}: {
  isDark: boolean;
  currentName: string;
  onClose: () => void;
  onSaved: (next: string) => void;
}) {
  const [value, setValue] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const next = value.trim();
    if (!next) {
      setError("Name cannot be empty");
      return;
    }
    if (next === currentName) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? res.statusText);
        return;
      }
      onSaved(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell isDark={isDark} title="Edit Name" onClose={onClose}>
      <label className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-600"}`}>
        Display Name
      </label>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !saving) handleSave();
        }}
        className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
          isDark
            ? "bg-slate-950 border-slate-700 text-slate-100"
            : "bg-white border-gray-300 text-gray-900"
        }`}
        maxLength={64}
      />
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      <ModalFooter
        isDark={isDark}
        onCancel={onClose}
        onConfirm={handleSave}
        saving={saving}
        confirmLabel="Save"
      />
    </ModalShell>
  );
}

function ChangePasswordModal({
  isDark,
  onClose,
  onSaved,
}: {
  isDark: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!current || !next) {
      setError("Both current and new password are required");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (next !== confirm) {
      setError("Confirmation does not match new password");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? res.statusText);
        return;
      }
      alert("Password changed successfully");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setSaving(false);
    }
  }

  const fieldCls = isDark
    ? "bg-slate-950 border-slate-700 text-slate-100"
    : "bg-white border-gray-300 text-gray-900";
  const labelCls = isDark ? "text-slate-400" : "text-gray-600";

  return (
    <ModalShell isDark={isDark} title="Change Password" onClose={onClose}>
      <label className={`text-xs font-medium ${labelCls}`}>Current Password</label>
      <input
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${fieldCls}`}
      />
      <label className={`text-xs font-medium ${labelCls}`}>New Password (min 8 chars)</label>
      <input
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${fieldCls}`}
      />
      <label className={`text-xs font-medium ${labelCls}`}>Confirm New Password</label>
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !saving) handleSave();
        }}
        className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${fieldCls}`}
      />
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      <ModalFooter
        isDark={isDark}
        onCancel={onClose}
        onConfirm={handleSave}
        saving={saving}
        confirmLabel="Update Password"
      />
    </ModalShell>
  );
}

function ModalShell({
  isDark,
  title,
  onClose,
  children,
}: {
  isDark: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl border shadow-2xl ${
          isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"
        }`}
      >
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDark ? "border-slate-700" : "border-gray-200"
          }`}
        >
          <h3 className={`text-base font-semibold ${isDark ? "text-slate-100" : "text-gray-900"}`}>
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`p-1 rounded ${
              isDark ? "text-slate-400 hover:bg-slate-800" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
function ModalFooter({
  isDark,
  onCancel,
  onConfirm,
  saving,
  confirmLabel,
}: {
  isDark: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  saving: boolean;
  confirmLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2 mt-5">
      <button
        onClick={onCancel}
        disabled={saving}
        className={`px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-60 ${
          isDark
            ? "border-slate-700 text-slate-300 hover:bg-slate-800"
            : "border-gray-300 text-gray-700 hover:bg-gray-100"
        }`}
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : null}
        <span>{saving ? "Saving..." : confirmLabel}</span>
      </button>
    </div>
  );
}
