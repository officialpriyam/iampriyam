import { useEffect, useRef } from "react";

const INTERACTIVE_SELECTOR =
  "a, button, input, textarea, select, label, [role='button'], [data-cursor='interactive']";

export function CursorGlow() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    if (!finePointer.matches) return;

    const body = document.body;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let ringX = targetX;
    let ringY = targetY;
    let frame = 0;

    body.classList.add("cursor-enhanced");

    const setInteractive = (target: EventTarget | null) => {
      const element = target instanceof Element ? target.closest(INTERACTIVE_SELECTOR) : null;
      body.classList.toggle("cursor-interactive", Boolean(element));
    };

    const handleMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      body.classList.add("cursor-ready");
      dotRef.current?.style.setProperty(
        "transform",
        `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`,
      );
      setInteractive(event.target);
    };

    const handleDown = () => body.classList.add("cursor-down");
    const handleUp = () => body.classList.remove("cursor-down");
    const handleLeave = () => body.classList.remove("cursor-ready", "cursor-interactive");
    const handleOver = (event: PointerEvent) => setInteractive(event.target);

    const animate = () => {
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      ringRef.current?.style.setProperty(
        "transform",
        `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`,
      );
      frame = window.requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerover", handleOver, { passive: true });
    window.addEventListener("pointerdown", handleDown);
    window.addEventListener("pointerup", handleUp);
    document.documentElement.addEventListener("mouseleave", handleLeave);
    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerover", handleOver);
      window.removeEventListener("pointerdown", handleDown);
      window.removeEventListener("pointerup", handleUp);
      document.documentElement.removeEventListener("mouseleave", handleLeave);
      body.classList.remove("cursor-enhanced", "cursor-ready", "cursor-interactive", "cursor-down");
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="site-cursor" aria-hidden="true" />
      <div ref={dotRef} className="site-cursor-dot" aria-hidden="true" />
    </>
  );
}
