import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Search, Package, UserSquare2, Users } from "lucide-react";
import { useGetProductsQuery, useGetCustomersQuery, useGetEmployeesQuery } from "../../app/apiSlice";
import { selectAuth } from "../../features/auth/authSlice";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const { user } = useSelector(selectAuth);
  const isOwner = user?.role === "owner";
  const trimmed = query.trim();

  const { data: productsRes } = useGetProductsQuery({ search: trimmed, limit: 4 }, { skip: trimmed.length < 2 });
  const { data: customersRes } = useGetCustomersQuery(undefined, { skip: !isOwner || trimmed.length < 2 });
  const { data: employeesRes } = useGetEmployeesQuery(undefined, { skip: !isOwner || trimmed.length < 2 });

  const results = useMemo(() => {
    const q = trimmed.toLowerCase();
    if (q.length < 2) return [];
    const list = [];

    (productsRes?.data ?? [])
      .slice(0, 4)
      .forEach((p) =>
        list.push({ type: "Product", icon: Package, label: p.name, sub: `${p.brand?.name ?? ""} · ${p.category?.name ?? ""}`, to: "/products" })
      );

    if (isOwner) {
      (customersRes?.data ?? [])
        .filter((c) => c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q))
        .slice(0, 3)
        .forEach((c) =>
          list.push({ type: "Customer", icon: UserSquare2, label: c.name, sub: c.email || "", to: `/customers/dues?customer=${c._id}` })
        );

      (employeesRes?.data ?? [])
        .filter((e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q))
        .slice(0, 3)
        .forEach((e) => list.push({ type: "Employee", icon: Users, label: e.name, sub: e.position, to: "/employees" }));
    }

    return list.slice(0, 8);
  }, [trimmed, productsRes, customersRes, employeesRes, isOwner]);

  return (
    <div className="relative w-full max-w-sm">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        placeholder="Search products, customers, employees…"
        className="h-9.5 w-full rounded-[6px] border border-border-strong bg-bg-sunken pl-8.5 pr-3 text-[14px] text-text placeholder:text-text-faint outline-none focus:border-rose focus:bg-bg-elevated"
      />
      {focused && trimmed.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-80 overflow-y-auto rounded-lg border border-border bg-bg-elevated py-1.5 shadow-xl">
          {results.length === 0 ? (
            <p className="px-3.5 py-3 text-[13px] text-text-muted">No matches for "{query}".</p>
          ) : (
            results.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  navigate(r.to);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left hover:bg-bg-sunken"
              >
                <r.icon size={15} className="shrink-0 text-text-faint" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] text-text">{r.label}</span>
                  <span className="block truncate text-[11.5px] text-text-faint">{r.sub}</span>
                </span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-text-faint">{r.type}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
