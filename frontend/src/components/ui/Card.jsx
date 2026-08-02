import { cn } from "../../lib/cn";

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-bg-elevated",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-border px-4.5 py-3.5", className)}>
      <div>
        <h3 className="font-display text-[16.5px] font-semibold tracking-tight text-text">{title}</h3>
        {description && <p className="mt-0.5 text-[14px] text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn("p-4.5", className)}>{children}</div>;
}
