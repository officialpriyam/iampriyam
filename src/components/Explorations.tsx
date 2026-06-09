import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSiteContent } from "@/hooks/useSiteContent";

gsap.registerPlugin(ScrollTrigger);

export function Explorations() {
  const content = useSiteContent();
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const colARef = useRef<HTMLDivElement>(null);
  const colBRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const images = content?.playground.images ?? [];

  useEffect(() => {
    if (!content) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom bottom",
        pin: contentRef.current,
        pinSpacing: false,
      });
      gsap.to(colARef.current, {
        y: -200,
        ease: "none",
        scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: true },
      });
      gsap.to(colBRef.current, {
        y: -400,
        ease: "none",
        scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: true },
      });
    }, sectionRef);
    // Refresh after layout settles (loading screen, fonts, images)
    const timers = [100, 800, 2000, 3200].map((t) =>
      window.setTimeout(() => ScrollTrigger.refresh(), t),
    );
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("load", refresh);
      ctx.revert();
    };
  }, [content]);

  if (!content) return null;
  const colA = images.slice(0, Math.ceil(images.length / 2));
  const colB = images.slice(Math.ceil(images.length / 2));
  const pg = content.playground;

  return (
    <section ref={sectionRef} className="relative min-h-[300vh] bg-bg overflow-hidden">
      <div
        ref={contentRef}
        className="relative z-10 h-screen flex flex-col items-center justify-center px-6 text-center max-w-2xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-5">
          <span className="w-8 h-px bg-stroke" />
          <span className="text-xs text-muted uppercase tracking-[0.3em]">Explorations</span>
          <span className="w-8 h-px bg-stroke" />
        </div>
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-body font-light text-text-primary leading-tight mb-4">
          {pg.title} <span className="font-display italic">{pg.italic}</span>
        </h2>
        <p className="text-sm md:text-base text-muted mb-8 max-w-md">{pg.subtitle}</p>
        <a href={pg.ctaUrl} className="group relative rounded-full">
          <span className="absolute -inset-[2px] rounded-full accent-gradient-anim opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative inline-flex items-center gap-2 bg-surface text-text-primary text-sm px-5 py-2.5 rounded-full border border-stroke">
            {pg.ctaLabel} →
          </span>
        </a>
      </div>

      <div className="absolute inset-0 z-20 pointer-events-none">
        <div className="grid grid-cols-2 gap-12 md:gap-40 max-w-[1400px] mx-auto px-6 md:px-12 pt-[20vh]">
          <div ref={colARef} className="flex flex-col gap-12 md:gap-20 pt-0 md:pt-24">
            {colA.map((src, i) => (
              <button
                key={src + i}
                onClick={() => setLightbox(src)}
                style={{ transform: `rotate(${i % 2 === 0 ? -2 : 3}deg)` }}
                className="pointer-events-auto block w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden border border-stroke shadow-2xl shadow-black/40"
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <div ref={colBRef} className="flex flex-col gap-12 md:gap-20 pt-24 md:pt-48 ml-auto">
            {colB.map((src, i) => (
              <button
                key={src + i}
                onClick={() => setLightbox(src)}
                style={{ transform: `rotate(${i % 2 === 0 ? 2 : -3}deg)` }}
                className="pointer-events-auto block w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden border border-stroke shadow-2xl shadow-black/40"
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[100] bg-bg/90 backdrop-blur-xl flex items-center justify-center p-6 cursor-zoom-out"
        >
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-2xl border border-stroke" />
        </div>
      )}
    </section>
  );
}
