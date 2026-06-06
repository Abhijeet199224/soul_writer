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
      severity: {
        default: "cold",
        parseHTML: (element) => element.getAttribute("data-severity") ?? "cold",
        renderHTML: (attributes) => ({
          "data-severity": attributes.severity ?? "cold",
        }),
      },
    };
  },
});
