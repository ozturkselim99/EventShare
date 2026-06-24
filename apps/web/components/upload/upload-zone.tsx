"use client";

import { useState, useRef } from "react";
import { publicApi, ApiError } from "@/lib/api-client";

interface Props {
  eventToken: string;
  onUploaded?: () => void;
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
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(selected: FileList | null) {
    if (!selected) return;
    const valid = Array.from(selected).filter((f) =>
      ALLOWED_TYPES.includes(f.type),
    );
    setFiles((prev) => [...prev, ...valid]);
    setErrors({});
  }

  async function uploadFile(file: File): Promise<void> {
    const key = file.name + file.size;
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
          setProgress((p) => ({
            ...p,
            [key]: Math.round((e.loaded / e.total) * 90),
          }));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed: ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.open(presign.method, presign.uploadUrl);
      Object.entries(presign.headers).forEach(([k, v]) =>
        xhr.setRequestHeader(k, v),
      );
      xhr.send(file);
    });

    await publicApi.completeUpload(eventToken, {
      mediaId: presign.mediaId,
      uploadToken: presign.uploadToken,
    });

    setProgress((p) => ({ ...p, [key]: 100 }));
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    setErrors({});

    const results = await Promise.allSettled(files.map((f) => uploadFile(f)));

    const errs: Record<string, string> = {};
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const key = files[i]!.name + files[i]!.size;
        errs[key] =
          r.reason instanceof ApiError ? r.reason.message : "Yükleme hatası";
      }
    });

    setErrors(errs);
    setFiles(files.filter((_, i) => results[i]?.status === "rejected"));
    setUploading(false);

    if (Object.keys(errs).length === 0) {
      onUploaded?.();
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Anını Paylaş</h2>

      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">
          Adın (opsiyonel)
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          placeholder="Anonim"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div
        className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 transition"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-sm text-gray-500">
          Fotoğraf veya video sürükle bırak ya da{" "}
          <span className="text-gray-900 font-medium">dosya seç</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          JPG, PNG, WebP, HEIC, MP4, MOV
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((f) => {
            const key = f.name + f.size;
            const pct = progress[key] ?? 0;
            const err = errors[key];
            return (
              <li key={key} className="text-sm">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-gray-700 truncate max-w-xs">{f.name}</span>
                  <span className="text-gray-400 ml-2 shrink-0">
                    {(f.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
                {pct > 0 && pct < 100 && (
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                {pct === 100 && (
                  <span className="text-green-600 text-xs">✓ Yüklendi</span>
                )}
                {err && <span className="text-red-500 text-xs">{err}</span>}
              </li>
            );
          })}
        </ul>
      )}

      {files.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-4 w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition disabled:opacity-50"
        >
          {uploading
            ? "Yükleniyor..."
            : `${files.length} Dosyayı Yükle`}
        </button>
      )}
    </div>
  );
}
