"use client";

import Link from "next/link";
import EsencelabLogo from "@/components/EsencelabLogo";
import {  } from "@/components/landing/content";

export default function CtaSection() {
  return (
        <section className="overflow-hidden rounded-[2.25rem] bg-[#111111] px-5 py-10 text-center text-white shadow-[0_34px_100px_-58px_rgba(0,0,0,0.9)] sm:px-8 lg:px-10 lg:py-14">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
              Start with one student profile.
            </h2>
            <p className="mt-5 text-base leading-7 text-white/70 sm:text-lg">
              Then connect preparation, matching, applications, and review in
              the same place.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-bold text-[#111111] transition hover:-translate-y-0.5 hover:bg-[#f2f2f2]"
              >
                Get started
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/20 px-7 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
  );
}
