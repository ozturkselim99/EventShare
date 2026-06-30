import { requireAuth } from "@/lib/auth";
import { adminEventsApi, type AdminStats } from "@/lib/api-client";
import Link from "next/link";

function formatBytes(bytes: string | number) {
  const b = typeof bytes === "string" ? parseInt(bytes) : bytes;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default async function AdminDashboardPage() {
  const token = await requireAuth();

  let stats: AdminStats | null = null;
  try {
    stats = await adminEventsApi.stats(token);
  } catch {
    stats = null;
  }

  const cards = [
    { label: "Etkinlikler", value: stats?.eventsCount ?? "—", icon: "📅" },
    { label: "Fotoğraflar", value: stats?.imagesCount ?? "—", icon: "📷" },
    { label: "Videolar", value: stats?.videosCount ?? "—", icon: "🎬" },
    {
      label: "Depolama",
      value: stats ? formatBytes(stats.storageBytes) : "—",
      icon: "💾",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            EventShare admin paneline hoş geldiniz
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition"
        >
          + Yeni Etkinlik
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
          >
            <div className="text-2xl mb-2">{c.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{c.value}</div>
            <div className="text-sm text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Hızlı Bağlantılar
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/events"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-gray-300 transition group"
        >
          <div className="font-semibold text-gray-900 group-hover:text-gray-700">
            Etkinlikleri Yönet
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Tüm etkinlikleri görüntüle, düzenle ve sil
          </div>
        </Link>
        <Link
          href="/admin/events/new"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-gray-300 transition group"
        >
          <div className="font-semibold text-gray-900 group-hover:text-gray-700">
            Yeni Etkinlik Oluştur
          </div>
          <div className="text-sm text-gray-500 mt-1">
            QR kod oluştur ve misafirleri davet et
          </div>
        </Link>
      </div>
    </div>
  );
}
