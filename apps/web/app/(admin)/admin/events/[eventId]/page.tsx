import { requireAuth } from "@/lib/auth";
import { adminEventsApi, type EventRecord } from "@/lib/api-client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QrDownloadButtons } from "@/components/admin/qr-download-buttons";
import { EventActions } from "@/components/admin/event-actions";
import { EventInfoEditor } from "@/components/admin/event-info-editor";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const token = await requireAuth();

  let event: EventRecord | null = null;
  try {
    event = await adminEventsApi.get(token, eventId);
  } catch {
    notFound();
  }

  if (!event) notFound();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_PUBLIC_URL ??
    "http://localhost:3000";
  const publicUrl = `${appUrl}/e/${event.token}`;

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/events"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Etkinlikler
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{event.name}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Etkinlik Bilgileri</h2>

          {/* Editable name & description */}
          <div className="mb-4 pb-4 border-b border-gray-100">
            <EventInfoEditor event={event} />
          </div>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Durum</dt>
              <dd className="font-medium">{event.status}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Sona Erme</dt>
              <dd className="font-medium">
                {new Date(event.expiresAt).toLocaleDateString("tr-TR", {
                  dateStyle: "long",
                })}
              </dd>
            </div>
            {event.eventDate && (
              <div>
                <dt className="text-gray-500">Etkinlik Tarihi</dt>
                <dd className="font-medium">
                  {new Date(event.eventDate).toLocaleDateString("tr-TR", {
                    dateStyle: "long",
                  })}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Yükleme</dt>
              <dd className="font-medium">
                {event.allowUploads ? "Açık" : "Kapalı"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Medya Sayısı</dt>
              <dd className="font-medium">{event._count?.media ?? 0}</dd>
            </div>
          </dl>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Misafir Linki</p>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline break-all"
            >
              {publicUrl}
            </a>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center">
          <h2 className="font-semibold text-gray-900 mb-4 self-start">
            QR Kod
          </h2>
          <img
            src={`${apiBase}/admin/events/${event.id}/qr.png`}
            alt="QR Kod"
            className="w-48 h-48 rounded-xl border border-gray-100"
          />
          <QrDownloadButtons eventId={event.id} apiBase={apiBase} />
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">İşlemler</h2>
        <EventActions event={event} />
      </div>
    </div>
  );
}
