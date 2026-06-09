import { SectionHeader } from "./SectionHeader";

const ENTRIES = [
  {
    title: "Designing for emergence",
    read: "6 min read",
    date: "Mar 2026",
    img: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80",
  },
  {
    title: "On systems that breathe",
    read: "4 min read",
    date: "Feb 2026",
    img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80",
  },
  {
    title: "The quiet craft of interfaces",
    read: "8 min read",
    date: "Jan 2026",
    img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80",
  },
  {
    title: "Notes from the studio",
    read: "3 min read",
    date: "Dec 2025",
    img: "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=400&q=80",
  },
];

export function Journal() {
  return (
    <section id="journal" className="bg-bg py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <SectionHeader
          eyebrow="Journal"
          title="Recent"
          italicWord="thoughts"
          subtext="Essays, notes and inspiration from the studio."
          actionLabel="View all"
        />
        <div className="flex flex-col gap-4">
          {ENTRIES.map((e) => (
            <a
              key={e.title}
              href="#"
              className="group flex items-center gap-6 p-4 bg-surface/30 hover:bg-surface border border-stroke rounded-[40px] sm:rounded-full transition-colors"
            >
              <img
                src={e.img}
                alt=""
                className="w-16 h-16 sm:w-14 sm:h-14 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-base md:text-lg text-text-primary truncate">{e.title}</h3>
                <p className="text-xs text-muted">{e.read}</p>
              </div>
              <span className="text-xs text-muted whitespace-nowrap">{e.date}</span>
              <span className="hidden sm:inline-flex w-9 h-9 rounded-full border border-stroke items-center justify-center text-text-primary transition-colors group-hover:bg-text-primary group-hover:text-bg">
                →
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
