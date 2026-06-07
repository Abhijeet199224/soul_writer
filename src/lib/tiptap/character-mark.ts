import { Mark, mergeAttributes } from "@tiptap/core";

export const CharacterCodex = Mark.create({
  name: "characterCodex",
  inclusive: false,
  addAttributes() {
    return {
      characterId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-character-id"),
        renderHTML: (attributes) => {
          if (!attributes.characterId) return {};
          return { "data-character-id": String(attributes.characterId) };
        },
      },
      characterName: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-character-name"),
        renderHTML: (attributes) => {
          if (!attributes.characterName) return {};
          return { "data-character-name": String(attributes.characterName) };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-character-codex]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-character-codex": "true",
        class: "character-codex-mark",
      }),
      0,
    ];
  },
});
