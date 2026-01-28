import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost";
type Size = "default" | "sm";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: Variant;
  size?: Size;
}

const base =
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  default: "bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] hover:opacity-85",
  outline: "border border-[color:var(--color-foreground)] bg-transparent text-[color:var(--color-foreground)] hover:bg-black hover:text-white",
  ghost: "hover:bg-[color:var(--color-muted)]"
};

const sizes: Record<Size, string> = {
  default: "h-10 px-5 py-2",
  sm: "h-9 px-3"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "default", asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />;
});
