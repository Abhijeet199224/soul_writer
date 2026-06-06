"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function CreateStoryForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be signed in to create a story.");
      setLoading(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("stories")
      .insert({
        title: title.trim(),
        synopsis: synopsis.trim() || null,
        user_id: user.id,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push(`/stories/${data.id}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-dashed border-amber-300/80 bg-amber-50/40 p-6"
    >
      <h2 className="font-serif text-xl text-stone-900">New story</h2>
      <p className="mt-1 text-sm text-stone-600">
        Each story gets its own character bible and editor context.
      </p>

      <div className="mt-4 space-y-3">
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Working title"
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-amber-400"
        />
        <textarea
          value={synopsis}
          onChange={(e) => setSynopsis(e.target.value)}
          placeholder="One-line premise (optional)"
          rows={2}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-amber-400"
        />
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-60"
      >
        {loading ? "Creating..." : "Create story"}
      </button>
    </form>
  );
}
