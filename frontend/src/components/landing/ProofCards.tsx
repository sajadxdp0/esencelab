"use client";

import { motion } from "framer-motion";
import EsencelabLogo from "@/components/EsencelabLogo";
import { proofCards, panelClass, mutedTextClass } from "@/components/landing/content";

export default function ProofCards() {
  return (
        <section
          className="grid gap-4 md:grid-cols-3"
          aria-label="Product summary"
        >
          {proofCards.map((card) => (
            <motion.article
              key={card.label}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className={`${panelClass} p-5 sm:p-6`}
            >
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#555555]">
                {card.label}
              </p>
              <p className="mt-4 text-5xl font-semibold tracking-[-0.08em] text-[#111111]">
                {card.value}
              </p>
              <p className={`mt-3 text-sm leading-6 ${mutedTextClass}`}>
                {card.description}
              </p>
            </motion.article>
          ))}
        </section>
  );
}
