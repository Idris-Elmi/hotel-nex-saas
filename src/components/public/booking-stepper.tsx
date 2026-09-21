import { Check } from "lucide-react";

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
    <div className="flex items-start justify-between relative">
      {STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const active = stepNumber === current;
        const done = stepNumber < current;

        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center relative z-10">
              {done ? (
                <div className="w-10 h-10 rounded-full bg-[#d4a644] text-white flex items-center justify-center shadow-sm shadow-[#d4a644]/20">
                  <Check size={16} />
                </div>
              ) : active ? (
                <div className="w-10 h-10 rounded-full bg-[#d4a644] text-white flex items-center justify-center text-sm font-bold shadow-md shadow-[#d4a644]/30">
                  {stepNumber}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-white text-[#9ca3af] border-2 border-[#d1d5db] dark:bg-[#2a3a52] dark:border-gray-600 flex items-center justify-center text-sm font-medium">
                  {stepNumber}
                </div>
              )}
              <span
                className={`text-[11px] mt-2 text-center max-w-[70px] leading-tight ${
                  active ? "font-semibold text-[#d4a644]" : "font-medium text-[#9ca3af] dark:text-[#64748b]"
                }`}
              >
                {step}
              </span>
            </div>
            {index < STEPS.length - 1 ? (
              <div
                className={`flex-1 h-0.5 mt-5 mx-1 transition-colors duration-300 ${
                  done || active ? "bg-[#d4a644]" : "bg-[#d1d5db] dark:bg-gray-600"
                }`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}