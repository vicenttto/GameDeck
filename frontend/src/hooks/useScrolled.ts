import { useEffect, useRef, useState } from "react";

export function useScrolled(threshold = 60) {
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef(false);

  useEffect(() => {
    const handler = () => {
      const next = window.scrollY > threshold;
      if (next !== ref.current) {
        ref.current = next;
        setScrolled(next);
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [threshold]);

  return scrolled;
}
