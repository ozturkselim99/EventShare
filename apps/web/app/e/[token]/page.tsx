import { publicApi, type EventRecord, type GalleryPage } from "@/lib/api-client";
import { notFound, redirect } from "next/navigation";
import { EventPageClient } from "./event-page-client";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function GuestEventPage({ params }: Props) {
  const { token } = await params;

  let event: EventRecord | null = null;
  try {
    event = await publicApi.getEvent(token);
  } catch {
    notFound();
  }

  if (!event) notFound();

  const now = new Date();
  const expiresAt = new Date(event.expiresAt);
  const isExpired = expiresAt < now;

  if (isExpired && event.expirationMode === "CLOSED") {
    redirect(`/e/${token}/expired`);
  }

  const isNotStarted = !!event.eventDate && new Date(event.eventDate) > now;

  let initialGallery: GalleryPage = { data: [], nextCursor: null, hasMore: false };
  try {
    initialGallery = await publicApi.getMedia(token, event.id, { limit: 40 });
  } catch {
    // empty gallery is ok
  }

  return (
    <EventPageClient
      event={event}
      initialGallery={initialGallery}
      isExpired={isExpired}
      isNotStarted={isNotStarted}
    />
  );
}
