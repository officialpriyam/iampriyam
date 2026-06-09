import { SectionHeader } from "./SectionHeader";
import { motion } from "framer-motion";
import { useSiteContent } from "@/hooks/useSiteContent";

export function Skills() {
  const content = useSiteContent();
  const skills = content?.skills ?? [];

  return (
    <section id="skills" className="bg-bg py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <SectionHeader
          eyebrow="Capabilities"
          title="My"
          italicWord="skills"
          subtext="Tools and disciplines I work with day-to-day."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {skills.map((s, i) => (
            <motion.div
              key={s.name + i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: i * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
              className="group p-5 bg-surface/30 hover:bg-surface border border-stroke rounded-2xl transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {s.icon && s.icon.startsWith("http") ? (
                    <img src={s.icon} alt={s.name} className="w-7 h-7 object-contain" loading="lazy" />
                  ) : (
                    <span className="text-2xl">{s.icon}</span>
                  )}
                  <h3 className="text-base md:text-lg text-text-primary">{s.name}</h3>
                </div>
                <span className="text-xs text-muted font-display italic">{s.level}%</span>
              </div>
              <div className="relative w-full h-1.5 bg-stroke rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${s.level}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, delay: 0.2 + i * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
                  className="absolute inset-y-0 left-0 accent-gradient-anim rounded-full"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
