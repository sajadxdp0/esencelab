"use client";

import { motion } from "framer-motion";
import EsencelabLogo from "@/components/EsencelabLogo";
import { roleCards, panelClass, mutedTextClass, eyebrowClass } from "@/components/landing/content";

export default function RolesSection() {
  return (
        <section
          id="roles"
          className={`${panelClass} scroll-mt-28 px-5 py-8 sm:px-8 lg:px-10 lg:py-12`}
        >
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className={eyebrowClass}>Roles</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#111111] sm:text-5xl">
                Each team gets the view it needs.
              </h2>
            </div>
            <p className={`max-w-xl text-base leading-7 ${mutedTextClass}`}>
              The same data supports student preparation, recruiter review, and
              admin oversight.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {roleCards.map((card) => (
              <motion.article
                key={card.title}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="rounded-[1.75rem] border border-black/10 bg-white/72 p-5 transition hover:bg-white sm:p-6"
              >
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#737373]">
                  {card.title}
                </p>
                <p className={`mt-4 text-sm leading-6 ${mutedTextClass}`}>
                  {card.description}
                </p>
                <div className="mt-5 grid gap-2">
                  {card.details.map((detail) => (
                    <span
                      key={detail}
                      className="rounded-2xl bg-[#f4f3ef] px-3 py-2 text-sm font-medium text-[#343434]"
                    >
                      {detail}
                    </span>
                  ))}
                </div>
              </motion.article>
            ))}
          </div>
        </section>
  );
}
