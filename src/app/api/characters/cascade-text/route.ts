import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCharacterTextCascade } from "@/lib/character-text-cascade";

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
    return runCharacterTextCascade(supabase, user.id, {
      storyId: String(body.storyId ?? ""),
      oldText: String(body.oldText ?? ""),
      newText: String(body.newText ?? ""),
      matchMode: body.matchMode === "word" ? "word" : "phrase",
    });
  } catch (err) {
    console.error("POST /api/characters/cascade-text:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
