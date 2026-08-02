import { cn } from "../../lib/cn";

export default function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-[4px] bg-bg-sunken", className)} />;
}

export function SkeletonRows({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-border px-4.5 py-3.5 last:border-0">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={cn("h-3.5", c === 0 ? "w-1/4" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}
