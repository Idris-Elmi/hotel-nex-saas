import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services",
  description: "Explore concierge, dining, transfer, and wellness services available during your stay.",
};

const services = [
  {
    title: "Spa & Wellness",
    description: "Restorative therapies, sauna rituals, and personalized wellness journeys for complete renewal.",
    icon: "✦",
  },
  {
    title: "Dining",
    description: "Signature menus, seasonal ingredients, and intimate dining moments crafted by expert chefs.",
    icon: "✶",
  },
  {
    title: "Transport",
    description: "Private airport transfers, city chauffeur service, and seamless point-to-point travel.",
    icon: "◈",
  },
  {
    title: "Events",
    description: "Elegant spaces for celebrations, corporate gatherings, and curated private experiences.",
    icon: "◇",
  },
];

export default function ServicesPage() {
  return (
    <main className="bg-[#f6f2ea] px-4 py-14 sm:px-6 md:py-16">
      <section className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-3xl border border-[#e8decb] bg-linear-to-r from-[#201811] via-[#2d2218] to-[#3a2d20] p-8 text-white shadow-2xl md:p-12">
          <div className="absolute -right-12 -top-14 h-44 w-44 rounded-full border border-amber-200/30 bg-amber-200/10" />
          <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full border border-white/20 bg-white/10" />

          <p className="relative text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">Hotel services</p>
          <h1 className="relative mt-3 font-serif text-3xl leading-tight sm:text-4xl md:text-5xl">Curated services for exceptional stays.</h1>
          <p className="relative mt-4 max-w-2xl text-amber-50/85">
            Every offering is designed to blend comfort, elegance, and effortless convenience for modern travelers.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 grid max-w-7xl gap-6 sm:grid-cols-2">
        {services.map((service) => (
          <article
            key={service.title}
            className="group rounded-3xl border border-[#e6ddce] bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-xl text-amber-700 transition duration-300 group-hover:bg-amber-200">
              {service.icon}
            </span>
            <h2 className="mt-5 font-serif text-2xl text-slate-900 sm:text-3xl">{service.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{service.description}</p>
            <div className="mt-6 h-px w-full bg-linear-to-r from-amber-200/70 to-transparent" />
          </article>
        ))}
      </section>
    </main>
  );
}
