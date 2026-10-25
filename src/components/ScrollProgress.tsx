import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  return <motion.div aria-hidden="true" style={{ scaleX }} className="fixed inset-x-0 top-0 z-55 h-0.5 origin-left bg-linear-to-r from-brand-500 via-brand-400 to-accent-400" />;
}
