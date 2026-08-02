import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";
import { selectToasts, dismissed } from "../../features/toast/toastSlice";
import { cn } from "../../lib/cn";

const ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const TONE = {
  success: "text-solder",
  warning: "text-trace",
  error: "text-fault",
};

function ToastItem({ toast }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const t = setTimeout(() => dispatch(dismissed(toast.id)), 4200);
    return () => clearTimeout(t);
  }, [toast.id, dispatch]);

  const Icon = ICONS[toast.variant] ?? CheckCircle2;

  return (
    <div className="pointer-events-auto flex w-80 items-start gap-2.5 rounded-lg border border-border bg-bg-elevated px-3.5 py-3 shadow-lg toast-enter">
      <Icon size={18} className={cn("mt-0.5 shrink-0", TONE[toast.variant] ?? TONE.success)} />
      <p className="flex-1 text-[14px] leading-snug text-text">{toast.message}</p>
      <button
        onClick={() => dispatch(dismissed(toast.id))}
        aria-label="Dismiss notification"
        className="shrink-0 text-text-faint hover:text-text"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export default function ToastViewport() {
  const toasts = useSelector(selectToasts);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
