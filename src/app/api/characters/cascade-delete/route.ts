import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCharacterMentionRemoval } from "@/lib/character-text-cascade";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    return runCharacterMentionRemoval(supabase, user.id, {
      storyId: String(body.storyId ?? ""),
      searchText: String(body.characterName ?? body.searchText ?? ""),
      matchMode: "word",
      replacement: body.replacement ? String(body.replacement) : "",
      excludeChapterIds: Array.isArray(body.excludeChapterIds)
        ? body.excludeChapterIds.map(String)
        : [],
    });
  } catch (err) {
    console.error("POST /api/characters/cascade-delete:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
