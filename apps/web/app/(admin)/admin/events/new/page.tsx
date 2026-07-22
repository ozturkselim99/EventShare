"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { createEventAction } from "@/lib/auth";

const DURATION_PRESETS = [
  { label: "3 Gün", days: 3 },
  { label: "7 Gün", days: 7 },
  { label: "14 Gün", days: 14 },
  { label: "30 Gün", days: 30 },
  { label: "90 Gün", days: 90 },
];

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function addDaysFrom(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return toLocalDatetimeValue(d);
}

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPresetDays, setSelectedPresetDays] = useState<number>(7);
  const [form, setForm] = useState({
    name: "",
    description: "",
    eventDate: "",
    expiresAt: addDaysFrom(new Date(), 7),
    expirationMode: "VIEW_ONLY",
    maxUploads: "",
  });

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleEventDateChange(value: string) {
    const base = value ? new Date(value) : new Date();
    setForm((f) => ({
      ...f,
      eventDate: value,
      expiresAt: addDaysFrom(base, selectedPresetDays),
    }));
  }

  function handlePresetClick(days: number) {
    setSelectedPresetDays(days);
    const base = form.eventDate ? new Date(form.eventDate) : new Date();
    setForm((f) => ({ ...f, expiresAt: addDaysFrom(base, days) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const event = await createEventAction({
        name: form.name,
        description: form.description || undefined,
        eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : undefined,
        expiresAt: new Date(form.expiresAt).toISOString(),
        expirationMode: form.expirationMode,
        maxUploads: form.maxUploads ? parseInt(form.maxUploads, 10) : undefined,
      });
      router.push(`/admin/events/${event.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Etkinlik oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  }

  const baseLabel = form.eventDate ? "etkinlik tarihinden" : "bugünden";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Yeni Etkinlik Oluştur</h1>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Etkinlik Adı *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Ayşe & Ali Düğünü"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            placeholder="Etkinlik hakkında kısa bir açıklama..."
          />
        </div>

        {/* Event Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Etkinlik Tarihi</label>
          <input
            type="datetime-local"
            value={form.eventDate}
            onChange={(e) => handleEventDateChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          {!form.eventDate && (
            <p className="text-xs text-gray-400 mt-1">
              Etkinlik tarihi seçilmezse yayın süresi bugünden hesaplanır.
            </p>
          )}
        </div>

        {/* Expiry duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Yayın Süresi *
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({baseLabel} itibaren)
            </span>
          </label>

          {/* Preset buttons */}
          <div className="flex gap-2 flex-wrap mb-3">
            {DURATION_PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => handlePresetClick(p.days)}
                className={`px-4 py-2 text-sm border rounded-xl transition ${
                  selectedPresetDays === p.days
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calculated date hint */}
          <p className="text-xs text-blue-600 mb-2">
            Sona erme:{" "}
            <strong>
              {new Date(form.expiresAt).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </strong>
          </p>

          {/* Manual override */}
          <input
            type="datetime-local"
            required
            value={form.expiresAt}
            onChange={(e) => { setSelectedPresetDays(-1); set("expiresAt", e.target.value); }}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <p className="text-xs text-gray-400 mt-1">Manuel olarak da değiştirebilirsiniz.</p>
        </div>

        {/* Expiration mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sona Erme Modu</label>
          <select
            value={form.expirationMode}
            onChange={(e) => set("expirationMode", e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="VIEW_ONLY">Galeri görünür kalır, yüklemeler kapanır</option>
            <option value="CLOSED">Etkinlik tamamen kapanır</option>
            <option value="ARCHIVE">Arşiv moduna geçer</option>
          </select>
        </div>

        {/* Max uploads */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Maksimum Yükleme Sayısı (opsiyonel)
          </label>
          <input
            type="number"
            min={1}
            value={form.maxUploads}
            onChange={(e) => set("maxUploads", e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Sınırsız"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition disabled:opacity-50"
          >
            {loading ? "Oluşturuluyor..." : "Etkinlik Oluştur"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 border border-gray-200 text-sm rounded-xl hover:bg-gray-50 transition"
          >
            İptal
          </button>
        </div>
      </form>
    </div>
  );
}
