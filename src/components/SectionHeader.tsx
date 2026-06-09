import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";

export function SectionHeader({
  eyebrow,
  title,
  italicWord,
  subtext,
  actionLabel,
  actionTo,
  actionHref,
}: {
  eyebrow: string;
  title: string;
  italicWord: string;
  subtext: string;
  actionLabel?: string;
  actionTo?: string;
  actionHref?: string;
}) {
  const ActionInner = actionLabel ? (
    <>
      <span className="absolute -inset-[2px] rounded-full accent-gradient-anim opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="relative inline-flex items-center gap-2 bg-surface text-text-primary text-sm px-5 py-2.5 rounded-full border border-stroke">
        {actionLabel} <span>→</span>
      </span>
    </>
  ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 md:mb-16"
    >
      <div className="max-w-xl">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-8 h-px bg-stroke" />
          <span className="text-xs text-muted uppercase tracking-[0.3em]">{eyebrow}</span>
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-body font-light text-text-primary leading-tight mb-4">
          {title} <span className="font-display italic text-text-primary">{italicWord}</span>
        </h2>
        <p className="text-sm md:text-base text-muted">{subtext}</p>
      </div>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="group relative hidden md:inline-flex self-start rounded-full">
          {ActionInner}
        </Link>
      )}
      {actionLabel && !actionTo && (
        <a href={actionHref || "#"} className="group relative hidden md:inline-flex self-start rounded-full">
          {ActionInner}
        </a>
      )}
    </motion.div>
  );
}
