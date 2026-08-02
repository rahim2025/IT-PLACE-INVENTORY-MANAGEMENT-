import { forwardRef } from "react";
import { cn } from "../../lib/cn";

const variants = {
  primary: "bg-rose text-white hover:bg-rose-dark border border-rose",
  secondary:
    "bg-bg-elevated text-text border border-border-strong hover:border-text-faint",
  ghost: "bg-transparent text-text-muted hover:text-text hover:bg-bg-sunken border border-transparent",
  danger: "bg-fault text-white hover:bg-fault-dark border border-fault",
};

const sizes = {
  sm: "h-8.5 px-3 text-[13.5px] gap-1.5",
  md: "h-10 px-3.5 text-[14.5px] gap-2",
  lg: "h-11.5 px-5 text-[15px] gap-2",
};

const Button = forwardRef(function Button(
  { className, variant = "primary", size = "md", type = "button", children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-[5px] font-medium tracking-tight transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
