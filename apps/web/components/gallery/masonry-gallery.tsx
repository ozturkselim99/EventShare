"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { publicApi, type MediaRecord, type GalleryPage } from "@/lib/api-client";
import { Lightbox } from "./lightbox";

interface Props {
  eventToken: string;
  eventId: string;
  initialData: GalleryPage;
}

export function MasonryGallery({ eventToken, eventId, initialData }: Props) {
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
      // silent fail - user can scroll again
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, eventToken, eventId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (items.length === 0) {
    return (
      <p className="text-center text-gray-400 py-20">
        Henüz fotoğraf veya video paylaşılmadı.
      </p>
    );
  }

  return (
    <>
      <div className="masonry-grid">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="masonry-item cursor-pointer group"
            onClick={() => setLightboxIndex(idx)}
          >
            {item.type === "IMAGE" ? (
              <div className="relative w-full rounded-xl overflow-hidden bg-gray-100 min-h-[120px]">
                <img
                  src={item.thumbnailUrl ?? item.originalUrl ?? ""}
                  alt={item.uploadedBy ? `Yükleyen: ${item.uploadedBy}` : ""}
                  loading={idx < 6 ? "eager" : "lazy"}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== item.originalUrl && item.originalUrl) {
                      target.src = item.originalUrl;
                    }
                  }}
                  className="w-full block rounded-xl object-cover group-hover:opacity-90 transition"
                />
              </div>
            ) : (
              <div className="relative w-full rounded-xl overflow-hidden bg-black">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt="Video önizleme"
                    loading="lazy"
                    className="w-full object-cover group-hover:opacity-80 transition"
                  />
                ) : (
                  <div className="h-40 bg-gray-900 flex items-center justify-center">
                    <span className="text-white text-4xl">▶</span>
                  </div>
                )}
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center text-white text-xl">
                    ▶
                  </span>
                </span>
              </div>
            )}
            {item.uploadedBy && (
              <p className="text-xs text-gray-400 mt-1 px-0.5 truncate">
                {item.uploadedBy}
              </p>
            )}
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="h-4" />
      {loading && (
        <p className="text-center text-sm text-gray-400 py-4">Yükleniyor...</p>
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
