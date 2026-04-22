import type { HTMLAttributes } from "react";

type CardTone = "default" | "elevated" | "glass";

export type UICardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: CardTone;
};

const toneClassMap: Record<CardTone, string> = {
  default: "border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900",
  elevated: "border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900",
  glass: "border border-white/20 bg-white/70 shadow-sm backdrop-blur dark:border-slate-700/50 dark:bg-slate-900/60",
};

export function UICard({ tone = "default", className = "", ...props }: UICardProps) {
  return <div className={`rounded-3xl p-6 ${toneClassMap[tone]} ${className}`.trim()} {...props} />;
}
