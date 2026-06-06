"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface StoryAuthGuardProps {
  children: React.ReactNode;
}

export function StoryAuthGuard({ children }: StoryAuthGuardProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      setReady(true);
    });
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-[calc(100dvh-57px)] flex-col items-center justify-center bg-stone-100">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-stone-200 bg-white px-10 py-12 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          <div className="text-center">
            <p className="font-serif text-lg text-stone-800">Opening your story</p>
            <p className="mt-1 text-sm text-stone-500">Verifying your session…</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
