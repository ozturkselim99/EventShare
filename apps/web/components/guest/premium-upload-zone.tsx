"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { publicApi, ApiError } from "@/lib/api-client";
import {
  Upload,
  Camera,
  Image as ImageIcon,
  Trash2,
  CheckCircle,
} from "lucide-react";

interface Props {
  eventToken: string;
  onUploaded?: () => void;
}

interface FileEntry {
  file: File;
  key: string;
  preview: string | null;
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

export function PremiumUploadZone({ eventToken, onUploaded }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      entries.forEach((e) => {
        if (e.preview) URL.revokeObjectURL(e.preview);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const valid = Array.from(selected).filter((f) =>
      ALLOWED_TYPES.includes(f.type)
    );
    const newEntries: FileEntry[] = valid.map((f) => ({
      file: f,
      key: f.name + f.size + f.lastModified,
      preview: f.type.startsWith("image/")
        ? URL.createObjectURL(f)
        : null,
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
    setProgress((p) => {
      const n = { ...p };
      delete n[key];
      return n;
    });
    setErrors((e) => {
      const n = { ...e };
      delete n[key];
      return n;
    });
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
          setProgress((p) => ({
            ...p,
            [key]: Math.round((e.loaded / e.total) * 90),
          }));
        }
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`${xhr.status}`));
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.open(presign.method, presign.uploadUrl);
      Object.entries(presign.headers).forEach(([k, v]) =>
        xhr.setRequestHeader(k, v)
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
    if (entries.length === 0 || uploading) return;
    setUploading(true);
    setErrors({});

    const results = await Promise.allSettled(entries.map((e) => uploadEntry(e)));

    const errs: Record<string, string> = {};
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const key = entries[i]!.key;
        errs[key] =
          r.reason instanceof ApiError
            ? r.reason.message
            : "Upload failed";
      }
    });

    const failedKeys = new Set(Object.keys(errs));
    setErrors(errs);
    setEntries((prev) => prev.filter((e) => failedKeys.has(e.key)));
    setUploading(false);

    if (Object.keys(errs).length === 0) {
      setUploadComplete(true);
      setEntries([]);
      setTimeout(() => {
        setUploadComplete(false);
        onUploaded?.();
      }, 2000);
    }
  }

  const allDone = entries.length > 0 && entries.every((e) => progress[e.key] === 100);

  if (uploadComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex items-center justify-center py-12"
      >
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.6 }}
            className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50"
          >
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </motion.div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">
            Anılar Paylaşıldı!
          </h3>
          <p className="text-gray-600">Fotoğrafların işleniyor</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 sm:p-8 lg:p-10"
    >
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
        Anılarını Paylaş
      </h2>
      <p className="text-gray-600 mb-8">
        Bu etkinliğe fotoğraf ve video yükle
      </p>

      {/* Name Input */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Senin Adın (Opsiyonel)
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          placeholder="Anonim"
          disabled={uploading}
          className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 transition"
        />
      </motion.div>

      {/* Drop Zone */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`relative rounded-3xl border-2 border-dashed transition-all duration-200 overflow-hidden ${
          dragOver
            ? "border-emerald-500 bg-emerald-50"
            : "border-gray-200 hover:border-gray-300 bg-gray-50/50"
        } ${uploading ? "pointer-events-none opacity-50" : ""}`}
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-full p-8 sm:p-12 text-center cursor-pointer"
          type="button"
        >
          <motion.div
            animate={dragOver ? { scale: 1.1 } : { scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={dragOver ? { y: -4 } : { y: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-4 flex justify-center"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 opacity-10"
                >
                  <Upload className="w-16 h-16 text-emerald-600" />
                </motion.div>
                <Upload className="w-16 h-16 text-emerald-600 relative" />
              </div>
            </motion.div>

            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Fotoğrafları Sürükle & Bırak
            </h3>
            <p className="text-gray-600 mb-4">
              Ya da dosya seçmek için tıkla
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-600">
                <ImageIcon className="w-4 h-4" />
                Fotoğraflar
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-600">
                <Upload className="w-4 h-4" />
                Videolar
              </span>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              JPG, PNG, WebP, HEIC, MP4, MOV • Max 500MB
            </p>
          </motion.div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </motion.div>

      {/* Camera Button (Mobile) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-4 sm:hidden"
      >
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="w-full py-3 px-4 rounded-2xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
          type="button"
        >
          <Camera className="w-5 h-5" />
          Fotoğraf Çek
        </button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </motion.div>

      {/* Preview Grid */}
      <AnimatePresence mode="popLayout">
        {entries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-8"
          >
            <p className="text-sm font-medium text-gray-700 mb-4">
              {entries.length} dosya seçildi
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {entries.map((entry) => {
                const pct = progress[entry.key] ?? -1;
                const err = errors[entry.key];
                const done = pct === 100;
                const inProgress = pct >= 0 && pct < 100 && uploading;

                return (
                  <motion.div
                    key={entry.key}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative group rounded-2xl overflow-hidden bg-gray-100 aspect-square"
                  >
                    {/* Thumbnail */}
                    {entry.preview ? (
                      <motion.img
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        src={entry.preview}
                        alt={entry.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                        <Upload className="w-8 h-8 text-blue-600 mb-1" />
                        <span className="text-xs text-center text-blue-600 px-1 truncate font-medium">
                          {entry.file.name.split(".")[0]}
                        </span>
                      </div>
                    )}

                    {/* Progress Overlay */}
                    <AnimatePresence>
                      {inProgress && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center"
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full mb-2"
                          />
                          <span className="text-white text-xs font-semibold">
                            {pct}%
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Success Overlay */}
                    <AnimatePresence>
                      {done && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-emerald-600/80 flex items-center justify-center"
                        >
                          <motion.div
                            animate={{ scale: [0.5, 1] }}
                            transition={{ duration: 0.3 }}
                          >
                            <CheckCircle className="w-8 h-8 text-white" />
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Error Overlay */}
                    <AnimatePresence>
                      {err && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-red-600/80 flex items-center justify-center p-2"
                        >
                          <span className="text-white text-xs text-center leading-tight font-medium">
                            {err}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Remove Button */}
                    <AnimatePresence>
                      {!uploading && !done && !err && (
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0 }}
                          whileHover={{ opacity: 1 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeEntry(entry.key);
                          }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center transition hover:bg-red-600"
                          type="button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Button */}
      <AnimatePresence>
        {entries.length > 0 && !allDone && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={handleUpload}
            disabled={uploading}
            className="mt-8 w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-2xl hover:shadow-lg hover:shadow-emerald-500/30 transition disabled:opacity-60 flex items-center justify-center gap-2 text-lg"
            type="button"
          >
            {uploading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                Yükleniyor...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                {entries.length} Dosyayı Yükle
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
