"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload } from "lucide-react";

interface FloatingUploadButtonProps {
  onClick: () => void;
}

export function FloatingUploadButton({ onClick }: FloatingUploadButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show button when scrolled down from top
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? 1 : 0.8,
        pointerEvents: isVisible ? "auto" : "none",
      }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 md:hidden z-40 w-14 h-14 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center"
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Upload className="w-6 h-6" />
      </motion.div>
    </motion.button>
  );
}
