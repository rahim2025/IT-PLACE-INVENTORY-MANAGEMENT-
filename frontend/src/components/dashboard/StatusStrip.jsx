import { useEffect, useRef, useState } from "react";
import StatusDot from "../ui/StatusDot";
import { cn } from "../../lib/cn";

// Money values ("SAR 12,345.67") run noticeably longer than plain counts
// (products, stock, employees, etc.) — giving every segment the same
// flex-1 share made the money ones overflow/wrap while the count ones sat
// with empty space. Detect money by the "SAR" prefix formatCurrency always
// adds, and give those segments more room instead of splitting evenly.
export default function StatusStrip({ segments }) {
  const scrollerRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [segments]);

  return (
    <div className="relative rounded-lg border border-border bg-bg-elevated">
      <div ref={scrollerRef} className="overflow-x-auto rounded-lg">
        <div className="flex min-w-max divide-x divide-border">
          {segments.map((s) => {
            const isMoney = typeof s.value === "string" && s.value.startsWith("SAR");
            return (
              <div
                key={s.label}
                className={cn("flex flex-col gap-1.5 px-3 py-3.5", isMoney ? "min-w-[138px] flex-[1.6]" : "min-w-[90px] flex-1")}
              >
                <div className="flex items-center gap-1.5">
                  {s.tone && <StatusDot tone={s.tone} pulse={s.pulse} />}
                  <span className="font-mono text-[10px] uppercase tracking-[0.09em] text-text-faint">{s.label}</span>
                </div>
                <span className="truncate font-mono text-[20px] font-semibold leading-none text-text font-tabular">{s.value}</span>
              </div>
            );
          })}
        </div>
      </div>
      {overflowing && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-lg bg-gradient-to-l from-bg-elevated to-transparent" />
      )}
    </div>
  );
}
