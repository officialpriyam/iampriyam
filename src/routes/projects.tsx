import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ExternalLink, Github } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useSiteContent } from "@/hooks/useSiteContent";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "All Projects - Portfolio" },
      { name: "description", content: "Full archive of projects." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const content = useSiteContent();
  const projects = content?.projects ?? [];

  return (
    <main className="bg-bg text-text-primary font-body min-h-screen">
      <Navbar />
      <section className="pt-32 md:pt-40 pb-20 max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <p className="text-xs text-muted uppercase tracking-[0.3em] mb-5">Archive</p>
          <h1 className="text-5xl md:text-7xl font-body font-light leading-tight">
            All <span className="font-display italic">projects</span>
          </h1>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p, i) => (
            <motion.div
              key={p.title + i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: (i % 9) * 0.05 }}
              whileHover={{ y: -6 }}
              className="group relative aspect-[4/3] bg-surface border border-stroke rounded-2xl overflow-hidden"
            >
              <img
                src={p.img}
                alt={p.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-bg/90 to-transparent">
                <p className="text-sm font-display italic">{p.title}</p>
              </div>
              <div className="absolute inset-0 bg-bg/70 opacity-0 group-hover:opacity-100 backdrop-blur-lg transition-opacity duration-500 flex items-center justify-center">
                <div className="flex flex-wrap items-center justify-center gap-3 px-5">
                  <span className="w-full text-center text-text-primary font-display italic text-xl">
                    {p.title}
                  </span>
                  {p.url && p.url !== "#" && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-white text-bg text-sm px-4 py-2 transition-transform hover:scale-105"
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
                      className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-bg/80 text-text-primary text-sm px-4 py-2 transition-transform hover:scale-105"
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

        {projects.length === 0 && (
          <p className="text-muted text-center py-20">No projects yet.</p>
        )}

        <div className="mt-12 flex justify-center">
          <Link to="/" className="text-sm text-muted hover:text-text-primary">
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}
