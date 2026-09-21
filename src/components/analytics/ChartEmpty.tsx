import { BarChart2 } from "lucide-react";

export default function ChartEmpty() {
  return (
    <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-600">
      <BarChart2 size={32} className="opacity-30" />
      <p className="text-sm">No data for this period</p>
    </div>
  );
}
