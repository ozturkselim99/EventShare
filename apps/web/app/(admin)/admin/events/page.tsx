import { requireAuth } from "@/lib/auth";
import { adminEventsApi, type EventRecord } from "@/lib/api-client";
import Link from "next/link";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    DRAFT: "bg-gray-100 text-gray-600",
    PAUSED: "bg-yellow-100 text-yellow-800",
    EXPIRED: "bg-red-100 text-red-700",
    ARCHIVED: "bg-purple-100 text-purple-700",
    DELETED: "bg-red-200 text-red-800",
  };
  const labels: Record<string, string> = {
    ACTIVE: "Aktif",
    DRAFT: "Taslak",
    PAUSED: "Duraklatıldı",
    EXPIRED: "Süresi Doldu",
    ARCHIVED: "Arşivlendi",
    DELETED: "Silindi",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export default async function EventsListPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const token = await requireAuth();
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const search = params.search;

  let result: { data: EventRecord[]; total: number; page: number; limit: number } | null = null;
  try {
    result = await adminEventsApi.list(token, { search, page });
  } catch {
    result = null;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_PUBLIC_URL ?? "http://localhost:3000";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Etkinlikler</h1>
        <Link
          href="/admin/events/new"
          className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition"
        >
          + Yeni Etkinlik
        </Link>
      </div>

      <form method="get" className="mb-6">
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Etkinlik ara..."
          className="w-full max-w-sm px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </form>

      {!result ? (
        <p className="text-sm text-red-600">Etkinlikler yüklenemedi.</p>
      ) : result.data.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">Henüz etkinlik yok.</p>
          <Link
            href="/admin/events/new"
            className="mt-4 inline-block text-sm text-gray-900 underline"
          >
            İlk etkinliği oluştur
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {result.data.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {event.name}
                  </h3>
                  <StatusBadge status={event.status} />
                </div>
                <p className="text-xs text-gray-400">
                  Sona erme:{" "}
                  {new Date(event.expiresAt).toLocaleDateString("tr-TR")} ·{" "}
                  {event._count?.media ?? 0} medya
                </p>
                <a
                  href={`${appUrl}/e/${event.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1 block truncate"
                >
                  {appUrl}/e/{event.token}
                </a>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/admin/events/${event.id}`}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  Yönet
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {result && result.total > result.limit && (
        <div className="flex justify-center gap-4 mt-8">
          {page > 1 && (
            <Link
              href={`?page=${page - 1}${search ? `&search=${search}` : ""}`}
              className="px-4 py-2 text-sm border rounded-xl hover:bg-gray-50 transition"
            >
              ← Önceki
            </Link>
          )}
          {page * result.limit < result.total && (
            <Link
              href={`?page=${page + 1}${search ? `&search=${search}` : ""}`}
              className="px-4 py-2 text-sm border rounded-xl hover:bg-gray-50 transition"
            >
              Sonraki →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
