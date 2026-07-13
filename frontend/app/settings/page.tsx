"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Database,
  Eye,
  GitCompare,
  LogOut,
  Moon,
  Search,
  Sun,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { useDarkMode } from "@/lib/useDarkMode";
import { themeClasses } from "@/lib/themeClasses";
import { useUserPreferences, PREFERENCES_DEFAULTS } from "@/lib/userPreferences";
import { useQueryHistory } from "@/lib/queryHistory";
import { useAuth } from "@/context/AuthContext";
import { APP_CONFIG } from "@/lib/config";
import { truncate } from "@/lib/format";

const { routes } = APP_CONFIG.api;

// settings screen — appearance, display/query prefs, and the destructive data actions
export default function SettingsPage() {
  const [isDark, setIsDark] = useDarkMode();
  const { user, logout } = useAuth();
  const tc = themeClasses(isDark);

  const prefs = useUserPreferences();
  const clearHistory = useQueryHistory((s) => s.clear);
  const historyCount = useQueryHistory((s) => s.entries.length);

  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // nuke the backend SPARQL/ELH caches; busy flag keeps the button from double-firing
  async function handleClearCache() {
    setBusy("cache");
    setStatus(null);
    try {
      const res = await fetch(routes.cacheClear, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setStatus({ kind: "err", msg: `Failed: HTTP ${res.status} ${truncate(text)}` });
        return;
      }
      setStatus({ kind: "ok", msg: "Server cache cleared." });
    } catch (e) {
      setStatus({ kind: "err", msg: e instanceof Error ? e.message : "Network error" });
    } finally {
      setBusy(null);
    }
  }

  // local history only — server never sees this one
  function handleClearHistory() {
    if (!confirm(`Clear all ${historyCount} history entries?`)) return;
    clearHistory();
    setStatus({ kind: "ok", msg: "History cleared." });
  }

  const bg = isDark ? "bg-slate-950 text-slate-100" : "bg-gray-50 text-gray-900";

  return (
    <div className={`flex flex-col min-h-screen ${bg}`}>
      <Header isDark={isDark} setIsDark={setIsDark} />

      <main className="flex-1 px-6 py-8 max-w-4xl w-full mx-auto">
        <Link
          href="/homepage"
          className={`inline-flex items-center gap-2 text-sm font-medium mb-4 ${
            isDark ? "text-slate-400 hover:text-slate-100" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>

        <div className="mb-6">
          <h1 className={`text-3xl font-bold ${tc.heading}`} style={{ fontFamily: "Georgia, serif" }}>
            Settings
          </h1>
        </div>

        {status && (
          <div
            className={`text-sm px-3 py-2 rounded border mb-6 ${tc.inputBg} ${
              status.kind === "ok" ? tc.ok : tc.err
            }`}
          >
            {status.msg}
          </div>
        )}

        <div className="flex flex-col gap-5">
          <Section icon={<Eye size={16} />} title="Appearance" tc={tc}>
            <Row label="Dark mode" hint="Switch between light and dark theme" tc={tc}>
              <Toggle
                isDark={isDark}
                checked={isDark}
                onChange={(v) => setIsDark(v)}
                onIcon={<Moon size={12} />}
                offIcon={<Sun size={12} />}
              />
            </Row>
          </Section>

          <Section icon={<Database size={16} />} title="Display" tc={tc}>
            <Row label="Page size" hint="Rows per page in result tables" tc={tc}>
              <Select
                value={prefs.pageSize}
                onChange={(v) => prefs.update({ pageSize: Number(v) })}
                options={[10, 20, 50, 100]}
                isDark={isDark}
              />
            </Row>
            <Row label="Default LIMIT" hint="Default LIMIT for new SPARQL queries" tc={tc}>
              <NumberInput
                value={prefs.defaultLimit}
                onChange={(v) => prefs.update({ defaultLimit: v })}
                min={1}
                max={1000}
                isDark={isDark}
              />
            </Row>
          </Section>

          <Section icon={<Search size={16} />} title="Autocomplete" tc={tc}>
            <Row label="Threshold" hint={`Minimum similarity score (0–1). Default ${PREFERENCES_DEFAULTS.acThreshold}`} tc={tc}>
              <RangeInput
                value={prefs.acThreshold}
                onChange={(v) => prefs.update({ acThreshold: v })}
                min={0}
                max={1}
                step={0.05}
                isDark={isDark}
              />
            </Row>
            <Row label="Max results" hint="Maximum suggestions shown" tc={tc}>
              <NumberInput
                value={prefs.acMaxResults}
                onChange={(v) => prefs.update({ acMaxResults: v })}
                min={1}
                max={30}
                isDark={isDark}
              />
            </Row>
          </Section>

          <Section icon={<GitCompare size={16} />} title="Query Name Similarity" tc={tc}>
            <Row label="Default threshold" hint={`Filter pairs in Name + ID Similarity. Default ${PREFERENCES_DEFAULTS.simThreshold}`} tc={tc}>
              <RangeInput
                value={prefs.simThreshold}
                onChange={(v) => prefs.update({ simThreshold: v })}
                min={0}
                max={1}
                step={0.05}
                isDark={isDark}
              />
            </Row>
          </Section>

          <Section icon={<Trash2 size={16} />} title="Data" tc={tc}>
            <Row label={`Query history (${historyCount} entries)`} hint="Clear all locally stored query history" tc={tc}>
              <button
                onClick={handleClearHistory}
                disabled={historyCount === 0}
                className="text-xs px-3 py-1.5 rounded font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear history
              </button>
            </Row>
            <Row label="Server cache" hint="Clear SPARQL + ELH caches on the backend" tc={tc}>
              <button
                onClick={handleClearCache}
                disabled={busy === "cache"}
                className="text-xs px-3 py-1.5 rounded font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {busy === "cache" ? "Clearing..." : "Clear server cache"}
              </button>
            </Row>
          </Section>

          <Section icon={<UserIcon size={16} />} title="Account" tc={tc}>
            <Row label={user?.username ?? user?.email ?? "Not signed in"} hint="Manage profile information" tc={tc}>
              <Link
                href="/profile"
                className={`text-xs px-3 py-1.5 rounded border ${tc.btnBase}`}
              >
                Go to profile
              </Link>
            </Row>
            {user && (
              <Row label="Sign out" hint="End your current session" tc={tc}>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium bg-slate-700 text-white hover:bg-slate-800"
                >
                  <LogOut size={12} />
                  <span>Logout</span>
                </button>
              </Row>
            )}
          </Section>
        </div>
      </main>
    </div>
  );
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  tc: ReturnType<typeof themeClasses>;
  children: React.ReactNode;
}

// grouping card with an icon header (Appearance, Display, Data, ...)
function Section({ icon, title, tc, children }: SectionProps) {
  return (
    <section className={`rounded-2xl border ${tc.card}`}>
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${tc.rowDiv}`}>
        <span className="text-blue-600">{icon}</span>
        <h2 className={`text-sm font-bold ${tc.heading}`}>{title}</h2>
      </div>
      <div className="flex flex-col divide-y divide-transparent">
        {children}
      </div>
    </section>
  );
}

