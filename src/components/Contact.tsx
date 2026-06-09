import { useEffect, useRef } from "react";
import gsap from "gsap";
import { BackgroundVideo } from "./BackgroundVideo";
import { useSiteContent } from "@/hooks/useSiteContent";

export function Contact() {
  const marqueeRef = useRef<HTMLDivElement>(null);
  const content = useSiteContent();

  useEffect(() => {
    if (!marqueeRef.current) return;
    const anim = gsap.to(marqueeRef.current, { xPercent: -50, duration: 40, ease: "none", repeat: -1 });
    return () => {
      anim.kill();
    };
  }, []);

  if (!content) return null;
  const f = content.footer;

  return (
    <footer id="contact" className="relative bg-bg pt-16 md:pt-20 pb-8 md:pb-12 overflow-hidden">
      <div className="absolute inset-0">
        <BackgroundVideo flipped />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-bg to-transparent" />
      </div>

      <div className="relative z-10">
        <div className="overflow-hidden mb-12 md:mb-16">
          <div ref={marqueeRef} className="flex whitespace-nowrap will-change-transform">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className="text-6xl md:text-8xl lg:text-9xl font-display italic text-text-primary/80 px-6">
                BUILDING THE FUTURE •
              </span>
            ))}
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16 text-center">
          <p className="text-xs text-muted uppercase tracking-[0.3em] mb-6">Get in touch</p>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-display italic text-text-primary mb-10">
            Let's create together.
          </h2>
          <a href={`mailto:${f.email}`} className="group relative inline-flex rounded-full">
            <span className="absolute -inset-[2px] rounded-full accent-gradient-anim opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative inline-flex items-center gap-2 bg-text-primary text-bg text-sm px-7 py-3.5 rounded-full">
              {f.email} ↗
            </span>
          </a>
        </div>

        <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16 mt-20 md:mt-28 pt-8 border-t border-stroke flex flex-col md:flex-row items-center justify-between gap-6">
          {f.available && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                <span className="relative w-2 h-2 rounded-full bg-green-500" />
              </span>
              Available for projects
            </div>
          )}
          <div className="flex items-center gap-6 flex-wrap justify-center">
            {f.socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted hover:text-text-primary transition-colors uppercase tracking-[0.2em]"
              >
                {s.label}
              </a>
            ))}
          </div>
          <p className="text-xs text-muted">© {new Date().getFullYear()} {f.name}</p>
        </div>
      </div>
    </footer>
  );
}
