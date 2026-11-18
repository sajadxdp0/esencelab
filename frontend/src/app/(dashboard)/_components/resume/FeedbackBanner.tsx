"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle } from "lucide-react";
import { getFeedbackClassName } from "@/app/(dashboard)/_components/resume/format";
import { FeedbackState } from "@/app/(dashboard)/_components/resume/types";

interface FeedbackBannerProps {
  feedback: FeedbackState | null;
}

export default function FeedbackBanner({ feedback }: FeedbackBannerProps) {
  return (
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`rounded-2xl border px-5 py-4 text-sm font-medium shadow-sm ${getFeedbackClassName(feedback.tone)}`}
          >
            <div className="flex items-center gap-3">
              {feedback.tone === "error" ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
              <span>{feedback.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
  );
}
