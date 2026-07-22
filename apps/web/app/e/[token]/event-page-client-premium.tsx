"use client";

import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { type EventRecord, type GalleryPage, publicApi } from "@/lib/api-client";
import { EventHero } from "@/components/guest/event-hero";
import { PremiumUploadZone } from "@/components/guest/premium-upload-zone";
import { PremiumMasonryGallery } from "@/components/guest/premium-masonry-gallery";
import { FloatingUploadButton } from "@/components/guest/floating-upload-button";

interface Props {
  event: EventRecord;
  initialGallery: GalleryPage;
  isExpired: boolean;
  isNotStarted: boolean;
}

export function EventPageClientPremium({
  event,
  initialGallery,
  isExpired,
  isNotStarted,
}: Props) {
  const [processing, setProcessing] = useState(false);
  const readyCountRef = useRef<number | null>(null);
  const uploadZoneRef = useRef<HTMLDivElement>(null);

  // Calculate media statistics
  const mediaStats = useMemo(() => {
    const imageCount = initialGallery.data.filter(
      (m) => m.type === "IMAGE"
    ).length;
    const videoCount = initialGallery.data.filter(
      (m) => m.type === "VIDEO"
    ).length;

    return {
      imageCount,
      videoCount,
    };
  }, [initialGallery]);

  const handleUploadComplete = async () => {
    setProcessing(true);

    if (readyCountRef.current === null) {
      try {
        const snap = await publicApi.getMedia(event.token, event.id, {
          limit: 1,
        });
        readyCountRef.current = snap.hasMore
          ? Math.max(initialGallery.data.length, 1)
          : snap.data.length;
      } catch {
        readyCountRef.current = initialGallery.data.length;
      }
    }

    const knownCount = readyCountRef.current;
    const targetCount = knownCount + 1;

    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const gallery = await publicApi.getMedia(event.token, event.id, {
          limit: targetCount,
        });
        if (gallery.data.length >= targetCount) break;
      } catch {
        // ignore transient network errors
      }
    }

    readyCountRef.current = targetCount;
    setProcessing(false);
    window.location.reload();
  };

  const handleFloatingUploadClick = () => {
    uploadZoneRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-white"
    >
      {/* Hero Section */}
      <EventHero event={event} mediaStats={mediaStats} />

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-5xl mx-auto">
          {/* Event Not Started State */}
          {isNotStarted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-12 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 px-6 py-12 sm:px-8 sm:py-16 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/10"
              >
                <span className="text-4xl">🕐</span>
              </motion.div>
              <h3 className="text-2xl font-bold text-blue-900 mb-2">
                Etkinlik Yakında Başlayacak
              </h3>
              {event.eventDate && (
                <p className="text-lg text-blue-700 mb-4">
                  {new Date(event.eventDate).toLocaleDateString("tr-TR", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              <p className="text-sm text-blue-600">
                Etkinlik başladığında anılarını paylaşmak için geri gel
              </p>
            </motion.div>
          )}

          {/* Event Expired State */}
          {isExpired && event.expirationMode !== "CLOSED" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-12 rounded-3xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100/50 px-6 py-8 sm:px-8 sm:py-10 text-center"
            >
              <p className="text-base text-gray-700 font-medium">
                Bu etkinlik{" "}
                {new Date(event.expiresAt).toLocaleDateString("tr-TR", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                tarihinde sona erdi. Yeni fotoğraf yüklenemiyor, ancak
                etkinlik boyunca paylaşılan tüm anıları galeriden
                keşfedebilirsin.
              </p>
            </motion.div>
          )}

          {/* Uploads Disabled State */}
          {!event.allowUploads && !isExpired && !isNotStarted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-12 rounded-3xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50 px-6 py-8 sm:px-8 sm:py-10 text-center"
            >
              <p className="text-base text-yellow-800 font-medium">
                Bu etkinlikte fotoğraf yükleme özelliği geçici olarak
                kullanılamıyor. Paylaşılan anılara galeriden göz atabilirsin.
              </p>
            </motion.div>
          )}

          {/* Upload Zone */}
          {event.allowUploads &&
            !isExpired &&
            !isNotStarted && (
              <motion.div
                ref={uploadZoneRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-16"
              >
                <PremiumUploadZone
                  eventToken={event.token}
                  onUploaded={handleUploadComplete}
                />

                {processing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 flex items-center justify-center gap-3"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full"
                    />
                    <p className="text-sm text-gray-600">
                      Anılarınız işleniyor...
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

          {/* Gallery Section */}
          {!isNotStarted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              data-gallery-section
            >
              <div className="mb-8">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                  Etkinlik Galerisi
                </h2>
                {initialGallery.data.length > 0 && (
                  <p className="text-lg text-gray-600 mt-2">
                    {initialGallery.data.length}
                    {initialGallery.hasMore ? "+" : ""} anı paylaşıldı
                  </p>
                )}
              </div>

              <PremiumMasonryGallery
                eventToken={event.token}
                eventId={event.id}
                initialData={initialGallery}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Floating Upload Button (Mobile) */}
      {event.allowUploads && !isExpired && !isNotStarted && (
        <FloatingUploadButton onClick={handleFloatingUploadClick} />
      )}
    </motion.div>
  );
}
