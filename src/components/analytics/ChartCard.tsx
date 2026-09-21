import type { ReactNode } from "react";

type Props = { title: string; action?: ReactNode; children: ReactNode };

export default function ChartCard({ title, action, children }: Props) {
  return (
    <div className="bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-[#1E2D4A] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {title}
        </h3>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}
