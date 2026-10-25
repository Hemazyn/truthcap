import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "quiet";
type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white shadow-(--shadow-cta) hover:bg-brand-700 active:bg-brand-800",
  secondary: "bg-surface text-ink ring-1 ring-line-strong hover:bg-surface-2 hover:ring-brand-300",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  quiet: "bg-brand-50 text-brand-800 hover:bg-brand-100",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-4 text-sm",
  md: "h-11 gap-2 px-5 text-sm",
  lg: "h-12 gap-2 px-6 text-[0.95rem] sm:px-7",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
  return (
    <button className={cn("inline-flex items-center justify-center rounded-sm font-semibold transition-all duration-200 select-none", "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500", "active:translate-y-px disabled:pointer-events-none disabled:opacity-50", variantStyles[variant], sizeStyles[size], className)} {...props}>
      {children}
    </button>
  );
}
