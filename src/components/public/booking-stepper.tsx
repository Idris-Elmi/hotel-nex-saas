const STEPS = [
  "Booking details",
  "Room selection",
  "Guest information",
  "Account",
  "Payment",
  "Confirmation",
];

export function BookingStepper({ current }: { current: number }) {
  return (
    <ol className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-6">
      {STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const active = stepNumber === current;
        const done = stepNumber < current;

        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                active ? "bg-slate-900 text-white" : done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {stepNumber}
            </span>
            <span className={`text-xs font-semibold ${active ? "text-slate-900" : "text-slate-600"}`}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
