"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AtSign, ArrowLeft } from "lucide-react";

// "forgot password" screen, email in, reset link out
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  // devLink is only returned when mail isn't wired up (local dev) so you can click through
  const [devLink, setDevLink] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setDevLink("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setMessage(data.message ?? "If an account exists, a reset link has been sent.");
      if (data.devLink) setDevLink(data.devLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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

        <h1 className="text-2xl font-bold text-gray-800 mb-2 tracking-tight">Forgot your password?</h1>
        <p className="text-gray-500 text-sm mb-8">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        {message ? (
          <div className="space-y-4">
            <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl">{message}</div>
            {devLink && (
              <div className="text-xs text-gray-500 break-all">
                Dev link:{" "}
                <a href={devLink} className="text-[#365bce] font-semibold hover:underline">
                  {devLink}
                </a>
              </div>
            )}
            <Link href="/" className="block text-center text-[#365bce] font-bold text-sm hover:underline">
              Return to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-xl text-center">{error}</div>
            )}
            <div className="relative">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-[#fafafa] text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#365bce]/20 focus:border-[#365bce] transition-all placeholder-gray-400 font-medium"
                required
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <AtSign size={18} strokeWidth={2} />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#365bce] text-white font-semibold py-4 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
