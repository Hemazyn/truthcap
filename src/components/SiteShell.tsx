"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useIsomorphicLayoutEffect } from "@/lib/useIsomorphicLayoutEffect";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, ShieldCheck } from "lucide-react";
import { routes } from "@/lib/router";
import { useStartRecord } from "@/lib/useStartRecord";
import { useTruthStore } from "@/store/useTruthStore";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/LogoMark";
import { ScrollProgress } from "@/components/ScrollProgress";

const FOOTER_TEMPLATES = [
  { id: "item-condition-agreement", label: "Item condition" },
  { id: "work-delivered-accepted", label: "Work delivered" },
  { id: "repair-agreed", label: "Repair agreed" },
  { id: "payment-schedule-agreed", label: "Payment schedule" },
  { id: "handover-acknowledged", label: "Handover" },
];

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-[11px] shadow-(--shadow-cta)">
        <LogoMark className="h-9 w-9" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-ink">TruthCap</span>
    </span>
  );
}

/**
 * The header, footer and page transition around every route. Records live in
 * localStorage, which the server cannot see, so the store is hydrated here
 * rather than at import time — otherwise the first render would differ from the
 * HTML the server sent.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrate = useTruthStore((state) => state.hydrate);
  const startRecord = useStartRecord();

  useIsomorphicLayoutEffect(() => {
    hydrate();
  }, [hydrate]);

  // Old hash URLs (/#/create) still arrive from links people already have, and
  // they can be reached with a hash change alone. This runs before the router is
  // ready, so it upgrades the address directly.
  useEffect(() => {
    const upgrade = () => {
      if (window.location.hash.startsWith("#/")) {
        window.location.replace(window.location.hash.slice(1) || "/");
      }
    };

    upgrade();
    window.addEventListener("hashchange", upgrade);

    return () => window.removeEventListener("hashchange", upgrade);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const jumpTo = (id: string) => {
    const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

    if (pathname !== "/") {
      router.push(routes.home());
      window.setTimeout(scroll, 120);
      return;
    }

    scroll();
  };

  const onHome = pathname === "/";

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <ScrollProgress />

      <motion.header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur print:hidden" initial={{ y: -18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href={routes.home()} className="rounded-xl transition hover:opacity-80" aria-label="TruthCap home">
            <Logo />
          </Link>

          <div className="flex items-center gap-2">
            <nav className="mr-1 flex items-center gap-5 text-sm font-medium text-ink-2">
              {onHome && (
                <>
                  <button type="button" onClick={() => jumpTo("how")} className="hidden hover:text-ink sm:inline">
                    How it works
                  </button>
                  <button type="button" onClick={() => jumpTo("templates")} className="hidden hover:text-ink sm:inline">
                    Templates
                  </button>
                </>
              )}
              <button type="button" onClick={() => router.push(routes.records())} aria-current={pathname === routes.records() ? "page" : undefined} className={pathname === routes.records() ? "text-ink" : "hover:text-ink"}>
                Records
              </button>
            </nav>

            {onHome ? (
              <Button size="sm" onClick={() => startRecord()}>
                Create a record
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => router.push(routes.home())}>
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back home</span>
              </Button>
            )}
          </div>
        </div>
      </motion.header>

      <motion.main key={pathname} className="flex-1" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </motion.main>

      <motion.footer className="border-t border-line bg-surface print:hidden" initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1.1fr] lg:gap-12">
            <div className="max-w-sm">
              <Logo />
              <p className="mt-4 text-sm leading-relaxed text-ink-2">A shared, timestamped record of what two people agreed — written in plain words, acknowledged by both, kept by both.</p>
              <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-brand-100 bg-brand-50/70 px-3.5 py-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                <p className="text-xs leading-relaxed font-medium text-brand-900">No account needed. Nothing hidden from either side.</p>
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">Product</h3>
              <ul className="mt-4 space-y-3 text-sm text-ink-2">
                <li>
                  <button type="button" onClick={() => startRecord()} className="hover:text-brand-700">
                    Create a record
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => jumpTo("how")} className="hover:text-brand-700">
                    How it works
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => jumpTo("templates")} className="hover:text-brand-700">
                    Templates
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => jumpTo("why")} className="hover:text-brand-700">
                    Why TruthCap
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => router.push(routes.records())} className="hover:text-brand-700">
                    Your records
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">Start from a template</h3>
              <ul className="mt-4 space-y-3 text-sm text-ink-2">
                {FOOTER_TEMPLATES.map((template) => (
                  <li key={template.id}>
                    <button type="button" onClick={() => startRecord(template.id)} className="group inline-flex items-center gap-1.5 text-left hover:text-brand-700">
                      {template.label}
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-line pt-6 sm:flex-row sm:items-center">
            <p className="text-xs text-ink-3">
              Developed by{" "}
              <a href="https://iamtofunmi.vercel.app/" target="_blank" rel="noopener" className="text-brand-600 underline underline-offset-2">
                devEmma
              </a>
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <p className="text-xs text-ink-3">Every record is timestamped and held by both people.</p>
              <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="inline-flex items-center gap-1 text-xs font-medium text-ink-2 hover:text-brand-700">
                Back to top
                <ArrowUp className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
