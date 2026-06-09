import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { BackgroundVideo } from "./BackgroundVideo";
import { motion } from "framer-motion";
import { useSiteContent } from "@/hooks/useSiteContent";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const content = useSiteContent();
  const roles = content?.hero.roles ?? ["Creative"];
  const [roleIdx, setRoleIdx] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setRoleIdx((r) => (r + 1) % roles.length), 2000);
    return () => clearInterval(i);
  }, [roles.length]);

  useEffect(() => {
    if (!content) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".name-reveal", { opacity: 0, y: 60, duration: 1.2, delay: 0.1 });
      tl.from(".blur-in", { opacity: 0, filter: "blur(10px)", y: 20, duration: 1, stagger: 0.1 }, 0.3);
    }, ref);
    return () => ctx.revert();
  }, [content]);

  if (!content) return <section className="min-h-screen bg-bg" />;
  const h = content.hero;

  return (
    <section
      id="home"
      ref={ref}
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-center"
    >
      <BackgroundVideo />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-bg to-transparent" />

      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto flex flex-col items-center">
        {h.pfp && (
          <motion.img
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            src={h.pfp}
            alt={h.name}
            className="w-24 h-24 rounded-full object-cover mb-6 border-2 border-stroke"
          />
        )}
        <p className="blur-in text-xs text-muted uppercase tracking-[0.3em] mb-8">{h.eyebrow}</p>
        <h1 className="name-reveal text-6xl md:text-8xl lg:text-9xl font-display italic leading-[0.9] tracking-tight text-text-primary mb-6">
          {h.name}
        </h1>
        <p className="blur-in text-lg md:text-xl text-text-primary/90 mb-4">
          A{" "}
          <span
            key={roleIdx}
            className="font-display italic text-text-primary animate-role-fade-in inline-block"
          >
            {roles[roleIdx]}
          </span>{" "}
          {h.tagline}
        </p>
        <p className="blur-in text-sm md:text-base text-muted max-w-md mb-12">{h.bio}</p>
        <div className="blur-in inline-flex flex-wrap justify-center gap-4">
          <a href="#work" className="group relative rounded-full overflow-hidden transition-transform hover:scale-105">
            <span className="absolute inset-0 accent-gradient-anim opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative block bg-text-primary text-bg group-hover:bg-bg group-hover:text-text-primary text-sm px-7 py-3.5 rounded-full m-[2px] transition-colors">
              See Works
            </span>
          </a>
          <a href="#contact" className="group relative rounded-full transition-transform hover:scale-105">
            <span className="absolute inset-0 accent-gradient-anim opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
            <span className="relative block bg-bg text-text-primary text-sm px-7 py-3.5 rounded-full border-2 border-stroke group-hover:border-transparent">
              Reach out...
            </span>
          </a>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-10">
        <span className="text-xs text-muted uppercase tracking-[0.2em]">SCROLL</span>
        <div className="relative w-px h-10 bg-stroke overflow-hidden">
          <div className="absolute inset-x-0 h-4 accent-gradient animate-scroll-down" />
        </div>
      </div>
    </section>
  );
}
