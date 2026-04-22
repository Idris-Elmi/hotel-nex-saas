import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Aroura Luxury Hotel, our philosophy, and how we design memorable stays.",
};

export default function AboutPage() {
  return (
    <main className="bg-[#f7f3eb] px-4 py-12 sm:px-6 md:py-16">
      <section className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-[#e5dccb] bg-linear-to-r from-[#1f1711] via-[#2c2117] to-[#3a2d20] text-slate-100 shadow-2xl">
        <div className="grid gap-8 p-8 md:grid-cols-2 md:p-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">About us</p>
            <h1 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl md:text-5xl">A quiet expression of modern luxury.</h1>
            <p className="mt-5 max-w-xl text-sm leading-8 text-amber-50/85 sm:text-base">
              Aroura Luxury Hotel blends boutique character with operational excellence, creating spaces where design, service,
              and digital comfort come together seamlessly.
            </p>
          </div>

          <div className="grid content-end gap-3">
            <img src="/images/room1.jpg" alt="Aroura Luxury Hotel story" className="h-56 w-full rounded-2xl object-cover sm:h-64" />
            <p className="rounded-2xl border border-white/15 bg-white/5 p-4 text-xs uppercase tracking-[0.16em] text-amber-200/90">
              Crafted for meaningful stays
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 grid max-w-7xl gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-start">
        <article className="rounded-3xl border border-[#e3dacb] bg-white p-7 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Our Story</p>
          <h2 className="mt-3 font-serif text-2xl leading-tight text-slate-900 sm:text-4xl">From thoughtful design to memorable journeys</h2>
          <p className="mt-5 text-sm leading-8 text-slate-600 sm:text-base">
            What began as a vision for refined city hospitality has evolved into a guest experience shaped by detail.
            Every room, corridor, and service touchpoint reflects our belief that comfort should feel effortless and
            personal.
          </p>
          <p className="mt-4 text-sm leading-8 text-slate-600 sm:text-base">
            By pairing warm in-person service with streamlined booking and stay flows, we help guests spend less time
            managing logistics and more time enjoying their moments.
          </p>
        </article>

        <aside className="rounded-3xl border border-[#e3dacb] bg-[#faf7f1] p-7 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Our Principles</p>
          <ul className="mt-5 grid gap-4 text-sm leading-7 text-slate-700">
            <li className="rounded-xl bg-white px-4 py-3">Design that invites calm and clarity.</li>
            <li className="rounded-xl bg-white px-4 py-3">Service that anticipates real guest needs.</li>
            <li className="rounded-xl bg-white px-4 py-3">Operations that are transparent and precise.</li>
          </ul>
        </aside>
      </section>

      <section className="mx-auto mt-10 grid max-w-7xl gap-6 md:grid-cols-2">
        <article className="rounded-3xl border border-[#e3dacb] bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Mission</p>
          <h2 className="mt-3 font-serif text-2xl text-slate-900 sm:text-3xl">To host with intention</h2>
          <p className="mt-4 text-sm leading-8 text-slate-600 sm:text-base">
            We create elevated stays through thoughtful spaces, sincere service, and seamless digital experiences that
            make every guest feel genuinely cared for.
          </p>
        </article>

        <article className="rounded-3xl border border-[#e3dacb] bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Vision</p>
          <h2 className="mt-3 font-serif text-2xl text-slate-900 sm:text-3xl">To redefine boutique hospitality</h2>
          <p className="mt-4 text-sm leading-8 text-slate-600 sm:text-base">
            We aspire to be the benchmark for modern hotel journeys where elegance, efficiency, and emotional comfort
            exist in perfect balance.
          </p>
        </article>
      </section>
    </main>
  );
}
