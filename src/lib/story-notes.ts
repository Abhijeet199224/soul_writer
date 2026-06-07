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
    { id: "1", title: "Chapter 1: The Inciting Incident", act: "Chapter 1" },
    { id: "2", title: "Chapter 2: The Midpoint Crisis", act: "Chapter 2" },
    { id: "3", title: "Chapter 3: The Final Confrontation", act: "Chapter 3" },
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
