import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Aroura Luxury Hotel for reservations, partnerships, and guest support.",
};

export default function ContactPage() {
  return (
    <main className="bg-[#f7f3eb] px-4 py-12 sm:px-6 md:py-16">
      <section className="mx-auto max-w-6xl rounded-3xl border border-[#e5dccb] bg-linear-to-r from-[#1f1711] via-[#2c2117] to-[#3a2d20] p-8 text-white shadow-2xl md:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">Contact</p>
        <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl md:text-5xl">Let us craft your next stay.</h1>
        <p className="mt-4 max-w-2xl text-amber-50/85">We usually reply within one business day.</p>
      </section>

      <section className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form className="grid gap-5 rounded-3xl border border-[#e2d8c7] bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-700 sm:col-span-2">
              Name
              <input
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 transition focus:border-slate-500 focus:outline-none"
                type="text"
                placeholder="Jane Doe"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700 sm:col-span-2">
              Email
              <input
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 transition focus:border-slate-500 focus:outline-none"
                type="email"
                placeholder="jane@example.com"
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Message
            <textarea
              className="min-h-40 rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 transition focus:border-slate-500 focus:outline-none"
              placeholder="How can we help?"
            />
          </label>

          <button
            type="button"
            className="w-fit rounded-full bg-slate-900 px-6 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-slate-700"
          >
            Send Message
          </button>
        </form>

        <aside className="grid gap-6">
          <section className="rounded-3xl border border-[#e2d8c7] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="font-serif text-2xl text-slate-900">Guest support</h2>
            <div className="mt-5 grid gap-3 text-sm text-slate-700">
              <p className="rounded-xl bg-slate-50 px-4 py-3"><span className="mr-2">✉</span>stay@aroura.example</p>
              <p className="rounded-xl bg-slate-50 px-4 py-3"><span className="mr-2">☎</span>+1 (555) 240-8800</p>
              <p className="rounded-xl bg-slate-50 px-4 py-3"><span className="mr-2">⌂</span>18 Meridian Avenue, Harbor District</p>
            </div>

            <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Front desk hours</h3>
            <p className="mt-2 text-sm text-slate-600">24/7 on-site reception</p>
          </section>

          <section className="overflow-hidden rounded-3xl border border-[#e2d8c7] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
              <p className="text-sm font-semibold text-slate-800">Map</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">Harbor District</p>
            </div>
            <img src="/images/map-location.svg" alt="Map location preview" className="h-56 w-full object-cover sm:h-64" />
          </section>
        </aside>
      </section>
    </main>
  );
}
