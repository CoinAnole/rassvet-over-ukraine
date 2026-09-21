import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] text-sm font-medium transition-opacity duration-[var(--motion-quick,150ms)] disabled:opacity-40 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:opacity-90 px-3 py-2",
        ghost:
          "bg-transparent text-fg hover:bg-elevated border border-transparent px-3 py-2",
        outline:
          "border border-border bg-surface text-fg hover:border-border-strong px-3 py-2",
        chip: "border border-border bg-surface text-muted hover:text-fg px-2.5 py-1.5 text-xs",
      },
      size: {
        sm: "min-h-9",
        md: "min-h-11",
      },
    },
    defaultVariants: { variant: "outline", size: "sm" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
