import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { StoryWorkspace } from "@/components/stories/StoryWorkspace";
import { createClient } from "@/lib/supabase/server";
import type { Character, Story } from "@/lib/types";

interface StoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("*")
    .eq("id", id)
    .single();

  if (storyError || !story) {
    notFound();
  }

  const { data: characters, error: charactersError } = await supabase
    .from("characters")
    .select("*")
    .eq("story_id", id)
    .order("name");

  if (charactersError) {
    throw new Error(charactersError.message);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f5f5f4_55%)]">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex text-sm text-stone-500 transition hover:text-stone-800"
        >
          ← Back to stories
        </Link>
        <StoryWorkspace
          story={story as Story}
          initialCharacters={(characters as Character[]) ?? []}
        />
      </main>
    </div>
  );
}
