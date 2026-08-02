import { cn } from "../../lib/cn";

// The signature device of IT Place Inventory: every status in the app — stock
// health, due status, payroll deductions — reads as a physical inventory tag,
// the way a real shop marks a bin or a returned part. Rectangular body, a
// punched grommet on the left, a perforated tear line before the label.

const TONES = {
  neutral: {
    box: "border-border-strong bg-bg-sunken text-text-muted",
    ring: "border-text-faint",
    tear: "border-border-strong",
  },
  solder: {
    box: "border-solder/35 bg-solder/10 text-solder-dark dark:text-solder",
    ring: "border-solder",
    tear: "border-solder/35",
  },
  trace: {
    box: "border-trace/40 bg-trace/10 text-trace-dark dark:text-trace",
    ring: "border-trace",
    tear: "border-trace/40",
  },
  fault: {
    box: "border-fault/40 bg-fault/10 text-fault-dark dark:text-fault",
    ring: "border-fault",
    tear: "border-fault/40",
  },
  rose: {
    box: "border-rose/40 bg-rose/10 text-rose-dark dark:text-rose",
    ring: "border-rose",
    tear: "border-rose/40",
  },
};

export default function AssetTag({ tone = "neutral", children, className }) {
  const t = TONES[tone] ?? TONES.neutral;
  return (
    <span
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-[3px] border font-mono text-[11.5px] font-medium uppercase tracking-wide leading-none",
        t.box,
        className
      )}
    >
      <span className={cn("flex items-center border-r border-dashed pl-[6px] pr-[6px]", t.tear)}>
        <span className={cn("h-[7px] w-[7px] rounded-full border", t.ring)} />
      </span>
      <span className="flex items-center px-[8px] py-[5px]">{children}</span>
    </span>
  );
}
