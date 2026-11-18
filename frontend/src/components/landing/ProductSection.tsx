"use client";

import { motion } from "framer-motion";
import EsencelabLogo from "@/components/EsencelabLogo";
import { productPoints, panelClass, eyebrowClass } from "@/components/landing/content";

export default function ProductSection() {
  return (
        <section
          id="product"
          className={`${panelClass} scroll-mt-28 px-5 py-8 sm:px-8 lg:px-10 lg:py-12`}
        >
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <p className={eyebrowClass}>Product</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#111111] sm:text-5xl">
                One place for the work around placement.
              </h2>
            </div>
            <div className="grid gap-3">
              {productPoints.map((point) => (
                <motion.div
                  key={point}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-3xl border border-black/10 bg-white/74 p-4 text-sm font-medium leading-6 text-[#3e3e3e]"
                >
                  {point}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
  );
}
