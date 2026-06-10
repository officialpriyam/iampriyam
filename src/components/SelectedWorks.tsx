import { SectionHeader } from "./SectionHeader";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Github } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";

export function SelectedWorks() {
  const content = useSiteContent();
  const projects = (content?.projects ?? []).filter((p) => p.featured).slice(0, 4);
  const spans = ["md:col-span-7", "md:col-span-5", "md:col-span-5", "md:col-span-7"];

  return (
    <section id="work" className="bg-bg py-12 md:py-16">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <SectionHeader
          eyebrow="Selected Work"
          title="Featured"
          italicWord="projects"
          subtext="A selection of projects I've worked on, from concept to launch."
          actionLabel="View all work"
          actionTo="/projects"
        />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
          {projects.map((p, i) => (
            <motion.div
              key={p.title + i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
              whileHover={{ y: -6 }}
              className={`group relative ${spans[i % 4]} aspect-[16/10] bg-surface border border-stroke rounded-3xl overflow-hidden block`}
            >
              <img
                src={p.img}
                alt={p.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 halftone opacity-20 mix-blend-multiply" />
              <div className="absolute inset-0 bg-bg/70 opacity-0 group-hover:opacity-100 backdrop-blur-lg transition-opacity duration-500 flex items-center justify-center">
                <div className="flex flex-wrap items-center justify-center gap-3 px-6">
                  <span className="w-full text-center text-text-primary font-display italic text-2xl">
                    {p.title}
                  </span>
                  {p.url && p.url !== "#" && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-white text-bg text-sm px-5 py-2 transition-transform hover:scale-105"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View
                    </a>
                  )}
                  {p.githubUrl && (
                    <a
                      href={p.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-bg/80 text-text-primary text-sm px-5 py-2 transition-transform hover:scale-105"
                    >
                      <Github className="w-4 h-4" />
                      GitHub
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-10 flex justify-center md:hidden">
          <Link
            to="/projects"
            className="text-sm text-text-primary border border-stroke rounded-full px-5 py-2.5"
          >
            View all projects
          </Link>
        </div>
      </div>
    </section>
  );
}
