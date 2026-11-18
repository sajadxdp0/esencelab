"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import EsencelabLogo from "@/components/EsencelabLogo";
import { productPoints, resumeSignals, candidates, primaryButtonClass, secondaryButtonClass, panelClass, mutedTextClass, eyebrowClass, fadeUp, softFloat } from "@/components/landing/content";

export default function HeroSection() {
  return (
        <section className={`${panelClass} overflow-hidden`}>
          <div className="grid items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[0.96fr_1.04fr] lg:px-10 lg:py-12">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.42 }}
              className="max-w-3xl"
            >
              <p className={eyebrowClass}>Placement, made clearer</p>

              <h1 className="mt-5 max-w-4xl text-[2.45rem] font-semibold leading-[1.02] tracking-[-0.055em] text-[#101010] sm:text-[4.55rem] sm:leading-[0.96] sm:tracking-[-0.075em] lg:text-[5.45rem]">
                A cleaner way to prepare and shortlist students.
              </h1>

              <p
                className={`mt-6 max-w-2xl text-lg leading-8 ${mutedTextClass} sm:text-xl sm:leading-9`}
              >
                Esencelab connects resumes, skills, learning plans, jobs, and
                applications in one calm workflow for placement teams.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className={primaryButtonClass}>
                  Create account
                </Link>
                <Link
                  href="/login?next=%2Fdashboard"
                  className={secondaryButtonClass}
                >
                  Open dashboard
                </Link>
                <Link
                  href="/recruiter-request"
                  className={secondaryButtonClass}
                >
                  Recruiter request
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.45 }}
              className="relative"
            >
              <motion.div
                animate={softFloat}
                className="rounded-[2rem] border border-black/10 bg-[#111111] p-2 shadow-[0_42px_100px_-56px_rgba(0,0,0,0.85)]"
              >
                <div className="rounded-[1.55rem] border border-white/10 bg-[#f8f7f2] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#777777]">
                        Candidate profile
                      </p>
                      <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[#111111]">
                        Backend Developer
                      </h2>
                    </div>
                    <div className="rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-white">
                      84%
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-[0.92fr_1.08fr]">
                    <div className="rounded-3xl border border-black/10 bg-white p-4">
                      <p className="text-sm font-semibold text-[#1f1f1f]">
                        Resume signals
                      </p>
                      <div className="mt-4 space-y-3">
                        {resumeSignals.map((signal) => (
                          <div key={signal.skill}>
                            <div className="mb-1 flex items-center justify-between text-xs text-[#696969]">
                              <span>{signal.skill}</span>
                              <span>{signal.score}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-[#eceae4]">
                              <motion.div
                                className="h-full rounded-full bg-[#111111]"
                                initial={{ width: 0 }}
                                animate={{ width: `${signal.score}%` }}
                                transition={{ delay: 0.35, duration: 0.8 }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-black/10 bg-white p-4">
                      <p className="text-sm font-semibold text-[#1f1f1f]">
                        Shortlist view
                      </p>
                      <div className="mt-4 space-y-2">
                        {candidates.map((candidate) => (
                          <motion.div
                            key={candidate.name}
                            whileHover={{ x: 3 }}
                            transition={{ duration: 0.18 }}
                            className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl bg-[#f4f3ef] px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-semibold text-[#222222]">
                                {candidate.name}
                              </p>
                              <p className="text-xs text-[#6a6a6a]">
                                {candidate.role}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-[#111111]">
                                {candidate.match}%
                              </p>
                              <p className="text-xs text-[#6a6a6a]">
                                {candidate.status}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {productPoints.slice(0, 3).map((point) => (
                      <div
                        key={point}
                        className="rounded-2xl border border-black/10 bg-white px-3 py-3 text-xs font-medium leading-5 text-[#4b4b4b]"
                      >
                        {point}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>
  );
}
