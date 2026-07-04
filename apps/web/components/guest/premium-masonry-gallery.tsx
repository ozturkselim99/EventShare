"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { publicApi, type MediaRecord, type GalleryPage } from "@/lib/api-client";
import { Lightbox } from "@/components/gallery/lightbox";
import { Play } from "lucide-react";

interface Props {
  eventToken: string;
  eventId: string;
  initialData: GalleryPage;
}

export function PremiumMasonryGallery({
  eventToken,
  eventId,
  initialData,
}: Props) {
  const [items, setItems] = useState<MediaRecord[]>(initialData.data);
  const [cursor, setCursor] = useState<string | null>(initialData.nextCursor);
  const [loading, setLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const page = await publicApi.getMedia(eventToken, eventId, { cursor });
      setItems((prev) => [...prev, ...page.data]);
      setCursor(page.nextCursor);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, eventToken, eventId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col items-center justify-center py-20 px-4"
      >
        <div className="text-center">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="mb-6 text-6xl"
          >
            📸
          </motion.div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            İlk Paylaşan Olun
          </h3>
          <p className="text-gray-600 max-w-sm">
            İlk anını yükle ve güzel bir koleksiyon başlat
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      {/* Gallery Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="masonry-gallery"
      >
        {items.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: idx * 0.05 }}
            viewport={{ once: true, margin: "50px" }}
            className="masonry-item group cursor-pointer"
            onClick={() => setLightboxIndex(idx)}
          >
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 aspect-square">
              {item.type === "IMAGE" ? (
                <>
                  {/* Blur-up effect with placeholder */}
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 blur-xl"
                  />

                  <motion.img
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    src={item.thumbnailUrl ?? item.originalUrl ?? ""}
                    alt={
                      item.uploadedBy ? `Uploaded by ${item.uploadedBy}` : ""
                    }
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (
                        target.src !== item.originalUrl &&
                        item.originalUrl
                      ) {
                        target.src = item.originalUrl;
                      }
                    }}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </>
              ) : (
                <>
                  {/* Video Preview */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    className="relative w-full h-full bg-gray-900"
                  >
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt="Video preview"
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:brightness-75 transition-all duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white/60" />
                      </div>
                    )}
                  </motion.div>

                  {/* Play Button Overlay */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-white/30 transition-all">
                      <Play className="w-7 h-7 text-white fill-white" />
                    </div>
                  </motion.div>
                </>
              )}

              {/* Hover Overlay with Upload Info */}
              {item.uploadedBy && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-4"
                >
                  <p className="text-sm font-medium text-white truncate">
                    {item.uploadedBy}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-4" />

      {/* Loading indicator */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center items-center py-8"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full"
          />
        </motion.div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          items={items}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
