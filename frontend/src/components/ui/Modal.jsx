import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

export default function Modal({ open, onClose, title, description, children, size = "md" }) {
  const panelRef = useRef(null);
  // Callers pass a fresh onClose function every render (e.g. `() => setOpen(false)`).
  // Keeping it out of the effect's deps — via a ref — means the focus-on-open/
  // escape-key setup below only runs when the modal actually opens or closes,
  // not on every keystroke inside it (which was stealing focus back to the
  // first field after each character).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector("input, textarea, select, button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/60 p-4 pt-[8vh] backdrop-blur-[2px] sm:items-center sm:pt-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "w-full rounded-lg border border-border bg-bg-elevated shadow-2xl",
          size === "sm" && "max-w-sm",
          size === "md" && "max-w-lg",
          size === "lg" && "max-w-2xl"
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 id="modal-title" className="font-display text-[17px] font-semibold text-text">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-[14px] text-text-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-[5px] p-1 text-text-faint transition-colors hover:bg-bg-sunken hover:text-text"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
