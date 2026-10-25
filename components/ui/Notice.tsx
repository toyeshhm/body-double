"use client";
import { AnimatePresence, motion } from "framer-motion";

/** A small paper sticker that slides up from the bottom for rule errors and connection trouble. */
export function Notice({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-toast flex justify-center px-4">
      <AnimatePresence>
        {message && (
          <motion.p
            key={message}
            role="status"
            initial={{ y: 24, opacity: 0, rotate: -1.5 }}
            animate={{ y: 0, opacity: 1, rotate: -1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="card-sm max-w-md px-5 py-3 text-[0.98rem] font-semibold text-ink"
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
