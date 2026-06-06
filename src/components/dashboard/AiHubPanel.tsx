"use client";

export interface AiResult {
  result: string;
  charactersUsed: string[];
  sliderValue: number;
  timestamp: number;
}

type AiHubTab = "soul-check" | "ghostwrite";

interface AiHubPanelProps {
  activeTab: AiHubTab;
  onTabChange: (tab: AiHubTab) => void;
  soulCheckResult: AiResult | null;
  ghostwriteResult: AiResult | null;
  linkedNames: string[];
  loading: AiHubTab | null;
  error: string | null;
  charactersCount: number;
  onRunSoulCheck: () => void;
  onRunGhostwrite: () => void;
}

export function AiHubPanel({
  activeTab,
  onTabChange,
  soulCheckResult,
  ghostwriteResult,
  linkedNames,
  loading,
  error,
  charactersCount,
  onRunSoulCheck,
  onRunGhostwrite,
}: AiHubPanelProps) {
  const activeResult =
    activeTab === "soul-check" ? soulCheckResult : ghostwriteResult;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-stone-200 bg-white xl:w-96">
      <div className="border-b border-stone-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-700">
          AI Hub
        </p>
      </div>

      <div className="flex border-b border-stone-100 p-2">
        <button
          type="button"
          onClick={() => onTabChange("soul-check")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
            activeTab === "soul-check"
              ? "bg-amber-100 text-amber-900"
              : "text-stone-500 hover:bg-stone-50"
          }`}
        >
          Soul Checker
        </button>
        <button
          type="button"
          onClick={() => onTabChange("ghostwrite")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
            activeTab === "ghostwrite"
              ? "bg-stone-900 text-white"
              : "text-stone-500 hover:bg-stone-50"
          }`}
        >
          Ghostwriter
        </button>
      </div>

      <div className="border-b border-stone-100 p-4">
        <button
          type="button"
          onClick={activeTab === "soul-check" ? onRunSoulCheck : onRunGhostwrite}
          disabled={loading !== null || charactersCount === 0}
          className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
            activeTab === "soul-check"
              ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
              : "bg-stone-900 text-white hover:bg-stone-800"
          }`}
        >
          {loading === activeTab
            ? activeTab === "soul-check"
              ? "Checking soul..."
              : "Ghostwriting..."
            : activeTab === "soul-check"
              ? "Run Soul Check"
              : "Generate"}
        </button>

        {charactersCount === 0 && (
          <p className="mt-2 text-xs text-red-600">
            Add characters in the Navigator first.
          </p>
        )}
        {error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
            Context injected
          </p>
          <p className="mt-1 text-xs text-stone-600">
            {linkedNames.length > 0
              ? linkedNames.join(", ")
              : "All bible characters (none named in draft)"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeResult ? (
          <div
            className={`rounded-xl p-4 ${
              activeTab === "soul-check"
                ? "border border-amber-200 bg-amber-50/60"
                : "border border-stone-200 bg-stone-900 text-stone-100"
            }`}
          >
            <p
              className={`text-[10px] font-semibold uppercase tracking-wide ${
                activeTab === "soul-check" ? "text-amber-800" : "text-amber-300"
              }`}
            >
              {activeTab === "soul-check" ? "Soul Checker insights" : "Ghostwriter output"}
            </p>
            <p
              className={`mt-1 text-[10px] ${
                activeTab === "soul-check" ? "text-stone-500" : "text-stone-400"
              }`}
            >
              {activeResult.charactersUsed.join(", ")} · {activeResult.sliderValue}%
            </p>
            <div
              className={`mt-3 whitespace-pre-wrap text-sm leading-relaxed ${
                activeTab === "soul-check" ? "text-stone-800" : "text-stone-200"
              }`}
            >
              {activeResult.result}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 p-6 text-center">
            <p className="font-serif text-sm text-stone-600">
              {activeTab === "soul-check"
                ? "Run a Soul Check to flag dialogue that betrays character traits."
                : "Generate prose that reads from your character bible automatically."}
            </p>
          </div>
        )}

        {activeTab === "soul-check" && ghostwriteResult && (
          <p className="mt-3 text-center text-[10px] text-stone-400">
            Switch to Ghostwriter tab to see last generation.
          </p>
        )}
        {activeTab === "ghostwrite" && soulCheckResult && (
          <p className="mt-3 text-center text-[10px] text-stone-400">
            Switch to Soul Checker tab to see last audit.
          </p>
        )}
      </div>
    </aside>
  );
}
