import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export type UIButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    "border border-slate-900 bg-slate-900 text-white hover:bg-slate-700 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white",
  secondary:
    "border border-amber-300 bg-amber-300 text-[#2f2214] hover:bg-amber-200",
  ghost:
    "border border-slate-300 bg-white text-slate-800 hover:border-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
};

const sizeClassMap: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-sm",
};

export function UIButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: UIButtonProps) {
  const widthClass = fullWidth ? "w-full" : "w-fit";

  return (
    <button
      type={type}
      className={`rounded-full font-semibold uppercase tracking-wide shadow-sm transition duration-300 hover:-translate-y-0.5 ${variantClassMap[variant]} ${sizeClassMap[size]} ${widthClass} ${className}`.trim()}
      {...props}
    />
  );
}
