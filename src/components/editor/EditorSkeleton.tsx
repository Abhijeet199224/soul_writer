export function EditorSkeleton() {
  return (
    <div className="tiptap-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="min-h-[320px] animate-pulse px-8 py-6">
        <div className="h-4 w-1/3 rounded bg-stone-100" />
        <div className="mt-4 h-4 w-full rounded bg-stone-50" />
        <div className="mt-2 h-4 w-5/6 rounded bg-stone-50" />
      </div>
    </div>
  );
}
