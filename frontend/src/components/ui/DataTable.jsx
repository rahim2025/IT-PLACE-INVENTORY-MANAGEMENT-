import { useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";
import { SkeletonRows } from "./Skeleton";

export default function DataTable({
  columns,
  rows,
  keyField = "id",
  pageSize = 8,
  searchPlaceholder,
  searchKeys,
  filters,
  loading = false,
  emptyState,
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!searchKeys || !query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(q))
    );
  }, [rows, query, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      {(searchKeys || filters) && (
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border px-4.5 py-3">
          {searchKeys && (
            <div className="relative w-full max-w-[15rem]">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder ?? "Search…"}
                className="h-9 w-full rounded-[5px] border border-border-strong bg-bg-elevated pl-8 pr-3 text-[14px] text-text placeholder:text-text-faint outline-none focus:border-rose"
              />
            </div>
          )}
          {filters}
        </div>
      )}

      {loading ? (
        <SkeletonRows rows={pageSize} cols={columns.length} />
      ) : filtered.length === 0 ? (
        emptyState
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[14.5px]">
              <thead>
                <tr className="border-b border-border">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        "whitespace-nowrap px-4.5 py-3 text-[11.5px] font-semibold uppercase tracking-wide text-text-faint",
                        col.align === "right" && "text-right"
                      )}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((row) => (
                  <tr key={row[keyField]} className="border-b border-border last:border-0 hover:bg-bg-sunken/60">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4.5 py-3.5 align-middle text-text",
                          col.mono && "font-mono font-tabular",
                          col.align === "right" && "text-right",
                          col.className
                        )}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 px-4.5 py-3 text-[13px] text-text-muted">
            <span>
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of{" "}
              {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="flex h-7.5 w-7.5 items-center justify-center rounded-[4px] border border-border-strong disabled:opacity-40 hover:enabled:bg-bg-sunken"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="font-mono text-[12.5px] text-text-faint">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                className="flex h-7.5 w-7.5 items-center justify-center rounded-[4px] border border-border-strong disabled:opacity-40 hover:enabled:bg-bg-sunken"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
