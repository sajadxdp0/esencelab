"use client";

import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { getFeedbackClassName } from "@/components/studentUpskilling/format";
import { FeedbackState } from "@/components/studentUpskilling/types";

type FeedbackVariant = "compact" | "full";

const variantConfig: Record<
  FeedbackVariant,
  {
    initial: { opacity: number; y?: number; height?: number };
    animate: { opacity: number; y?: number; height?: string | number };
    exit: { opacity: number; y?: number; height?: number };
    className: string;
  }
> = {
  compact: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    className: "mt-6 rounded-xl border px-4 py-3 text-sm flex items-center gap-3",
  },
  full: {
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: "auto" },
    exit: { opacity: 0, height: 0 },
    className:
      "rounded-2xl border-[0.5px] px-4 py-3 text-sm font-medium font-sans flex flex-wrap items-center gap-3 shadow-sm sm:px-6 sm:py-4",
  },
};

interface FeedbackBannerProps {
  feedback: FeedbackState;
  variant?: FeedbackVariant;
}

export default function FeedbackBanner({
  feedback,
  variant = "full",
}: FeedbackBannerProps) {
  const config = variantConfig[variant];
  return (
    <motion.div
      initial={config.initial}
      animate={config.animate}
      exit={config.exit}
      className={`${config.className} ${getFeedbackClassName(feedback.tone)}`}
    >
      {feedback.tone === "error" ? (
        <AlertCircle className="h-5 w-5" />
      ) : (
        <CheckCircle2 className="h-5 w-5" />
      )}
      {feedback.text}
    </motion.div>
  );
}
