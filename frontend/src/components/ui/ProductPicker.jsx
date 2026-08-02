import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "../../lib/cn";

// Type-to-search product select — a plain <select> doesn't scale once the
// catalog grows past a screenful. Filtered dropdown, click to choose. Options
// use onMouseDown+preventDefault (not just a delayed blur) so the input never
// loses focus mid-click — otherwise the blur can close the dropdown before
// the click on an option finishes registering.
export default function ProductPicker({ products, value, onChange, placeholder = "Search products…", className }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = products.find((p) => p._id === value);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? products.filter((p) => p.name.toLowerCase().includes(q) || (p.brand?.name ?? "").toLowerCase().includes(q))
      : products;
    return matches.slice(0, 8);
  }, [query, products]);

  return (
    <div className={cn("relative flex-1", className)}>
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
      <input
        value={open ? query : selected?.name ?? ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange("");
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className="h-10 w-full rounded-[5px] border border-border-strong bg-bg-elevated pl-8 pr-3 text-[14.5px] text-text placeholder:text-text-faint outline-none focus:border-rose"
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-bg-elevated py-1 shadow-xl">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-[13px] text-text-muted">No matches.</p>
          ) : (
            results.map((p) => (
              <button
                key={p._id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(p._id);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-bg-sunken"
              >
                <span className="truncate text-[13.5px] text-text">{p.name}</span>
                <span className="shrink-0 text-[11.5px] text-text-faint">{p.brand?.name} · {p.currentStock} in stock</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
