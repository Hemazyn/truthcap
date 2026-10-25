import { ArrowRight, Home } from "lucide-react";
import { motion } from "framer-motion";
import { navigate, routes } from "@/lib/router";
import { Button } from "@/components/ui/Button";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
      <motion.div className="relative" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
        <span aria-hidden="true" className="pointer-events-none absolute top-6 left-1/2 -z-10 h-40 w-40 -translate-x-1/2 rounded-full bg-brand-200/60 blur-3xl" />

        <p aria-hidden="true" className="font-display text-[7rem] leading-none text-brand-600 sm:text-[9rem]">
          {"404".split("").map((digit, index) => (
            <motion.span key={`${digit}-${index}`} className="inline-block" initial={{ y: 48, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, delay: 0.1 + index * 0.09, ease: EASE }}>
              {digit}
            </motion.span>
          ))}
        </p>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35, ease: EASE }}>
          <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">This page does not exist.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-2 sm:text-base">The link may be mistyped or the page has moved. Head back home, or start a fresh record — that part still works.</p>
        </motion.div>

        <motion.div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5, ease: EASE }}>
          <Button onClick={() => navigate(routes.home())}>
            <Home className="h-4 w-4" />
            Back home
          </Button>
          <Button variant="secondary" onClick={() => navigate(routes.create())}>
            Create a record
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
