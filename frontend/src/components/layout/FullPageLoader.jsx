export default function FullPageLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-bg">
      <div className="flex items-center gap-2.5 text-text-muted">
        <span className="h-2 w-2 animate-pulse rounded-full bg-rose" />
        <span className="font-mono text-[13px] uppercase tracking-wide">Loading IT Place Inventory…</span>
      </div>
    </div>
  );
}
