import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { SceneShell } from "@/components/SceneShell";
import { AshokaChakra } from "@/components/AshokaChakra";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Privacy Raja — The DPDPA Compliance Battle" },
      {
        name: "description",
        content:
          "A 3D arcade-battle game themed on India's DPDPA 2023. Roll the fire-dice and conquer the 9 principles of data protection.",
      },
      { property: "og:title", content: "Privacy Raja — The DPDPA Compliance Battle" },
      {
        property: "og:description",
        content:
          "Conquer the 9 Principles. Master the Data Realm. Rule with Consent.",
      },
    ],
  }),
  component: BattleLoader,
});

const TAGLINES = [
  "Conquer the 9 Principles",
  "Master the Data Realm",
  "Rule with Consent",
];

const TITLE = "PRIVACY RAJA";

function BattleLoader() {
  const [tagIdx, setTagIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setTagIdx((i) => (i + 1) % TAGLINES.length),
      3000,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <SceneShell>
      <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
        {/* Spinning Chakra entrance */}
        <motion.div
          initial={{ opacity: 0, scale: 0.4, rotate: -180 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-6 text-[var(--gold)]"
        >
          <div className="animate-chakra-spin">
            <AshokaChakra size={140} />
          </div>
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              boxShadow:
                "0 0 60px 10px oklch(0.74 0.13 80 / 0.45), inset 0 0 30px oklch(0.78 0.18 50 / 0.3)",
            }}
          />
        </motion.div>

        {/* Title — staggered drop-in */}
        <h1 className="mb-3 select-none">
          <span className="sr-only">{TITLE}</span>
          <span className="flex flex-wrap items-end justify-center gap-x-2">
            {TITLE.split("").map((ch, i) => (
              <motion.span
                key={i}
                initial={{ y: -80, opacity: 0, rotate: -8 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{
                  delay: 0.6 + i * 0.06,
                  type: "spring",
                  stiffness: 220,
                  damping: 12,
                }}
                className="text-gold-glow inline-block font-display text-[clamp(2.6rem,9vw,7rem)] leading-none"
                aria-hidden
              >
                {ch === " " ? "\u00A0" : ch}
              </motion.span>
            ))}
          </span>
        </h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.7 }}
          className="ember-text mb-2 font-serif text-lg italic tracking-wide text-[var(--saffron)] md:text-2xl"
        >
          The DPDPA Compliance Battle
        </motion.p>

        {/* Tri-colour divider */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 220, opacity: 1 }}
          transition={{ delay: 1.9, duration: 0.8 }}
          className="my-6 h-[3px] overflow-hidden rounded-full"
          style={{
            background:
              "linear-gradient(90deg, #FF9933 0% 33.3%, #FFFFFF 33.3% 66.6%, #138808 66.6% 100%)",
            boxShadow: "0 0 18px oklch(0.74 0.13 80 / 0.6)",
          }}
        />

        {/* Cycling tagline */}
        <div className="relative h-9 md:h-11">
          <AnimatePresence mode="wait">
            <motion.p
              key={tagIdx}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.55 }}
              className="font-body text-base uppercase tracking-[0.4em] text-[var(--gold-soft)] md:text-lg"
            >
              {TAGLINES[tagIdx]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.4, duration: 0.7 }}
          className="mt-12"
        >
          <Link
            to="/mode-select"
            className="animate-pulse-glow group relative inline-flex items-center gap-3 rounded-full px-10 py-5 font-display text-xl tracking-widest text-[oklch(0.13_0.04_285)] md:text-2xl"
            style={{
              background:
                "linear-gradient(180deg, #FFE9A8 0%, #D4A017 60%, #8a6510 100%)",
              border: "1px solid #FFE9A8",
            }}
          >
            <span className="text-2xl transition-transform group-hover:-rotate-12 group-hover:scale-110">
              ⚔
            </span>
            <span>ENTER BATTLE</span>
            <span
              className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background:
                  "linear-gradient(180deg, transparent, oklch(1 0 0 / 0.25))",
              }}
            />
          </Link>
        </motion.div>

        {/* Footer credit */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3, duration: 1 }}
          className="absolute bottom-5 left-0 right-0 flex justify-between px-6 text-[10px] uppercase tracking-[0.35em] text-[var(--gold-soft)]/50 md:text-xs"
        >
          <span>DPDP Act 2023</span>
          <span>v0.1 · Pre-Alpha</span>
        </motion.div>
      </main>
    </SceneShell>
  );
}
