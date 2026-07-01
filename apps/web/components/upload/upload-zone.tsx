"use client";

import { useState, useRef, useEffect } from "react";
import { publicApi, ApiError } from "@/lib/api-client";

interface Props {
  eventToken: string;
  onUploaded?: () => void;
}

interface FileEntry {
  file: File;
  key: string;
  preview: string | null; // object URL for images, null for videos
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
];

export function UploadZone({ eventToken, onUploaded }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Revoke preview URLs on unmount
  useEffect(() => {
    return () => {
      entries.forEach((e) => { if (e.preview) URL.revokeObjectURL(e.preview); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const valid = Array.from(selected).filter((f) => ALLOWED_TYPES.includes(f.type));
    const newEntries: FileEntry[] = valid.map((f) => ({
      file: f,
      key: f.name + f.size + f.lastModified,
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
    }));
    setEntries((prev) => {
      const existingKeys = new Set(prev.map((e) => e.key));
      return [...prev, ...newEntries.filter((e) => !existingKeys.has(e.key))];
    });
    setErrors({});
  }

  function removeEntry(key: string) {
    setEntries((prev) => {
      const entry = prev.find((e) => e.key === key);
      if (entry?.preview) URL.revokeObjectURL(entry.preview);
      return prev.filter((e) => e.key !== key);
    });
    setProgress((p) => { const n = { ...p }; delete n[key]; return n; });
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  async function uploadEntry(entry: FileEntry): Promise<void> {
    const { file, key } = entry;
    setProgress((p) => ({ ...p, [key]: 0 }));

    const presign = await publicApi.presign(eventToken, {
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedBy: displayName || undefined,
    });

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress((p) => ({ ...p, [key]: Math.round((e.loaded / e.total) * 90) }));
        }
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`${xhr.status}`)));
      xhr.onerror = () => reject(new Error("Ağ hatası"));
      xhr.open(presign.method, presign.uploadUrl);
      Object.entries(presign.headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.send(file);
    });

    await publicApi.completeUpload(eventToken, {
      mediaId: presign.mediaId,
      uploadToken: presign.uploadToken,
    });

    setProgress((p) => ({ ...p, [key]: 100 }));
  }

  async function handleUpload() {
    if (entries.length === 0 || uploading) return;
    setUploading(true);
    setErrors({});

    const results = await Promise.allSettled(entries.map((e) => uploadEntry(e)));

    const errs: Record<string, string> = {};
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const key = entries[i]!.key;
        errs[key] = r.reason instanceof ApiError ? r.reason.message : "Yükleme başarısız";
      }
    });

    const failedKeys = new Set(Object.keys(errs));
    setErrors(errs);
    setEntries((prev) => prev.filter((e) => failedKeys.has(e.key)));
    setUploading(false);

    if (Object.keys(errs).length === 0) {
      onUploaded?.();
    }
  }

  const allDone = entries.length > 0 && entries.every((e) => progress[e.key] === 100);
  const anyUploading = uploading;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Anını Paylaş</h2>

      {/* Name input */}
      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">Adın (opsiyonel)</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          placeholder="Anonim"
          disabled={uploading}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
        />
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
          dragOver ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-400"
        } ${uploading ? "pointer-events-none opacity-50" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
      >
        <div className="text-2xl mb-2">📷</div>
        <p className="text-sm text-gray-500">
          Sürükle bırak ya da{" "}
          <span className="text-gray-900 font-medium underline underline-offset-2">dosya seç</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, HEIC, MP4, MOV</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime"
          capture="environment"
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {/* Preview grid */}
      {entries.length > 0 && (
        <div className="mt-4">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {entries.map((entry) => {
              const pct = progress[entry.key] ?? -1;
              const err = errors[entry.key];
              const done = pct === 100;
              const inProgress = pct >= 0 && pct < 100 && anyUploading;

              return (
                <div key={entry.key} className="relative group rounded-xl overflow-hidden bg-gray-100 aspect-square">
                  {/* Thumbnail */}
                  {entry.preview ? (
                    <img
                      src={entry.preview}
                      alt={entry.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-2">
                      <span className="text-3xl">🎬</span>
                      <span className="text-xs mt-1 text-center truncate w-full px-1">{entry.file.name}</span>
                    </div>
                  )}

                  {/* Progress overlay */}
                  {inProgress && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                      <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span className="text-white text-xs mt-1 font-medium">{pct}%</span>
                    </div>
                  )}

                  {/* Done overlay */}
                  {done && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="text-white text-2xl">✓</span>
                    </div>
                  )}

                  {/* Error overlay */}
                  {err && (
                    <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center p-1">
                      <span className="text-white text-xs text-center leading-tight">{err}</span>
                    </div>
                  )}

                  {/* Remove button (only when not uploading) */}
                  {!anyUploading && !done && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeEntry(entry.key); }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-black"
                      aria-label="Kaldır"
                    >
                      ✕
                    </button>
                  )}

                  {/* File size badge */}
                  {!anyUploading && !done && (
                    <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-md">
                      {entry.file.size < 1024 * 1024
                        ? `${(entry.file.size / 1024).toFixed(0)} KB`
                        : `${(entry.file.size / (1024 * 1024)).toFixed(1)} MB`}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add more button */}
            {!anyUploading && !allDone && (
              <button
                onClick={() => inputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-400 flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 transition"
              >
                <span className="text-2xl leading-none">+</span>
                <span className="text-xs mt-1">Ekle</span>
              </button>
            )}
          </div>

          {/* Count summary */}
          <p className="text-xs text-gray-400 mt-2">
            {entries.length} dosya seçildi
            {entries.some((e) => errors[e.key]) && (
              <span className="text-red-500 ml-2">• {Object.keys(errors).length} hata</span>
            )}
          </p>
        </div>
      )}

      {/* Upload button */}
      {entries.length > 0 && !allDone && (
        <button
          onClick={handleUpload}
          disabled={anyUploading}
          className="mt-4 w-full py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {anyUploading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Yükleniyor...
            </>
          ) : (
            `${entries.length} Dosyayı Yükle`
          )}
        </button>
      )}
    </div>
  );
}
