export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  date: string;
  category: string;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "designing-a-frictionless-check-in",
    title: "Designing a Frictionless Check-In Experience",
    excerpt: "How digital guest journeys reduce wait time and increase hospitality quality.",
    date: "2026-03-14",
    category: "Operations",
    content: [
      "Guests now expect a streamlined arrival experience where identity verification, reservation retrieval, and room assignment are instant.",
      "A strong check-in journey combines clear pre-arrival communication, digital ID collection, and room-readiness orchestration.",
      "When booking and payment systems share state in real time, front desk teams spend less time on manual checks and more on hospitality.",
    ],
  },
  {
    slug: "pricing-strategies-for-boutique-hotels",
    title: "Pricing Strategies for Boutique Hotels",
    excerpt: "Use room type packaging and seasonal pacing to improve revenue per room.",
    date: "2026-02-28",
    category: "Revenue",
    content: [
      "Boutique hotels can protect ADR by bundling experiences instead of discounting base room rates.",
      "A practical approach is to expose two clean plans, such as room-only and breakfast-inclusive, then monitor conversion by stay length.",
      "Tracking occupancy, pickup pace, and contribution margin by segment reveals where dynamic pricing has the strongest impact.",
    ],
  },
  {
    slug: "the-modern-guest-data-playbook",
    title: "The Modern Guest Data Playbook",
    excerpt: "Collect only what you need, keep consent explicit, and build trust through transparency.",
    date: "2026-01-19",
    category: "Guest Experience",
    content: [
      "Guest trust starts with clear data consent, purpose limitation, and transparent retention policies.",
      "Hotels should focus on collecting only operationally necessary fields for booking and compliance.",
      "A privacy-first data model is not just legal hygiene; it also increases completion rate in checkout flows.",
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
