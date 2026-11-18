"use client";

import { motion } from "framer-motion";
import EsencelabLogo from "@/components/EsencelabLogo";
import { faqs, panelClass, mutedTextClass, eyebrowClass } from "@/components/landing/content";

export default function FaqSection() {
  return (
        <section
          className={`${panelClass} px-5 py-8 sm:px-8 lg:px-10 lg:py-12`}
        >
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <p className={eyebrowClass}>FAQ</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#111111] sm:text-5xl">
                Simple answers.
              </h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <motion.article
                  key={faq.question}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-[1.5rem] border border-black/10 bg-white/74 p-5"
                >
                  <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#111111]">
                    {faq.question}
                  </h3>
                  <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                    {faq.answer}
                  </p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
  );
}
