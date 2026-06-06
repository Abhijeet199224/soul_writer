"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AppHeaderProps {
  email?: string | null;
  fullWidth?: boolean;
}

export function AppHeader({ email, fullWidth }: AppHeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-amber-200/50 bg-white/70 backdrop-blur">
      <div
        className={`flex items-center justify-between px-6 py-3 ${fullWidth ? "w-full" : "mx-auto max-w-6xl"}`}
      >
        <Link href="/dashboard" className="group">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Soul Writer
          </p>
          <p className="font-serif text-xl text-stone-900 group-hover:text-amber-900">
            Story Bible Engine
          </p>
        </Link>

        <div className="flex items-center gap-4">
          {email && (
            <span className="hidden text-sm text-stone-500 sm:inline">
              {email}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 transition hover:border-stone-300 hover:text-stone-900"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
