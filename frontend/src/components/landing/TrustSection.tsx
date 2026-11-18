"use client";

import { motion } from "framer-motion";
import EsencelabLogo from "@/components/EsencelabLogo";
import { trustItems, panelClass, mutedTextClass, eyebrowClass } from "@/components/landing/content";

export default function TrustSection() {
  return (
        <section
          id="trust"
          className="grid scroll-mt-28 gap-4 lg:grid-cols-[0.92fr_1.08fr]"
        >
          <div className={`${panelClass} px-5 py-8 sm:px-8 lg:px-10`}>
            <p className={eyebrowClass}>Trust</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#111111] sm:text-5xl">
              Built for real use, not just a demo flow.
            </h2>
            <p className={`mt-5 text-base leading-7 ${mutedTextClass}`}>
              The app is split into frontend, backend, AI service, and database
              layers so each part has a clear job.
            </p>
          </div>

          <div className={`${panelClass} p-5 sm:p-6`}>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#6a6a6a]">
              Basics covered
            </p>
            <div className="mt-5 space-y-3">
              {trustItems.map((item) => (
                <motion.div
                  key={item}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-3xl border border-black/10 bg-white/74 p-4 text-sm leading-6 text-[#454545]"
                >
                  {item}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
  );
}
