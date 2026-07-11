"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AtSign, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const OAUTH_ERRORS: Record<string, string> = {
  google_not_configured: 'Google sign-in is not configured yet.',
  google_denied: 'Google sign-in was cancelled.',
  google_state: 'Google sign-in session expired. Please try again.',
  google_token: 'Could not complete Google sign-in.',
  google_userinfo: 'Could not read your Google profile.',
  google_email: 'Your Google account has no verified email.',
  google_error: 'Google sign-in failed. Please try again.',
};

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('error');
    if (code) {
      setError(OAUTH_ERRORS[code] ?? 'Sign-in failed. Please try again.');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/registration-status')
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => setRegistrationEnabled(Boolean(d?.enabled)))
      .catch(() => setRegistrationEnabled(false));
  }, []);

  useEffect(() => {
    if (!registrationEnabled && isRegistering) setIsRegistering(false);
  }, [registrationEnabled, isRegistering]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegistering && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
      const body = isRegistering
        ? JSON.stringify({ username, email, password })
        : JSON.stringify({ email, password, remember });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? (isRegistering ? "Registration failed" : "Login failed"));
      if (data.user) setUser(data.user);
      router.push("/homepage");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fe] flex items-center justify-center p-4 sm:p-8 font-sans">

      {}
      <div className="flex w-full max-w-5xl bg-white rounded-[2rem] shadow-xl overflow-hidden min-h-[700px]">

        {}
        <div className="hidden lg:flex lg:w-1/2 bg-[#f8faff] items-center justify-center border-l border-gray-100">

        </div>

        {}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
          <div className="max-w-[400px] w-full mx-auto">

            {}
            <div className="flex justify-center mb-8">
              <div className="w-14 h-14 bg-[#f0f4ff] text-[#365bce] rounded-full flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
            </div>

            {}
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-gray-800 mb-3 tracking-tight">
                {isRegistering ? 'Create an Account' : 'Welcome Back'}
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed px-4">
                {isRegistering
                  ? 'Join us today to explore all features'
                  : 'Please enter your details to sign in'}
              </p>
            </div>

            {}
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-xl mb-4 text-center">
                  {error}
                </div>
              )}

              {}
              {isRegistering && (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-[#fafafa] text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#365bce]/20 focus:border-[#365bce] transition-all placeholder-gray-400 font-medium"
                    required
                  />
                  <div className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                    <User size={18} strokeWidth={2} />
                  </div>
                </div>
              )}

              {}
              <div className="relative">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-[#fafafa] text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#365bce]/20 focus:border-[#365bce] transition-all placeholder-gray-400 font-medium"
                  required
                />
                <div className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                  <AtSign size={18} strokeWidth={2} />
                </div>
              </div>

              {}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-[#fafafa] text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#365bce]/20 focus:border-[#365bce] transition-all placeholder-gray-400 font-medium pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                </button>
              </div>

              {}
              {isRegistering && (
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-[#fafafa] text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#365bce]/20 focus:border-[#365bce] transition-all placeholder-gray-400 font-medium pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                  </button>
                </div>
              )}

              {}
              {!isRegistering && (
                <div className="flex items-center justify-between text-[13px] py-1 mt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer text-gray-500 hover:text-gray-700 transition-colors">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="peer appearance-none w-4 h-4 rounded border-2 border-gray-200 checked:bg-[#365bce] checked:border-[#365bce] transition-all cursor-pointer"
                      />
                      <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span className="font-medium">Remember Me</span>
                  </label>
                  <Link href="/forgot-password" className="text-[#365bce] font-bold hover:underline">
                    Forgot Password?
                  </Link>
                </div>
              )}

              {}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#365bce] text-white font-semibold py-4 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading
                  ? (isRegistering ? 'Signing up...' : 'Logging in...')
                  : (isRegistering ? 'Sign Up' : 'Login')}
              </button>

              {}
              <button
                type="button"
                onClick={() => { window.location.href = '/api/auth/google'; }}
                className="w-full bg-white text-gray-600 font-semibold py-4 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 mt-4"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </button>
            </form>

            {}
            {registrationEnabled && (
              <p className="text-center mt-10 text-gray-500 text-[13px] font-medium">
                {isRegistering ? 'Already have an account?' : "Don't have an account yet?"}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError('');
                  }}
                  className="text-[#365bce] font-bold hover:underline ml-1"
                >
                  {isRegistering ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}