"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminEventsApi, ApiError, type EventRecord } from "@/lib/api-client";

function getToken() {
  return (
    document.cookie
      .split("; ")
      .find((c) => c.startsWith("es_access_token="))
      ?.split("=")[1] ?? ""
  );
}

interface Props {
  event: EventRecord;
}

export function EventInfoEditor({ event }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await adminEventsApi.update(getToken(), event.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setName(event.name);
    setDescription(event.description ?? "");
    setError("");
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="group">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{event.name}</h3>
            {event.description && (
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{event.description}</p>
            )}
            {!event.description && (
              <p className="text-sm text-gray-400 mt-1 italic">Açıklama yok</p>
            )}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-400 px-2.5 py-1 rounded-lg transition"
          >
            ✏️ Düzenle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Etkinlik Adı</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          autoFocus
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Açıklama</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={1000}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          placeholder="Etkinlik hakkında kısa bir açıklama..."
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-4 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="px-4 py-1.5 border border-gray-200 text-xs rounded-lg hover:bg-gray-50 transition"
        >
          İptal
        </button>
      </div>
    </div>
  );
}
