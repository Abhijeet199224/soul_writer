"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Mode = "signin" | "signup";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      const { data: signInAfterSignUp, error: signInAfterSignUpError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (signInAfterSignUp.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      if (signInAfterSignUpError) {
        setError(
          "Account may exist but is not active yet. In Supabase SQL Editor, run supabase/fix-unconfirmed-users.sql, then try Sign in again. Or delete your user under Authentication → Users and Sign up again.",
        );
        setLoading(false);
        return;
      }

      setMessage("Account created. You can sign in now.");
      setMode("signin");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(
        signInError.message.toLowerCase().includes("invalid login credentials")
          ? "Invalid email or password. If you signed up earlier, your account may be unconfirmed — run supabase/fix-unconfirmed-users.sql in the Supabase SQL Editor, or delete your user and Sign up again."
          : signInError.message,
      );
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-amber-200/60 bg-white/80 p-8 shadow-xl shadow-amber-900/5 backdrop-blur">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          Soul Writer
        </p>
        <h1 className="mt-2 font-serif text-3xl text-stone-900">
          {mode === "signin" ? "Welcome back" : "Start your story"}
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Build character bibles that feed your editor automatically.
        </p>
      </div>

      <div className="mb-6 flex rounded-full bg-stone-100 p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
            mode === "signin"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
            mode === "signup"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500"
          }`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none ring-amber-500/0 transition focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10"
            placeholder="you@writer.com"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">
            Password
          </span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none ring-amber-500/0 transition focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10"
            placeholder="At least 6 characters"
          />
        </label>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-amber-700 px-4 py-3 font-medium text-white transition hover:bg-amber-800 disabled:opacity-60"
        >
          {loading
            ? "Working..."
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>
    </div>
  );
}
