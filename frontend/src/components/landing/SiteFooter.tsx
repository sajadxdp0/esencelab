"use client";

import EsencelabLogo from "@/components/EsencelabLogo";
import { navItems, panelClass, mutedTextClass } from "@/components/landing/content";

interface SiteFooterProps {
  year: number;
}

export default function SiteFooter({ year }: SiteFooterProps) {
  return (
        <footer className={`${panelClass} px-5 py-7 sm:px-8`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <EsencelabLogo textClassName="tracking-[0.18em]" />
              <p className={`mt-3 text-sm ${mutedTextClass}`}>
                A clearer placement workflow for students, recruiters, and
                admins.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm font-semibold text-[#3d3d3d]">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="transition hover:text-black"
                >
                  {item.label}
                </a>
              ))}
            </div>
            <p className="text-sm text-[#686868]">© {year} Esencelab</p>
          </div>
        </footer>
  );
}
