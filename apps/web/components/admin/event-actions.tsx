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

export function EventActions({ event }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function run(action: () => Promise<unknown>, key: string) {
    setError("");
    setLoading(key);
    try {
      await action();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "İşlem başarısız oldu.");
    } finally {
      setLoading(null);
    }
  }

  const token = getToken;

  return (
    <div className="flex flex-wrap gap-3">
      {event.allowUploads ? (
        <button
          disabled={!!loading}
          onClick={() =>
            run(() => adminEventsApi.disableUploads(token(), event.id), "disable")
          }
          className="px-4 py-2 text-sm border border-yellow-300 text-yellow-800 rounded-xl hover:bg-yellow-50 transition disabled:opacity-50"
        >
          {loading === "disable" ? "..." : "Yüklemeleri Kapat"}
        </button>
      ) : (
        <button
          disabled={!!loading}
          onClick={() =>
            run(() => adminEventsApi.enableUploads(token(), event.id), "enable")
          }
          className="px-4 py-2 text-sm border border-green-300 text-green-800 rounded-xl hover:bg-green-50 transition disabled:opacity-50"
        >
          {loading === "enable" ? "..." : "Yüklemeleri Aç"}
        </button>
      )}

      <button
        disabled={!!loading}
        onClick={() => {
          const link = `${window.location.origin}/e/${event.token}`;
          navigator.clipboard.writeText(link).then(() => alert("Link kopyalandı!"));
        }}
        className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition"
      >
        Linki Kopyala
      </button>

      <button
        disabled={!!loading || (event._count?.media ?? 0) === 0}
        onClick={async () => {
          setLoading("download");
          setError("");
          try {
            // Use Next.js route handler that has access to httpOnly cookies
            const url = `/api/admin/events/${event.id}/download`;
            
            console.log("Downloading from:", url);
            
            const res = await fetch(url);
            
            console.log("Response status:", res.status);
            console.log("Response headers:", Object.fromEntries(res.headers.entries()));
            
            if (!res.ok) {
              const contentType = res.headers.get("content-type");
              let errorMsg = "İndirme başarısız oldu";
              
              if (contentType?.includes("application/json")) {
                const errorData = await res.json();
                console.error("Error response:", errorData);
                errorMsg = errorData.message || errorMsg;
              } else {
                const textError = await res.text();
                console.error("Non-JSON error:", textError);
                errorMsg = textError || errorMsg;
              }
              
              if (res.status === 401) {
                errorMsg = "Oturum süresi dolmuş. Lütfen yeniden giriş yapın.";
              } else if (res.status === 500) {
                errorMsg = `Sunucu hatası: ${errorMsg}`;
              }
              
              throw new Error(errorMsg);
            }
            
            const blob = await res.blob();
            
            console.log("Downloaded blob size:", blob.size);
            
            if (blob.size === 0) {
              throw new Error("İndirilecek medya dosyası bulunamadı");
            }
            
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = `${event.name.replace(/[^a-z0-9]/gi, "_")}_medya.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            
            console.log("Download completed successfully!");
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "İndirme başarısız oldu";
            setError(errorMsg);
            console.error("Download error:", err);
          } finally {
            setLoading(null);
          }
        }}
        className="px-4 py-2 text-sm border border-blue-200 text-blue-700 rounded-xl hover:bg-blue-50 transition disabled:opacity-50"
        title={(event._count?.media ?? 0) === 0 ? "Henüz medya yok" : "Tüm medyayı indir"}
      >
        {loading === "download" ? "İndiriliyor..." : "📥 Tümünü İndir"}
      </button>

      <button
        disabled={!!loading}
        onClick={() => {
          if (!confirm("Etkinliği silmek istediğinizden emin misiniz?")) return;
          run(
            () => adminEventsApi.remove(token(), event.id),
            "delete",
          ).then(() => {
            window.location.href = "/admin/events";
          });
        }}
        className="px-4 py-2 text-sm border border-red-200 text-red-700 rounded-xl hover:bg-red-50 transition disabled:opacity-50"
      >
        {loading === "delete" ? "..." : "Etkinliği Sil"}
      </button>

      {error && (
        <p className="w-full text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
    </div>
  );
}
