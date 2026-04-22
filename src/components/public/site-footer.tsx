import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-linear-to-b from-[#19120e] via-[#231a13] to-[#2b2017] text-slate-200 dark:border-slate-800">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-serif text-xl font-bold text-white">Aroura Luxury Hotel</h2>
          <p className="mt-2 text-sm leading-7 text-slate-300">Elegant stays with a seamless digital booking journey.</p>
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-amber-300">Luxury redefined</p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Explore</h3>
          <div className="mt-3 grid gap-2 text-sm">
            <Link href="/services" className="transition duration-300 hover:translate-x-0.5 hover:text-white">Services</Link>
            <Link href="/rooms" className="transition duration-300 hover:translate-x-0.5 hover:text-white">Rooms</Link>
            <Link href="/blog" className="transition duration-300 hover:translate-x-0.5 hover:text-white">Blog</Link>
            <Link href="/contact" className="transition duration-300 hover:translate-x-0.5 hover:text-white">Contact</Link>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Booking</h3>
          <div className="mt-3 grid gap-2 text-sm">
            <Link href="/booking/details" className="transition duration-300 hover:translate-x-0.5 hover:text-white">Start booking</Link>
            <Link href="/booking/rooms" className="transition duration-300 hover:translate-x-0.5 hover:text-white">Room selection</Link>
            <Link href="/booking/guest" className="transition duration-300 hover:translate-x-0.5 hover:text-white">Guest information</Link>
          </div>
        </section>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs uppercase tracking-[0.16em] text-slate-400">
        Aroura Luxury Hotel. Crafted for modern hospitality.
      </div>
    </footer>
  );
}
