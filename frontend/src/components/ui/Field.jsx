import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

const fieldBase =
  "w-full h-10 rounded-[5px] border border-border-strong bg-bg-elevated px-3 text-[14.5px] text-text placeholder:text-text-faint outline-none transition-colors focus:border-rose disabled:opacity-50";

export function Label({ children, htmlFor, hint }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between">
      <label htmlFor={htmlFor} className="text-[13.5px] font-medium text-text-muted">
        {children}
      </label>
      {hint && <span className="text-[11.5px] text-text-faint">{hint}</span>}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(fieldBase, className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, rows = 3, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(fieldBase, "h-auto py-2 resize-none", className)}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(fieldBase, "appearance-none pr-8 cursor-pointer", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={15}
        strokeWidth={2}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-faint"
      />
    </div>
  );
});

export function FieldGroup({ children, className }) {
  return <div className={cn("flex flex-col", className)}>{children}</div>;
}

export function FieldError({ children }) {
  if (!children) return null;
  return <p className="mt-1 text-[12.5px] text-fault">{children}</p>;
}
