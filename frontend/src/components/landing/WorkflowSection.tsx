"use client";

import { motion } from "framer-motion";
import EsencelabLogo from "@/components/EsencelabLogo";
import { workflowSteps, panelClass, mutedTextClass, eyebrowClass } from "@/components/landing/content";

export default function WorkflowSection() {
  return (
        <section
          id="workflow"
          className={`${panelClass} scroll-mt-28 px-5 py-8 sm:px-8 lg:px-10 lg:py-12`}
        >
          <div className="mx-auto max-w-3xl text-center">
            <p className={eyebrowClass}>Workflow</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#111111] sm:text-5xl">
              From resume to shortlist.
            </h2>
          </div>
          <div className="mt-9 grid gap-4 lg:grid-cols-3">
            {workflowSteps.map((step) => (
              <motion.article
                key={step.step}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="rounded-[1.75rem] border border-black/10 bg-white/76 p-6"
              >
                <div className="text-5xl font-semibold tracking-[-0.08em] text-[#d6d2c8]">
                  {step.step}
                </div>
                <h3 className="mt-4 text-2xl font-semibold tracking-[-0.045em] text-[#111111]">
                  {step.title}
                </h3>
                <p className={`mt-3 text-sm leading-6 ${mutedTextClass}`}>
                  {step.description}
                </p>
              </motion.article>
            ))}
          </div>
        </section>
  );
}
