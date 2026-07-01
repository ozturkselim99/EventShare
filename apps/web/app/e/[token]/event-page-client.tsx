"use client";

import { useState, useRef } from "react";
import { type EventRecord, type GalleryPage, publicApi } from "@/lib/api-client";
import { MasonryGallery } from "@/components/gallery/masonry-gallery";
import { UploadZone } from "@/components/upload/upload-zone";

interface Props {
  event: EventRecord;
  initialGallery: GalleryPage;
  isExpired: boolean;
  isNotStarted: boolean;
}

export function EventPageClient({ event, initialGallery, isExpired, isNotStarted }: Props) {
  const [processing, setProcessing] = useState(false);
  // Track the live READY count so consecutive uploads within the same page session
  // don't compare against the stale SSR snapshot.
  const readyCountRef = useRef<number | null>(null);

  const handleUploadComplete = async () => {
    setProcessing(true);

    // If this is the first upload in this session, prime the ref with a live fetch.
    if (readyCountRef.current === null) {
      try {
        const snap = await publicApi.getMedia(event.token, event.id, { limit: 1 });
        // snap.hasMore means more items exist than the limit; use SSR count as floor.
        readyCountRef.current = snap.hasMore
          ? Math.max(initialGallery.data.length, 1)
          : snap.data.length;
      } catch {
        readyCountRef.current = initialGallery.data.length;
      }
    }

    const knownCount = readyCountRef.current;
    const targetCount = knownCount + 1;

    // Poll until at least one new READY item appears (max ~20 s).
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const gallery = await publicApi.getMedia(event.token, event.id, { limit: targetCount });
        if (gallery.data.length >= targetCount) break;
      } catch {
        // ignore transient network errors
      }
    }

    // Update the ref so the next upload in this session has a fresh baseline.
    readyCountRef.current = targetCount;

    setProcessing(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className="relative py-14 px-6 text-center text-white"
        style={{
          background: "linear-gradient(135deg, #111827 0%, #374151 100%)",
        }}
      >
        <h1 className="text-3xl font-bold">{event.name}</h1>
        {event.description && (
          <p className="mt-2 text-white/70 max-w-md mx-auto text-sm">
            {event.description}
          </p>
        )}
        {event.eventDate && (
          <p className="mt-1 text-white/50 text-xs">
            {new Date(event.eventDate).toLocaleDateString("tr-TR", {
              dateStyle: "long",
            })}
          </p>
        )}
        {isNotStarted && (
          <div className="mt-3 inline-block bg-blue-500/20 text-blue-100 text-xs px-3 py-1 rounded-full">
            Etkinlik henüz başlamadı
          </div>
        )}
        {isExpired && (
          <div className="mt-3 inline-block bg-white/10 text-white/80 text-xs px-3 py-1 rounded-full">
            Etkinlik sona erdi
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ── Etkinlik henüz başlamadı ───────────────────────────── */}
        {isNotStarted && (
          <div className="mb-8 rounded-2xl border border-blue-100 bg-blue-50 px-6 py-10 text-center">
            <div className="mb-3 flex justify-center">
              <span className="text-4xl">🕐</span>
            </div>
            <h3 className="text-lg font-semibold text-blue-900">
              Etkinlik henüz başlamadı
            </h3>
            {event.eventDate && (
              <p className="mt-1 text-sm text-blue-700">
                {new Date(event.eventDate).toLocaleString("tr-TR", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}{" "}
                tarihinde başlayacak
              </p>
            )}
            <p className="mt-3 text-xs text-blue-500">
              Etkinlik başladığında bu sayfaya geri dönerek fotoğraflarınızı paylaşabilirsiniz.
            </p>
          </div>
        )}

        {/* ── Etkinlik sona erdi (VIEW_ONLY) ─────────────────────── */}
        {isExpired && event.expirationMode !== "CLOSED" && (
          <div className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 px-6 py-6 text-center">
            <p className="text-sm font-medium text-gray-500">
              Bu etkinlik{" "}
              {new Date(event.expiresAt).toLocaleString("tr-TR", {
                dateStyle: "long",
                timeStyle: "short",
              })}{" "}
              tarihinde sona erdi — yeni fotoğraf yüklenemez.
            </p>
          </div>
        )}

        {/* ── Yükleme alanı (yalnızca aktif etkinlikte) ──────────── */}
        {event.allowUploads && !isExpired && !isNotStarted && (
          <div className="mb-8">
            <UploadZone eventToken={event.token} onUploaded={handleUploadComplete} />
            {processing && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Medya işleniyor, galeri güncelleniyor...
              </div>
            )}
          </div>
        )}

        {/* ── Galeri (etkinlik başlamadıysa gizle) ───────────────── */}
        {!isNotStarted && (
          <div data-gallery-section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Etkinlik Galerisi
              {initialGallery.data.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({initialGallery.data.length}
                  {initialGallery.hasMore ? "+" : ""} medya)
                </span>
              )}
            </h2>

            <MasonryGallery
              eventToken={event.token}
              eventId={event.id}
              initialData={initialGallery}
            />
          </div>
        )}
      </div>
    </div>
  );
}
