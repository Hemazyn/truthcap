import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ReactNode, RefObject } from "react";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export type MotionFrom = "up" | "down" | "left" | "right" | "zoom";

const REVEAL_OFFSETS: Record<MotionFrom, { x?: number; y?: number; scale?: number }> = {
  up: { y: 28 },
  down: { y: -28 },
  left: { x: -40 },
  right: { x: 40 },
  zoom: { scale: 0.94 },
};

const ITEM_OFFSETS: Record<"rise" | "flip" | "slide" | "pop", { x?: number; y?: number; scale?: number; rotateX?: number }> = {
  rise: { y: 26 },
  flip: { y: 34, rotateX: 18 },
  slide: { x: -44 },
  pop: { scale: 0.9 },
};

/** Fires once when at least `amount` of the element enters the viewport. */
function useInViewOnce<T extends HTMLElement>(amount: number) {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: amount },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [amount]);

  return { ref, shown };
}

export function Reveal({ children, className, delay = 0, from = "up", amount = 0.2 }: { children: ReactNode; className?: string; delay?: number; from?: MotionFrom; amount?: number }) {
  const { ref, shown } = useInViewOnce<HTMLDivElement>(amount);
  const hidden = { opacity: 0, ...REVEAL_OFFSETS[from] };

  return (
    <motion.div ref={ref} className={className} initial={hidden} animate={shown ? { opacity: 1, x: 0, y: 0, scale: 1 } : hidden} transition={{ duration: 0.75, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

/** Layout container for staggered children; each child observes its own visibility. */
export function Stagger({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "ol" }) {
  const Component = as === "ol" ? motion.ol : motion.div;
  return <Component className={className}>{children}</Component>;
}

export function StaggerItem({ children, className, as = "div", from = "rise", index = 0 }: { children: ReactNode; className?: string; as?: "div" | "li"; from?: keyof typeof ITEM_OFFSETS; index?: number }) {
  const { ref, shown } = useInViewOnce<HTMLElement>(0.2);
  const hidden = { opacity: 0, ...ITEM_OFFSETS[from] };
  const animate = shown ? { opacity: 1, x: 0, y: 0, rotateX: 0, scale: 1 } : hidden;
  const transition = { duration: 0.7, delay: index * 0.08, ease: EASE };
  const style = from === "flip" ? { transformPerspective: 1000 } : undefined;

  if (as === "li") {
    return (
      <motion.li ref={ref as RefObject<HTMLLIElement>} className={className} initial={hidden} animate={animate} transition={transition} style={style}>
        {children}
      </motion.li>
    );
  }

  return (
    <motion.div ref={ref as RefObject<HTMLDivElement>} className={className} initial={hidden} animate={animate} transition={transition} style={style}>
      {children}
    </motion.div>
  );
}

/** Masked line-by-line reveal: each line slides up from behind a clip. */
export function MaskLines({ lines, className, delay = 0 }: { lines: ReactNode[]; className?: string; delay?: number }) {
  const { ref, shown } = useInViewOnce<HTMLSpanElement>(0.4);

  return (
    <span ref={ref} className={className}>
      {lines.map((line, index) => (
        <span key={index} className="block overflow-hidden pb-[0.06em]">
          <motion.span className="block" initial={{ y: "110%" }} animate={shown ? { y: "0%" } : { y: "110%" }} transition={{ duration: 0.85, delay: delay + index * 0.11, ease: EASE }}>
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Masked word-by-word reveal for longer headings. */
export function MaskWords({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(" ");
  const { ref, shown } = useInViewOnce<HTMLSpanElement>(0.3);

  return (
    <span ref={ref} className={className}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block overflow-hidden pb-[0.06em] align-bottom">
          <motion.span className="inline-block" initial={{ y: "110%", opacity: 0 }} animate={shown ? { y: "0%", opacity: 1 } : { y: "110%", opacity: 0 }} transition={{ duration: 0.7, delay: delay + index * 0.035, ease: EASE }}>
            {word}
            {index < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
