import { AnimatePresence, motion } from "framer-motion";
import { Share2, X } from "lucide-react";
import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useSiteContent } from "@/hooks/useSiteContent";

export function SocialLauncher() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const content = useSiteContent();
  const links = (content?.footer.socials ?? []).filter((link) => link.label && link.url);

  if (pathname.startsWith("/admin")) return null;
  if (links.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex flex-col items-end gap-2"
          >
            {links.map((link, index) => (
              <motion.a
                key={`${link.label}-${link.url}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.18, delay: index * 0.04 }}
                className="rounded-full border border-stroke bg-bg/90 px-4 py-2 text-xs uppercase tracking-[0.2em] text-text-primary shadow-lg shadow-black/30 backdrop-blur-md transition-transform hover:scale-105 hover:bg-surface"
              >
                {link.label}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        aria-label={open ? "Close social links" : "Open social links"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-text-primary text-bg shadow-xl shadow-black/40 transition-transform hover:scale-105"
      >
        <span className="absolute -inset-[2px] rounded-full accent-gradient-anim opacity-70" />
        <span className="relative flex h-full w-full items-center justify-center rounded-full bg-text-primary">
          {open ? <X className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        </span>
      </button>
    </div>
  );
}
