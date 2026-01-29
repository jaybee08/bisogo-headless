import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-[color:var(--color-background)]",
  {
    variants: {
      variant: {
        default: "bg-[color:var(--color-foreground)] text-white hover:opacity-90",
        destructive: "bg-red-600 text-white hover:bg-red-600/90",
        outline:
          "border border-[color:var(--color-border)] bg-transparent hover:bg-[color:var(--color-muted)]",
        secondary:
          "bg-[color:var(--color-muted)] text-[color:var(--color-foreground)] hover:opacity-90",
        ghost: "bg-transparent hover:bg-[color:var(--color-muted)]",
        link:
          "bg-transparent underline-offset-4 hover:underline text-[color:var(--color-foreground)]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };