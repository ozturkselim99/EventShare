"use client";

import { motion } from "framer-motion";
import { type EventRecord } from "@/lib/api-client";
import { Camera, Video } from "lucide-react";

interface EventHeroProps {
  event: EventRecord;
  mediaStats: {
    imageCount: number;
    videoCount: number;
  };
}

export function EventHero({ event, mediaStats }: EventHeroProps) {

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-full bg-white"
    >
      {/* Hero Section - Luxury Invitation Style */}
      <div className="relative w-full min-h-auto sm:h-[60vh] lg:h-[70vh] flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: '#F8F5F0' }}>


        {/* Main Content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col items-center justify-center px-6 sm:px-8 py-12 sm:py-0 max-w-3xl mx-auto text-center"
        >
          {/* Event Date - Serif, elegant */}
          <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
            <p className="font-['Cormorant_Garamond'] text-lg sm:text-xl lg:text-2xl font-medium tracking-wide" style={{ color: '#3D3D3D' }}>
              {event.eventDate
                ? new Date(event.eventDate).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Özel Etkinlik"}
            </p>
            {event.eventDate && (
              <p className="font-['Cormorant_Garamond'] text-lg sm:text-xl lg:text-2xl font-medium tracking-wide mt-1" style={{ color: '#3D3D3D' }}>
                {new Date(event.eventDate).toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </motion.div>

          {/* Decorative Separator Line - Champagne Gold */}
          <motion.div
            variants={itemVariants}
            className="mb-7 sm:mb-9 flex items-center gap-2.5"
          >
            <div className="w-6 sm:w-10 h-px" style={{ background: 'linear-gradient(to right, transparent, #C8A96A, transparent)' }} />
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: '#C8A96A' }} />
            <div className="w-6 sm:w-10 h-px" style={{ background: 'linear-gradient(to left, transparent, #C8A96A, transparent)' }} />
          </motion.div>

          {/* Event Title - Elegant Serif (Playfair Display style) */}
          <motion.h1
            variants={itemVariants}
            className="mb-5 sm:mb-7 font-['Cormorant_Garamond'] text-4xl sm:text-6xl lg:text-7xl font-light leading-snug tracking-wider" style={{ color: '#1D1D1D' }}
          >
            {event.name}
          </motion.h1>

          {/* Description / Tagline - Light serif */}
          {event.description && (
            <motion.p
              variants={itemVariants}
              className="mb-10 sm:mb-13 font-['Cormorant'] text-sm sm:text-base font-light italic max-w-2xl leading-relaxed tracking-wide" style={{ color: '#5C5C5C' }}
            >
              {event.description}
            </motion.p>
          )}

          {/* Elegant Stats - Invitation Style Cards */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap justify-center gap-5 sm:gap-6 w-full"
          >
            {/* Photos Card - Minimalist */}
            <motion.div
              whileHover={{ translateY: -2 }}
              transition={{ duration: 0.3 }}
              className="rounded-lg px-5 sm:px-7 py-3 sm:py-4 transition-all"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EEE8E1',
                boxShadow: 'rgba(0,0,0,0.05) 0 2px 8px'
              }}
            >
              <div className="flex items-center gap-2.5">
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#C8A96A' }} />
                <div className="text-left">
                  <p className="font-['Cormorant'] text-xl sm:text-2xl font-light" style={{ color: '#1D1D1D' }}>
                    {mediaStats.imageCount}
                  </p>
                  <p className="font-['Raleway'] text-xs font-light tracking-widest uppercase" style={{ color: '#8B8B8B' }}>
                    Fotoğraf
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Videos Card - Minimalist */}
            <motion.div
              whileHover={{ translateY: -2 }}
              transition={{ duration: 0.3 }}
              className="rounded-lg px-5 sm:px-7 py-3 sm:py-4 transition-all"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EEE8E1',
                boxShadow: 'rgba(0,0,0,0.05) 0 2px 8px'
              }}
            >
              <div className="flex items-center gap-2.5">
                <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#C8A96A' }} />
                <div className="text-left">
                  <p className="font-['Cormorant'] text-xl sm:text-2xl font-light" style={{ color: '#1D1D1D' }}>
                    {mediaStats.videoCount}
                  </p>
                  <p className="font-['Raleway'] text-xs font-light tracking-widest uppercase" style={{ color: '#8B8B8B' }}>
                    Video
                  </p>
                </div>
              </div>
            </motion.div>

          </motion.div>

        </motion.div>



        {/* Soft Floating Bokeh Elements */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgba(200, 169, 106, 0.08)' }}
        />
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
          className="absolute bottom-1/3 left-1/3 w-32 h-32 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgba(111, 126, 104, 0.06)' }}
        />

      </div>
    </motion.div>
  );
}
