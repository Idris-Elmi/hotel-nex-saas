"use client";

import { useSearchParams } from "next/navigation";
import { BookingStepper } from "@/components/public/booking-stepper";
import { Calendar, Moon, User, Baby, ArrowRight, AlertCircle } from "lucide-react";

export default function BookingDetailsPage() {
  const searchParams = useSearchParams();

  return (
    <div className="min-h-screen bg-[#f0f2f5] pt-16 dark:bg-[#1a2332]">
      <div className="pt-8 pb-6 px-4 bg-[#f0f2f5] dark:bg-[#1a2332]">
        <div className="max-w-2xl mx-auto">
          <BookingStepper current={1} />
        </div>
      </div>

      {searchParams.get("error") === "session_conflict" && (
        <div className="max-w-2xl mx-auto mb-4 px-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300">
            Your previous booking session was completed by another sign-in. Please start a new booking below.
          </div>
        </div>
      )}

      <div className="px-4 pb-12 bg-[#f0f2f5] dark:bg-[#1a2332]">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 shadow-xl shadow-black/8 border border-[#e2e6ea] dark:bg-[#243044] dark:border-white/5 dark:shadow-none">
          <h1 className="text-2xl font-serif font-bold text-[#1a202c] leading-tight dark:text-gray-100">Step 1: Booking details</h1>
          <p className="text-sm text-[#718096] mt-1.5 dark:text-gray-400">Set your dates and party size to check real-time room availability.</p>

          <form action="/booking/rooms" method="GET" className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-[#4a5568] uppercase tracking-wide mb-1.5 dark:text-gray-400">Arrival date</label>
              <div className="relative flex items-center">
                <input
                  className="w-full pl-4 pr-10 py-3 rounded-xl text-sm font-medium bg-white text-[#1a202c] placeholder:text-[#a0aec0] border border-[#e2e6ea] focus:outline-none focus:ring-2 focus:ring-[#d4a644]/30 focus:border-[#d4a644] transition-all duration-200 dark:bg-[#2a3a52] dark:text-gray-100 dark:placeholder:text-gray-500 dark:border-white/10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  type="date"
                  name="arrivalDate"
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
                <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#d4a644]" />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-[#4a5568] uppercase tracking-wide mb-1.5 dark:text-gray-400">Nights</label>
              <div className="relative flex items-center">
                <input
                  className="w-full pl-4 pr-10 py-3 rounded-xl text-sm font-medium bg-white text-[#1a202c] placeholder:text-[#a0aec0] border border-[#e2e6ea] focus:outline-none focus:ring-2 focus:ring-[#d4a644]/30 focus:border-[#d4a644] transition-all duration-200 dark:bg-[#2a3a52] dark:text-gray-100 dark:placeholder:text-gray-500 dark:border-white/10"
                  type="number"
                  min={1}
                  max={30}
                  name="nights"
                  defaultValue={0}
                  required
                />
                <Moon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#d4a644]" />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-[#4a5568] uppercase tracking-wide mb-1.5 dark:text-gray-400">Adults</label>
              <div className="relative flex items-center">
                <input
                  className="w-full pl-4 pr-10 py-3 rounded-xl text-sm font-medium bg-white text-[#1a202c] placeholder:text-[#a0aec0] border border-[#e2e6ea] focus:outline-none focus:ring-2 focus:ring-[#d4a644]/30 focus:border-[#d4a644] transition-all duration-200 dark:bg-[#2a3a52] dark:text-gray-100 dark:placeholder:text-gray-500 dark:border-white/10"
                  type="number"
                  min={1}
                  max={10}
                  name="adults"
                  defaultValue={0}
                  required
                />
                <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#d4a644]" />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-[#4a5568] uppercase tracking-wide mb-1.5 dark:text-gray-400">Children</label>
              <div className="relative flex items-center">
                <input
                  className="w-full pl-4 pr-10 py-3 rounded-xl text-sm font-medium bg-white text-[#1a202c] placeholder:text-[#a0aec0] border border-[#e2e6ea] focus:outline-none focus:ring-2 focus:ring-[#d4a644]/30 focus:border-[#d4a644] transition-all duration-200 dark:bg-[#2a3a52] dark:text-gray-100 dark:placeholder:text-gray-500 dark:border-white/10"
                  type="number"
                  min={0}
                  max={10}
                  name="children"
                  defaultValue={0}
                  required
                />
                <Baby size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#d4a644]" />
              </div>
            </div>

            <button
              className="w-full sm:col-span-2 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-[#1a202c] bg-[#d4a644] hover:bg-[#c49535] active:scale-[0.99] shadow-md shadow-[#d4a644]/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              type="submit"
            >
              Continue to room selection
              <ArrowRight size={16} className="text-[#1a202c]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}