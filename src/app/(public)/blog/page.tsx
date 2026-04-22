import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/content/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Insights on hotel operations, guest experience, and digital booking performance.",
};

export default function BlogPage() {
  const featuredPost = BLOG_POSTS[0];
  const remainingPosts = BLOG_POSTS.slice(1);

  return (
    <main className="bg-[#f6f2ea] px-4 py-12 sm:px-6 md:py-16">
      <section className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Aroura Luxury Hotel Journal</p>
        <h1 className="mt-2 font-serif text-3xl text-slate-900 sm:text-5xl">Stories in modern hospitality</h1>
        <p className="mt-4 max-w-2xl text-slate-600">
          Insights and practical ideas on guest experience, operations, and revenue growth.
        </p>
      </section>

      {featuredPost ? (
        <section className="mx-auto mt-8 max-w-7xl overflow-hidden rounded-3xl border border-[#e4dac9] bg-white shadow-xl">
          <div className="grid md:grid-cols-[1.1fr_0.9fr]">
            <img
              src="/images/room1.jpg"
              alt={featuredPost.title}
              className="h-72 w-full object-cover sm:h-80 md:h-full"
            />
            <div className="p-7 sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Featured post</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{featuredPost.category}</p>
              <h2 className="mt-2 font-serif text-2xl leading-tight text-slate-900 sm:text-4xl">{featuredPost.title}</h2>
              <p className="mt-3 text-sm text-slate-500">{new Date(featuredPost.date).toLocaleDateString()}</p>
              <p className="mt-4 text-slate-600">{featuredPost.excerpt}</p>
              <Link
                href={`/blog/${featuredPost.slug}`}
                className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700"
              >
                Read featured article
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto mt-10 grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(remainingPosts.length > 0 ? remainingPosts : BLOG_POSTS).map((post, index) => (
          <article
            key={post.slug}
            className="group overflow-hidden rounded-3xl border border-[#e3dacb] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <img
              src={index % 3 === 0 ? "/images/room2.jpg" : index % 3 === 1 ? "/images/room3.jpg" : "/images/room1.jpg"}
              alt={post.title}
              className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{post.category}</p>
              <h2 className="mt-2 font-serif text-2xl leading-snug text-slate-900">{post.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{new Date(post.date).toLocaleDateString()}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{post.excerpt}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-5 inline-flex text-xs font-semibold uppercase tracking-wide text-slate-900 underline underline-offset-4"
              >
                Read article
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
