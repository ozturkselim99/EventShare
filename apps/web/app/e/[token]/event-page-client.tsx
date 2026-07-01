"use client";

import { useState } from "react";
import { type EventRecord, type GalleryPage, publicApi } from "@/lib/api-client";
import { MasonryGallery } from "@/components/gallery/masonry-gallery";
import { UploadZone } from "@/components/upload/upload-zone";

interface Props {
  event: EventRecord;
  initialGallery: GalleryPage;
  isExpired: boolean;
}

export function EventPageClient({ event, initialGallery, isExpired }: Props) {
  const [processing, setProcessing] = useState(false);

  const handleUploadComplete = async () => {
    setProcessing(true);

    // Timestamp of the newest known item (or epoch if gallery was empty)
    const latestKnownAt = initialGallery.data[0]?.createdAt ?? "1970-01-01T00:00:00.000Z";

    // Poll until a READY item newer than what we had appears (max ~20s)
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const gallery = await publicApi.getMedia(event.token, event.id, { limit: 5 });
        const hasNew = gallery.data.some((m) => m.createdAt > latestKnownAt);
        if (hasNew) break;
      } catch {
        // ignore transient errors during polling
      }
    }

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
        {isExpired && event.expirationMode === "VIEW_ONLY" && (
          <div className="mt-3 inline-block bg-white/10 text-white/80 text-xs px-3 py-1 rounded-full">
            Bu etkinlik sona erdi — yeni yükleme yapılamaz
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {event.allowUploads && !isExpired && (
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
      </div>
    </div>
  );
}
