import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { CreateStoryForm } from "@/components/stories/CreateStoryForm";
import { createClient } from "@/lib/supabase/server";
import type { Story } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: stories, error } = await supabase
    .from("stories")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f5f5f4_55%)]">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-10">
          <h1 className="font-serif text-4xl text-stone-900">Your stories</h1>
          <p className="mt-2 text-stone-600">
            Each project keeps its own character bible, ready to feed the editor.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <CreateStoryForm />

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-500">
              Library
            </h2>
            {(stories as Story[] | null)?.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {(stories as Story[]).map((story) => (
                  <Link
                    key={story.id}
                    href={`/stories/${story.id}`}
                    className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md"
                  >
                    <h3 className="font-serif text-xl text-stone-900">
                      {story.title}
                    </h3>
                    {story.synopsis && (
                      <p className="mt-2 line-clamp-2 text-sm text-stone-600">
                        {story.synopsis}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-10 text-center">
                <p className="font-serif text-lg text-stone-700">
                  No stories yet
                </p>
                <p className="mt-2 text-sm text-stone-500">
                  Create your first project to start building character profiles.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
