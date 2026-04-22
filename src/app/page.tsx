import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteNav } from "@/components/public/site-nav";

export const metadata: Metadata = {
  title: "Home",
  description: "Book modern boutique rooms with real-time availability and a seamless 5-step checkout experience.",
};

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main className="bg-[#f7f4ee] text-slate-900">
        <section className="relative isolate flex min-h-screen items-center overflow-hidden">
          <img
            src="/image/Designer.png"
            alt="Aroura Luxury Hotel lobby"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-b from-black/55 via-black/45 to-black/60" />
          <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-black/35 to-transparent" />

          <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:py-28">
            <div className="hero-float">
              <img src="/image/Luxury Hotel Logo.jpg" alt="Aroura Luxury Hotel logo" className="h-12 w-auto object-contain sm:h-14" />
              <h1 className="mt-6 max-w-3xl font-sans text-4xl font-black uppercase leading-[0.95] text-white sm:text-6xl lg:text-8xl">
                Aroura
                <span className="block">Luxury</span>
                <span className="block">Hotel</span>
              </h1>
              <p className="mt-5 text-base font-semibold uppercase tracking-[0.2em] text-slate-200 sm:text-2xl sm:tracking-[0.35em]">
                Stay With Excitement
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/booking/details"
                  className="cta-float rounded-md bg-[#d69212] px-6 py-3 text-xl font-bold text-white transition duration-300 hover:bg-[#bd810f] sm:px-8 sm:py-4 sm:text-4xl"
                >
                  Book Now
                </Link>
                <Link
                  href="/rooms"
                  className="rounded-md border border-white/45 bg-white/10 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white backdrop-blur transition duration-300 hover:bg-white/20"
                >
                  View Rooms
                </Link>
              </div>
            </div>

            {/* <article className="hero-float-delayed hidden rounded-3xl border border-white/25 bg-white/10 p-5 shadow-2xl backdrop-blur-sm md:block md:p-6 lg:mt-14">
              <img
                src="/images/room2.jpg"
                alt="Hotel interior preview"
                className="sample-room2-auto h-72 w-full rounded-2xl object-cover sm:h-80"
              />
              <div className="mt-4 rounded-2xl bg-white/90 p-4 text-slate-800">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Welcome</p>
                <p className="mt-2 font-serif text-2xl">Elegant stays in Addis Ababa</p>
              </div>
            </article> */}
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-20 px-4 py-16 sm:px-6 md:space-y-24 md:py-20">
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { icon: "◇", title: "24/7 Concierge", text: "Personal assistance for dining, travel, and bespoke city experiences." },
              { icon: "✦", title: "Spa & Wellness", text: "Rejuvenating rituals, sauna sessions, and in-room relaxation options." },
              { icon: "▣", title: "Fine Dining", text: "Chef-curated menus blending local flavor with contemporary cuisine." },
              { icon: "◈", title: "Private Transfer", text: "Seamless airport and city transfer services with premium comfort." },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[#e5ddd0] bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-xl text-amber-700">{item.icon}</span>
                <h2 className="mt-4 font-serif text-2xl text-slate-900">{item.title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
              </article>
            ))}
          </section>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Rooms Preview</p>
                <h2 className="mt-2 font-serif text-3xl sm:text-4xl">A suite for every mood</h2>
              </div>
              <Link href="/rooms" className="text-sm font-semibold uppercase tracking-wide text-slate-700 underline underline-offset-4">
                View all rooms
              </Link>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {[
                { title: "Deluxe City View", image: "/images/room1.jpg", text: "Floor-to-ceiling windows and warm contemporary interiors." },
                { title: "Executive Suite", image: "/images/room2.jpg", text: "Generous lounge space curated for business and leisure." },
                { title: "Family Comfort", image: "/images/room3.jpg", text: "Thoughtful layout and flexible bedding for modern families." },
              ].map((room) => (
                <article
                  key={room.title}
                  className="group overflow-hidden rounded-3xl border border-[#e5ddd0] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="overflow-hidden">
                    <img
                      src={room.image}
                      alt={room.title}
                      className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-serif text-2xl">{room.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{room.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-[#1f1913] px-6 py-12 text-white sm:px-10 md:py-14">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">Guest Testimonials</p>
            <div className="mt-7 grid gap-5 md:grid-cols-3">
              {[
                { name: "Sofia M.", role: "Frequent traveler", quote: "From check-in to checkout, every detail felt intentional and quietly luxurious." },
                { name: "Daniel R.", role: "Business guest", quote: "The booking experience was effortless, and the suite made work and rest equally comfortable." },
                { name: "Mina T.", role: "Weekend escape", quote: "Calm atmosphere, elegant design, and service that felt genuinely caring." },
              ].map((testimonial) => (
                <article
                  key={testimonial.name}
                  className="rounded-2xl border border-white/15 bg-white/5 p-5 transition duration-300 hover:bg-white/10"
                >
                  <p className="text-sm leading-7 text-amber-50">&quot;{testimonial.quote}&quot;</p>
                  <p className="mt-4 font-serif text-lg">{testimonial.name}</p>
                  <p className="text-xs uppercase tracking-wider text-amber-200/90">{testimonial.role}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-10 md:grid-cols-[1fr_1fr] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">A Place to Exhale</p>
              <h2 className="mt-3 font-serif text-3xl leading-tight text-slate-900 sm:text-5xl">
                Luxury is not excess.
                <span className="block">It is thoughtful stillness.</span>
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
                Every corner at Aroura Luxury Hotel is designed to bring clarity and comfort: soft textures, natural light, and intuitive digital experiences that make every step feel effortless.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <img src="/images/room1.jpg" alt="Suite interior" className="h-44 w-full rounded-2xl object-cover sm:h-52" />
              <img src="/images/room2.jpg" alt="Wellness area" className="h-44 w-full rounded-2xl object-cover sm:h-52" />
              <img src="/images/room3.jpg" alt="Lobby ambiance" className="col-span-2 h-52 w-full rounded-2xl object-cover sm:h-64" />
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-serif text-3xl sm:text-4xl">Gallery</h2>
              <p className="text-sm uppercase tracking-wide text-slate-500">Inspired moments around the property</p>
            </div>

            <div className="mt-7 grid auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[190px] md:grid-cols-4 md:gap-4">
              <img src="/images/room1.jpg" alt="Gallery 1" className="h-full w-full rounded-2xl object-cover md:col-span-2 md:row-span-2" />
              <img src="/images/room2.jpg" alt="Gallery 2" className="h-full w-full rounded-2xl object-cover" />
              <img src="/images/room3.jpg" alt="Gallery 3" className="h-full w-full rounded-2xl object-cover" />
              <img src="/images/room2.jpg" alt="Gallery 4" className="h-full w-full rounded-2xl object-cover" />
              <img src="/images/room1.jpg" alt="Gallery 5" className="h-full w-full rounded-2xl object-cover md:col-span-2" />
            </div>
          </section>

          <section className="rounded-3xl bg-linear-to-r from-amber-100 via-[#f2e8d8] to-[#efe3cf] p-8 text-center sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Begin Your Stay</p>
            <h2 className="mt-3 font-serif text-3xl text-slate-900 sm:text-5xl">Reserve your next extraordinary escape</h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-700">
              Enjoy smooth booking, curated spaces, and hospitality that feels quietly unforgettable.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/booking/details"
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition duration-300 hover:-translate-y-0.5 hover:bg-slate-700"
              >
                Start Booking
              </Link>
              <Link
                href="/contact"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold uppercase tracking-wide text-slate-800 transition duration-300 hover:-translate-y-0.5 hover:border-slate-400"
              >
                Speak to Concierge
              </Link>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
