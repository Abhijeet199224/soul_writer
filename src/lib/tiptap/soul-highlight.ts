import Highlight from "@tiptap/extension-highlight";

export const SoulHighlight = Highlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      insightIndex: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-insight-index"),
        renderHTML: (attributes) => {
          if (attributes.insightIndex == null) return {};
          return { "data-insight-index": String(attributes.insightIndex) };
        },
      },
      zoneType: {
        default: "cold",
        parseHTML: (element) => element.getAttribute("data-zone-type") ?? "cold",
        renderHTML: (attributes) => ({
          "data-zone-type": attributes.zoneType ?? "cold",
        }),
      },
    };
  },
});

export const ZONE_COLORS = {
  cold: "#a5b4fc",
  flat: "#fcd34d",
} as const;
