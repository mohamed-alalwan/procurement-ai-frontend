import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot } from "lucide-react";

const LOADING_MESSAGES = [
  "Analyzing procurement data...",
  "Querying purchase orders...",
  "Aggregating spend metrics...",
  "Identifying top suppliers...",
  "Processing department data...",
  "Calculating fiscal year trends...",
  "Examining acquisition methods...",
  "Compiling transaction records...",
  "Extracting commodity details...",
  "Computing statistical insights...",
  "Filtering contract information...",
  "Correlating vendor patterns...",
  "Evaluating spending categories...",
  "Sorting line-item data...",
  "Building analytical views...",
];

export function LoadingMessage() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Bot className="h-4 w-4" />
        </motion.div>
      </div>
      <div className="rounded-2xl rounded-tl-sm px-4 py-2 bg-muted min-w-[200px]">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-muted-foreground"
          >
            {LOADING_MESSAGES[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
