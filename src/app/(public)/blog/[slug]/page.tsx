import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBlogPost } from "@/lib/content/blog";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return { title: "Post not found" };
  }

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">{post.category}</p>
        <h1 className="mt-2 text-4xl font-black text-slate-900 dark:text-slate-100">{post.title}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{new Date(post.date).toLocaleDateString()}</p>

        <article className="mt-8 space-y-5 text-slate-700 dark:text-slate-300">
          {post.content.map((paragraph, index) => (
            <p key={index} className="leading-8">
              {paragraph}
            </p>
          ))}
        </article>
      </section>
    </main>
  );
}
