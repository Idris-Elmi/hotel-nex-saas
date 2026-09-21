type Props = { height?: string };

export default function ChartSkeleton({ height = "h-64" }: Props) {
  return <div className={`${height} rounded-xl bg-slate-100 dark:bg-[#141E35] animate-pulse`} />;
}
