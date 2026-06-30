"use client";

import { useRouter } from "next/navigation";
import { type EventRecord, type GalleryPage } from "@/lib/api-client";
import { MasonryGallery } from "@/components/gallery/masonry-gallery";
import { UploadZone } from "@/components/upload/upload-zone";

interface Props {
  event: EventRecord;
  initialGallery: GalleryPage;
  isExpired: boolean;
}

export function EventPageClient({ event, initialGallery, isExpired }: Props) {
  const router = useRouter();

  const handleUploadComplete = () => {
    // Sayfayı tamamen yenile (cache'i temizle)
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
