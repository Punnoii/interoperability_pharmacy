"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Key, Loader2, Pencil, User as UserIcon } from "lucide-react";
import Header from "@/components/layout/Header";
import StatBox from "@/components/profile/StatBox";
import EditNameModal from "@/components/profile/EditNameModal";
import ChangePasswordModal from "@/components/profile/ChangePasswordModal";
import BookmarksSection from "@/components/profile/BookmarksSection";
import HistorySection from "@/components/profile/HistorySection";
import SavedConfigSection from "@/components/profile/SavedConfigSection";
import { useDarkMode } from "@/lib/useDarkMode";
import { getHistory, type HistoryEntry } from "@/lib/queryHistory";
import { APP_CONFIG } from "@/lib/config";

const { routes } = APP_CONFIG.api;

type Tab = "bookmarks" | "history" | "config";

interface User {
  id: string;
  username: string | null;
  email: string | null;
  role: string;
}

interface Bookmark {
  id: string;
  name: string;
  createdAt: string;
}

interface SavedConfig {
  exists: boolean;
  fileCount: number;
  files: { filename: string; size: number; modifiedAt: number }[];
}

const EMPTY_CONFIG: SavedConfig = { exists: false, fileCount: 0, files: [] };

// account page, profile card + a three-way tab (bookmarks / history / saved upload config)
export default function ProfilePage() {
  const [isDark, setIsDark] = useDarkMode();
  const [user, setUser] = useState<User | null>(null);
  const [totalSaved, setTotalSaved] = useState(0);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [config, setConfig] = useState<SavedConfig>(EMPTY_CONFIG);
  const [tab, setTab] = useState<Tab>("bookmarks");
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  // pull user + bookmarks + saved config together; each response is optional-ok so one failure doesn't blank the page
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [me, bm, cfg] = await Promise.all([
        fetch(routes.me, { cache: "no-store" }),
        fetch(routes.bookmarks, { cache: "no-store" }),
        fetch(routes.profileConfig, { cache: "no-store" }),
      ]);
      if (me.ok) {
        const data = await me.json();
        setUser(data.user);
        setTotalSaved(data.stats?.totalSavedQueries ?? 0);
      }
      if (bm.ok) {
        const data = await bm.json();
        setBookmarks(Array.isArray(data.bookmarks) ? data.bookmarks : []);
      }
      if (cfg.ok) setConfig(await cfg.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    setHistory(getHistory()); // history is local-only, read straight from the store
  }, [loadAll]);

  const bg = isDark ? "bg-slate-950 text-slate-100" : "bg-gray-50 text-gray-900";
  const card = isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200";
  const heading = isDark ? "text-slate-100" : "text-gray-900";
  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const backLink = isDark ? "text-slate-400 hover:text-slate-100" : "text-gray-500 hover:text-gray-900";
  const avatarBg = isDark ? "bg-slate-800" : "bg-blue-50";
  const editBtn = isDark
    ? "border-slate-700 text-slate-200 hover:bg-slate-800"
    : "border-gray-200 text-gray-700 hover:bg-gray-50";
  const pwBtn = isDark
    ? "border-blue-700/50 text-blue-300 hover:bg-blue-900/30"
    : "border-blue-200 text-blue-600 hover:bg-blue-50";

  return (
    <div className={`flex flex-col min-h-screen ${bg}`}>
      <Header isDark={isDark} setIsDark={setIsDark} />

      <main className="flex-1 px-6 py-8 max-w-6xl w-full mx-auto">
        <Link href="/homepage" className={`inline-flex items-center gap-2 text-sm font-medium mb-4 transition-colors ${backLink}`}>
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
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${avatarBg}`}>
                  <UserIcon size={56} className="text-blue-500" strokeWidth={1.5} />
                </div>
                <h2 className={`text-xl font-semibold mt-2 ${heading}`}>{user?.username ?? "—"}</h2>
                <p className={`text-sm ${muted}`}>{user?.email ?? "—"}</p>
              </div>

              <button
                onClick={() => setEditingName(true)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors mb-3 ${editBtn}`}
              >
                <Pencil size={14} />
                <span>Edit Name</span>
              </button>

              <hr className={`my-2 ${isDark ? "border-slate-800" : "border-gray-200"}`} />

              <button
                onClick={() => setChangingPw(true)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors mt-3 ${pwBtn}`}
              >
                <Key size={14} />
                <span>Change Password</span>
              </button>
            </section>

            <section className="lg:col-span-2 flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatBox isDark={isDark} label="Total Query" value={totalSaved} active={tab === "bookmarks"} onClick={() => setTab("bookmarks")} />
                <StatBox isDark={isDark} label="Query History" value={history.length} active={tab === "history"} onClick={() => setTab("history")} />
                <StatBox isDark={isDark} label="Save Config" value={config.fileCount} active={tab === "config"} onClick={() => setTab("config")} />
              </div>

              <div className={`rounded-2xl border p-6 ${card} min-h-[400px]`}>
                {tab === "bookmarks" && <BookmarksSection isDark={isDark} bookmarks={bookmarks} />}
                {tab === "history" && <HistorySection isDark={isDark} history={history} />}
                {tab === "config" && (
                  <SavedConfigSection
                    isDark={isDark}
                    data={config}
                    onDeleted={() => setConfig(EMPTY_CONFIG)}
                  />
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {editingName && user && (
        <EditNameModal
          isDark={isDark}
          currentName={user.username ?? ""}
          onClose={() => setEditingName(false)}
          onSaved={(next) => {
            setUser((u) => (u ? { ...u, username: next } : u));
            setEditingName(false);
          }}
        />
      )}

      {changingPw && (
        <ChangePasswordModal
          isDark={isDark}
          onClose={() => setChangingPw(false)}
          onSaved={() => setChangingPw(false)}
        />
      )}
    </div>
  );
}
