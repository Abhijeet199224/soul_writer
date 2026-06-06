import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { StoryAuthGuard } from "@/components/auth/StoryAuthGuard";
import { StoryDashboard } from "@/components/dashboard/StoryDashboard";
import { createClient } from "@/lib/supabase/server";
import type { Character, Story, StoryWorkspace } from "@/lib/types";

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
    .eq("user_id", user.id)
    .single();

  if (storyError || !story) {
    notFound();
  }

  const [{ data: characters, error: charactersError }, { data: workspace }] =
    await Promise.all([
      supabase.from("characters").select("*").eq("story_id", id).order("name"),
      supabase
        .from("story_workspace")
        .select("*")
        .eq("story_id", id)
        .maybeSingle(),
    ]);

  if (charactersError) {
    throw new Error(charactersError.message);
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-100">
      <AppHeader email={user.email} fullWidth />
      <StoryAuthGuard>
        <StoryDashboard
          story={story as Story}
          initialCharacters={(characters as Character[]) ?? []}
          initialWorkspace={(workspace as StoryWorkspace | null) ?? null}
        />
      </StoryAuthGuard>
    </div>
  );
}
