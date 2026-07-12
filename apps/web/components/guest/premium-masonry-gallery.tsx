"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { publicApi, type MediaRecord, type GalleryPage } from "@/lib/api-client";
import { Lightbox } from "@/components/gallery/lightbox";
import { VideoThumbnail } from "@/components/gallery/video-thumbnail";
import { Play } from "lucide-react";

interface Props {
  eventToken: string;
  eventId: string;
  initialData: GalleryPage;
}

function formatPostDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PostHeader({ item }: { item: MediaRecord }) {
  const displayName = item.uploadedBy || "Misafir";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-white shrink-0"
        style={{ backgroundColor: "#C8A96A" }}
      >
        {initial}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
        <p className="text-xs text-gray-500">{formatPostDate(item.createdAt)}</p>
      </div>
    </div>
  );
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="max-w-[480px] mx-auto flex flex-col gap-6"
      >
        {items.map((item, idx) => (
          <motion.article
            key={item.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 0.3) }}
            viewport={{ once: true, margin: "50px" }}
            className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden cursor-pointer group"
            onClick={() => setLightboxIndex(idx)}
          >
            <PostHeader item={item} />

            <div className="relative w-full bg-gray-100">
              {item.type === "IMAGE" ? (
                <img
                  src={item.thumbnailUrl ?? item.originalUrl ?? ""}
                  alt={item.uploadedBy ? `Yükleyen: ${item.uploadedBy}` : ""}
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== item.originalUrl && item.originalUrl) {
                      target.src = item.originalUrl;
                    }
                  }}
                  className="w-full max-h-[70vh] object-cover"
                />
              ) : (
                <div className="relative w-full bg-gray-900">
                  <VideoThumbnail
                    thumbnailUrl={item.thumbnailUrl}
                    originalUrl={item.originalUrl}
                    alt="Video preview"
                    className="w-full max-h-[70vh] object-cover"
                    fallback={
                      <div className="w-full h-48 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white/60" />
                      </div>
                    }
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-white/30 transition-all">
                      <Play className="w-7 h-7 text-white fill-white" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.article>
        ))}
      </motion.div>

      <div ref={sentinelRef} className="h-4" />

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
