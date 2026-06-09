import { motion } from "framer-motion";
import { useSiteContent } from "@/hooks/useSiteContent";

export function Stats() {
  const content = useSiteContent();
  if (!content || !content.stats.visible || content.stats.items.length === 0) return null;

  return (
    <section className="bg-bg py-16 md:py-24 border-t border-stroke">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16 grid grid-cols-1 md:grid-cols-3 gap-10">
        {content.stats.items.map((s, i) => (
          <motion.div
            key={s.label + i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center md:text-left"
          >
            <div className="text-6xl md:text-7xl lg:text-8xl font-display italic text-text-primary mb-2">
              {s.value}
            </div>
            <div className="text-xs text-muted uppercase tracking-[0.3em]">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
