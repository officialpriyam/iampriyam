import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useSiteContent } from "@/hooks/useSiteContent";

const NAV = [
  { label: "Home", href: "#home" },
  { label: "Work", href: "#work" },
  { label: "Skills", href: "#skills" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const content = useSiteContent();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const logo = content?.hero.logo;
  const initials = (content?.hero.name || "MS").split(" ").map((w) => w[0]).join("").slice(0, 2);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 md:pt-6 px-4">
      <div
        className={`inline-flex items-center rounded-full backdrop-blur-md border border-white/10 bg-surface/80 px-2 py-2 transition-shadow ${
          scrolled ? "shadow-md shadow-black/30" : ""
        }`}
      >
        <Link to="/" className="group relative w-9 h-9 rounded-full p-px overflow-hidden">
          <span className="absolute inset-0 rounded-full accent-gradient-anim group-hover:[animation-direction:reverse]" />
          <span className="relative flex items-center justify-center w-full h-full rounded-full bg-bg overflow-hidden">
            {logo ? (
              <img src={logo} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="font-display italic text-[13px]">{initials}</span>
            )}
          </span>
        </Link>

        <div className="hidden sm:block w-px h-5 bg-stroke mx-1" />

        {pathname === "/" ? (
          NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-muted hover:text-text-primary hover:bg-stroke/50 transition-colors"
            >
              {item.label}
            </a>
          ))
        ) : (
          <Link to="/" className="text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-muted hover:text-text-primary hover:bg-stroke/50">
            Home
          </Link>
        )}

        <div className="hidden sm:block w-px h-5 bg-stroke mx-1" />

        <a href="#contact" className="group relative text-xs sm:text-sm rounded-full">
          <span className="absolute -inset-[2px] rounded-full accent-gradient-anim opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative inline-flex items-center gap-1 bg-surface rounded-full backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 text-text-primary">
            Say hi <span className="text-[10px]">↗</span>
          </span>
        </a>
      </div>
    </nav>
  );
}
