"use client";

import { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import EsencelabLogo from "@/components/EsencelabLogo";
import { navItems, primaryButtonClass, secondaryButtonClass } from "@/components/landing/content";

interface SiteHeaderProps {
  isMenuOpen: boolean;
  setIsMenuOpen: Dispatch<SetStateAction<boolean>>;
}

export default function SiteHeader({ isMenuOpen, setIsMenuOpen }: SiteHeaderProps) {
  return (
      <header className="fixed inset-x-0 top-0 z-50 px-4 py-4 sm:px-6 lg:px-8">
        <div
          className={`mx-auto max-w-7xl border border-white/75 bg-white/78 px-4 py-3 shadow-[0_24px_70px_-50px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-[border-radius] sm:px-5 ${
            isMenuOpen ? "rounded-[2rem]" : "rounded-full"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex shrink-0"
              aria-label="Esencelab home"
            >
              <EsencelabLogo textClassName="tracking-[0.18em]" />
            </Link>

            <nav
              className="hidden items-center gap-7 text-sm font-semibold text-[#3c3c3c] lg:flex"
              aria-label="Primary navigation"
            >
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="transition hover:text-[#111111]"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <Link
                href="/login"
                className="px-3 py-2 text-sm font-semibold text-[#181818] transition hover:text-black/70"
              >
                Login
              </Link>
              <Link
                href="/recruiter-request"
                className="px-3 py-2 text-sm font-semibold text-[#181818] transition hover:text-black/70"
              >
                Recruiter access
              </Link>
              <Link
                href="/register"
                className={`${primaryButtonClass} min-h-[42px] px-5 py-2`}
              >
                Start now
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setIsMenuOpen((current: boolean) => !current)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-black/10 bg-white/82 px-4 text-sm font-semibold text-[#111111] transition hover:bg-white lg:hidden"
              aria-controls="mobile-navigation"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? "Close" : "Menu"}
            </button>
          </div>

          {isMenuOpen && (
            <div
              id="mobile-navigation"
              className="mt-3 space-y-2 rounded-[1.5rem] border border-black/10 bg-white/90 p-3 lg:hidden"
            >
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#222222] transition hover:bg-[#f4f4f0]"
                >
                  {item.label}
                </a>
              ))}
              <div className="grid gap-2 pt-2 sm:grid-cols-3">
                <Link href="/login" className={secondaryButtonClass}>
                  Login
                </Link>
                <Link
                  href="/recruiter-request"
                  className={secondaryButtonClass}
                >
                  Recruiter access
                </Link>
                <Link href="/register" className={primaryButtonClass}>
                  Start now
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>
  );
}
