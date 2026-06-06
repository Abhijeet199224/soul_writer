export interface OutlineBeat {
  id: string;
  title: string;
  act: string;
}

export interface StoryNotes {
  outline: OutlineBeat[];
  settingNotes: string;
}

const defaultNotes: StoryNotes = {
  outline: [
    { id: "1", title: "Act 1: The Inciting Incident", act: "Act 1" },
    { id: "2", title: "Act 2: The Midpoint Crisis", act: "Act 2" },
    { id: "3", title: "Act 3: The Final Confrontation", act: "Act 3" },
  ],
  settingNotes: "",
};

export function getStoryNotesKey(storyId: string) {
  return `soul-writer-notes-${storyId}`;
}

export function loadStoryNotes(storyId: string): StoryNotes {
  if (typeof window === "undefined") return defaultNotes;

  try {
    const raw = localStorage.getItem(getStoryNotesKey(storyId));
    if (!raw) return defaultNotes;
    return { ...defaultNotes, ...JSON.parse(raw) };
  } catch {
    return defaultNotes;
  }
}

export function saveStoryNotes(storyId: string, notes: StoryNotes) {
  localStorage.setItem(getStoryNotesKey(storyId), JSON.stringify(notes));
}
