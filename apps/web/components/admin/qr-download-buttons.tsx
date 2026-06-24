"use client";

interface Props {
  eventId: string;
  apiBase: string;
}

export function QrDownloadButtons({ eventId, apiBase }: Props) {
  function download(format: "png" | "svg" | "pdf") {
    const token =
      document.cookie
        .split("; ")
        .find((c) => c.startsWith("es_access_token="))
        ?.split("=")[1] ?? "";

    fetch(`${apiBase}/admin/events/${eventId}/qr.${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `qr-${eventId}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  return (
    <div className="flex gap-2 mt-4 flex-wrap justify-center">
      <button
        onClick={() => download("png")}
        className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition"
      >
        PNG İndir
      </button>
      <button
        onClick={() => download("svg")}
        className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition"
      >
        SVG İndir
      </button>
      <button
        onClick={() => download("pdf")}
        className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition"
      >
        PDF İndir
      </button>
    </div>
  );
}
