"use client";

import { EventPageClientPremium } from "./event-page-client-premium";
import { type EventRecord, type GalleryPage } from "@/lib/api-client";

interface Props {
  event: EventRecord;
  initialGallery: GalleryPage;
  isExpired: boolean;
  isNotStarted: boolean;
}

export function EventPageClient({ event, initialGallery, isExpired, isNotStarted }: Props) {
  return (
    <EventPageClientPremium
      event={event}
      initialGallery={initialGallery}
      isExpired={isExpired}
      isNotStarted={isNotStarted}
    />
  );
}
