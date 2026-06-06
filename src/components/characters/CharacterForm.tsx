"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CHARACTER_ROLES,
  type Character,
  type CharacterInput,
  type CharacterRole,
} from "@/lib/types";

interface CharacterFormProps {
  storyId: string;
  character?: Character;
  onSaved: (character: Character) => void;
  onCancel?: () => void;
}

const emptyForm: CharacterInput = {
  name: "",
  role: "Protagonist",
  age: null,
  physical_appearance: "",
  core_flaw: "",
  primary_motivation: "",
};

export function CharacterForm({
  storyId,
  character,
  onSaved,
  onCancel,
}: CharacterFormProps) {
  const [form, setForm] = useState<CharacterInput>(
    character
      ? {
          name: character.name,
          role: character.role,
          age: character.age,
          physical_appearance: character.physical_appearance ?? "",
          core_flaw: character.core_flaw ?? "",
          primary_motivation: character.primary_motivation ?? "",
        }
      : emptyForm,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof CharacterInput>(
    key: K,
    value: CharacterInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      story_id: storyId,
      name: form.name.trim(),
      role: form.role,
      age: form.age,
      physical_appearance: form.physical_appearance?.trim() || null,
      core_flaw: form.core_flaw?.trim() || null,
      primary_motivation: form.primary_motivation?.trim() || null,
    };

    const supabase = createClient();

    const { data, error: saveError } = character
      ? await supabase
          .from("characters")
          .update(payload)
          .eq("id", character.id)
          .select("*")
          .single()
      : await supabase.from("characters").insert(payload).select("*").single();

    if (saveError) {
      setError(saveError.message);
      setLoading(false);
      return;
    }

    onSaved(data as Character);
    if (!character) {
      setForm(emptyForm);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-sm font-medium text-stone-700">
            Name
          </span>
          <input
            required
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-amber-400"
            placeholder="Julian"
          />
        </label>

        <label className="block sm:col-span-1">
          <span className="mb-1 block text-sm font-medium text-stone-700">
            Role
          </span>
          <select
            value={form.role}
            onChange={(e) =>
              updateField("role", e.target.value as CharacterRole)
            }
            className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-amber-400"
          >
            {CHARACTER_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-1">
          <span className="mb-1 block text-sm font-medium text-stone-700">
            Age
          </span>
          <input
            type="number"
            min={0}
            value={form.age ?? ""}
            onChange={(e) =>
              updateField(
                "age",
                e.target.value ? Number(e.target.value) : null,
              )
            }
            className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-amber-400"
            placeholder="32"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Physical appearance
        </span>
        <textarea
          value={form.physical_appearance ?? ""}
          onChange={(e) => updateField("physical_appearance", e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-amber-400"
          placeholder="Tall, rain-soaked coat, restless hands..."
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Core psychological flaw
        </span>
        <textarea
          value={form.core_flaw ?? ""}
          onChange={(e) => updateField("core_flaw", e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-amber-400"
          placeholder="Impulsive, sarcastic, refuses to ask for help..."
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Primary motivation
        </span>
        <textarea
          value={form.primary_motivation ?? ""}
          onChange={(e) => updateField("primary_motivation", e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-amber-400"
          placeholder="Prove the inheritance wasn't stolen..."
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-800 disabled:opacity-60"
        >
          {loading
            ? "Saving..."
            : character
              ? "Update character"
              : "Add character"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-stone-200 px-5 py-2.5 text-sm text-stone-600"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
