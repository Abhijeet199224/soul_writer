"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/auth";

interface CheckEmailPanelProps {
  email: string;
}

export function CheckEmailPanel({ email }: CheckEmailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
      },
    });

    if (resendError) {
      setError(resendError.message);
    } else {
      setMessage("Confirmation email sent again. Check your inbox and spam.");
    }

    setLoading(false);
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-amber-200/60 bg-white/80 p-8 shadow-xl shadow-amber-900/5 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
        Verify your email
      </p>
      <h1 className="mt-2 font-serif text-3xl text-stone-900">Check your inbox</h1>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        We sent a confirmation link to{" "}
        <span className="font-medium text-stone-900">{email}</span>. Click it to
        activate your account, then you&apos;ll be signed in automatically.
      </p>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={handleResend}
          disabled={loading}
          className="w-full rounded-xl bg-amber-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-amber-800 disabled:opacity-60"
        >
          {loading ? "Sending..." : "Resend confirmation email"}
        </button>

        <Link
          href="/login"
          className="block w-full rounded-xl border border-stone-200 px-4 py-3 text-center text-sm text-stone-600 transition hover:border-amber-300 hover:text-stone-900"
        >
          Back to sign in
        </Link>
      </div>

      {message && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <p className="mt-6 text-xs text-stone-500">
        No email after a few minutes? Your project needs custom SMTP (Resend).
        Run <code className="rounded bg-stone-100 px-1">npm run auth:configure</code>{" "}
        after adding keys to <code className="rounded bg-stone-100 px-1">.env.local</code>.
      </p>
    </div>
  );
}