interface RowProps {
  label: string;
  hint?: string;
  tc: ReturnType<typeof themeClasses>;
  children: React.ReactNode;
}

// one setting line: label + hint on the left, the control on the right
function Row({ label, hint, tc, children }: RowProps) {
  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-3 border-b last:border-b-0 ${tc.rowDiv}`}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className={`text-sm font-medium ${tc.text}`}>{label}</span>
        {hint && <span className={`text-[11px] ${tc.muted}`}>{hint}</span>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

interface ToggleProps {
  isDark: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
  onIcon?: React.ReactNode;
  offIcon?: React.ReactNode;
}

// hand-rolled switch — the knob slides via an inline left offset instead of a CSS class
function Toggle({ isDark, checked, onChange, onIcon, offIcon }: ToggleProps) {
  const trackBg = checked
    ? "bg-blue-600"
    : isDark
      ? "bg-slate-700"
      : "bg-gray-200";
  const borderCls = isDark ? "border-slate-800" : "border-gray-200";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{ width: 48, height: 24 }}
      className={`relative shrink-0 rounded-full border transition-colors duration-200 ${trackBg} ${borderCls}`}
    >
      <span
        style={{
          width: 18,
          height: 18,
          top: 2,
          left: checked ? 26 : 2,
          transition: "left 200ms ease",
        }}
        className={`absolute rounded-full bg-white flex items-center justify-center text-blue-600 shadow border ${borderCls}`}
      >
        {checked ? onIcon : offIcon}
      </span>
    </button>
  );
}

interface SelectProps {
  value: number;
  onChange: (v: string) => void;
  options: number[];
  isDark: boolean;
}

// plain themed dropdown (page size, etc.)
function Select({ value, onChange, options, isDark }: SelectProps) {
  const cls = isDark
    ? "bg-slate-900 border-slate-700 text-slate-100"
    : "bg-white border-gray-300 text-gray-900";
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`text-xs px-2 py-1.5 rounded border ${cls}`}
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

interface NumberInputProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  isDark: boolean;
}

// number field that clamps to [min,max] and ignores non-numeric input
function NumberInput({ value, onChange, min, max, isDark }: NumberInputProps) {
  const cls = isDark
    ? "bg-slate-900 border-slate-700 text-slate-100"
    : "bg-white border-gray-300 text-gray-900";
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
      }}
      className={`w-20 text-xs px-2 py-1.5 rounded border ${cls}`}
    />
  );
}

interface RangeInputProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  isDark: boolean;
}

// slider + live readout for the 0–1 threshold settings
function RangeInput({ value, onChange, min, max, step, isDark }: RangeInputProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-32 accent-blue-600"
      />
      <span className={`text-xs font-mono tabular-nums w-10 text-right ${isDark ? "text-slate-300" : "text-gray-700"}`}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}
