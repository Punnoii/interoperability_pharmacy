"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

// landing page for the emailed reset link (?token=...), set a new password
export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // pull the token out of the URL client-side; empty token, we show the "bad link" state below
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // cheap client check before we bother the server
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reset failed");
      setDone(true);
      setTimeout(() => router.push("/"), 2500); // let them read the success note, then send to login
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fe] flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl p-8 sm:p-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8">
          <ArrowLeft size={16} /> Back to sign in
        </Link>

        <h1 className="text-2xl font-bold text-gray-800 mb-2 tracking-tight">Set a new password</h1>
        <p className="text-gray-500 text-sm mb-8">Choose a new password for your account.</p>

        {done ? (
          <div className="space-y-4">
            <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl">
              Password updated. Redirecting you to sign in…
            </div>
            <Link href="/" className="block text-center text-[#365bce] font-bold text-sm hover:underline">
              Sign in now
            </Link>
          </div>
        ) : !token ? (
          <div className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-xl text-center">
            Missing or invalid reset link. Please request a new one from{" "}
            <Link href="/forgot-password" className="font-bold hover:underline">
              Forgot password
            </Link>
            .
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-xl text-center">{error}</div>
            )}
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-[#fafafa] text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#365bce]/20 focus:border-[#365bce] transition-all placeholder-gray-400 font-medium pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {show ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
              </button>
            </div>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-[#fafafa] text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#365bce]/20 focus:border-[#365bce] transition-all placeholder-gray-400 font-medium"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#365bce] text-white font-semibold py-4 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
