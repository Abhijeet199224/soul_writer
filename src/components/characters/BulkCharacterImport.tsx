"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  parseCharacterCsv,
  parseCharacterJson,
} from "@/lib/character-import";

interface BulkCharacterImportProps {
  storyId: string;
  onImported: () => void;
}

export function BulkCharacterImport({
  storyId,
  onImported,
}: BulkCharacterImportProps) {
  const [text, setText] = useState("");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleImport() {
    setLoading(true);
    setMessage(null);

    const parsed =
      format === "csv" ? parseCharacterCsv(text) : parseCharacterJson(text);
    if (!parsed.rows.length) {
      setMessage(parsed.errors.join(" ") || "No valid characters found.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const payload = parsed.rows.map((row) => ({
      story_id: storyId,
      name: row.name.trim(),
      role: row.role,
      age: row.age,
      pronouns: row.pronouns,
      aliases: row.aliases,
      voice_notes: row.voice_notes,
      relationships: row.relationships ?? [],
      physical_appearance: row.physical_appearance,
      core_flaw: row.core_flaw,
      primary_motivation: row.primary_motivation,
    }));

    const { error } = await supabase.from("characters").insert(payload);
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(`Imported ${payload.length} character${payload.length === 1 ? "" : "s"}.`);
    setText("");
    onImported();
    setLoading(false);
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        Bulk codex import
      </p>
      <div className="mt-2 flex gap-2 text-[10px]">
        {(["csv", "json"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFormat(key)}
            className={`rounded-full px-2 py-0.5 font-medium ${
              format === key
                ? "bg-stone-900 text-white"
                : "bg-white text-stone-600"
            }`}
          >
            {key.toUpperCase()}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={5}
        placeholder={
          format === "csv"
            ? "name,role,pronouns,aliases,core_flaw\nJulian,Protagonist,he/him,Jules,Too proud"
            : '[{"name":"Julian","role":"Protagonist","pronouns":"he/him"}]'
        }
        className="mt-3 w-full rounded-xl border border-stone-200 px-3 py-2 text-xs outline-none focus:border-amber-400"
      />
      <button
        type="button"
        disabled={loading || !text.trim()}
        onClick={() => void handleImport()}
        className="mt-3 rounded-xl bg-stone-900 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
      >
        {loading ? "Importing…" : "Import characters"}
      </button>
      {message && <p className="mt-2 text-xs text-stone-600">{message}</p>}
    </div>
  );
}
