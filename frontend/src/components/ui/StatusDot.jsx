import { cn } from "../../lib/cn";

const COLORS = {
  solder: "bg-solder shadow-[0_0_6px_var(--color-solder)]",
  trace: "bg-trace shadow-[0_0_6px_var(--color-trace)]",
  fault: "bg-fault shadow-[0_0_6px_var(--color-fault)]",
  rose: "bg-rose shadow-[0_0_6px_var(--color-rose)]",
  neutral: "bg-text-faint shadow-none",
};

export default function StatusDot({ tone = "neutral", pulse = false, className }) {
  return (
    <span className={cn("relative inline-flex h-[7px] w-[7px]", className)}>
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            tone === "fault" ? "bg-fault" : tone === "trace" ? "bg-trace" : "bg-solder"
          )}
        />
      )}
      <span className={cn("relative inline-flex h-[7px] w-[7px] rounded-full", COLORS[tone])} />
    </span>
  );
}
