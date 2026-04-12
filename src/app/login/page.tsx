"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;

    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        identifier,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid phone/email or password");
      } else {
        // Redirect to landing page which will route by role
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-surface">
      {/* Logo & Branding */}
      <div className="flex flex-col items-center mb-10">
        <Image
          src="/logo.svg"
          alt="CYFoods"
          width={100}
          height={100}
          className="h-24 w-auto mb-4"
        />
        <h1 className="text-3xl font-headline font-bold italic text-primary tracking-tight">
          PODS
        </h1>
        <p className="text-on-surface-variant font-body text-sm mt-1">
          Sign in to continue
        </p>
      </div>

      {/* Login Form */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5"
      >
        <div className="space-y-2">
          <label className="font-label text-xs font-bold text-outline uppercase tracking-wider">
            Phone or Email
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">
              person
            </span>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="08012345678 or email@example.com"
              className="w-full h-14 pl-12 pr-4 bg-surface-container-lowest ring-1 ring-outline/15 rounded-xl focus:ring-2 focus:ring-primary text-lg transition-all placeholder:text-on-surface-variant/40"
              autoComplete="username"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-label text-xs font-bold text-outline uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">
              lock
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full h-14 pl-12 pr-4 bg-surface-container-lowest ring-1 ring-outline/15 rounded-xl focus:ring-2 focus:ring-primary text-lg transition-all placeholder:text-on-surface-variant/40"
              autoComplete="current-password"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-error-container p-3 rounded-lg">
            <span className="material-symbols-outlined text-on-error-container text-lg">
              error
            </span>
            <span className="text-sm font-medium text-on-error-container">
              {error}
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !identifier || !password}
          className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-lg rounded-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-xl">
                progress_activity
              </span>
              Signing in...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-xl">login</span>
              Sign In
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="mt-16 text-on-surface-variant/40 text-xs font-label uppercase tracking-widest">
        CYFoods &copy; 2026
      </p>
    </div>
  );
}
