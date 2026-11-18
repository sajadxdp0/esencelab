"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import SiteHeader from "@/components/landing/SiteHeader";
import HeroSection from "@/components/landing/HeroSection";
import ProofCards from "@/components/landing/ProofCards";
import ProductSection from "@/components/landing/ProductSection";
import WorkflowSection from "@/components/landing/WorkflowSection";
import RolesSection from "@/components/landing/RolesSection";
import TrustSection from "@/components/landing/TrustSection";
import FaqSection from "@/components/landing/FaqSection";
import CtaSection from "@/components/landing/CtaSection";
import SiteFooter from "@/components/landing/SiteFooter";

export default function HomePage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const year = new Date().getFullYear();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router, user]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="app-page-surface flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-black/15 border-t-[#111111]" />
      </div>
    );
  }

  return (
    <div className="app-page-surface min-h-screen overflow-x-hidden text-[#101010] antialiased">
      <div className="pointer-events-none fixed inset-0 app-page-surface" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.2] [background-image:linear-gradient(to_right,rgba(20,20,20,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(20,20,20,0.055)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
      <motion.div
        className="pointer-events-none fixed left-[7%] top-[18%] h-28 w-28 rounded-full bg-white/50 blur-2xl"
        animate={{ x: [0, 18, 0], y: [0, -12, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none fixed bottom-[12%] right-[10%] h-36 w-36 rounded-full bg-[#d8d6cf]/40 blur-3xl"
        animate={{ x: [0, -16, 0], y: [0, 14, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      <SiteHeader isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-8 pt-28 sm:px-6 lg:px-8 lg:pb-10 lg:pt-32">
        <HeroSection />
        <ProofCards />
        <ProductSection />
        <WorkflowSection />
        <RolesSection />
        <TrustSection />
        <FaqSection />
        <CtaSection />
        <SiteFooter year={year} />
      </main>
    </div>
  );
}
