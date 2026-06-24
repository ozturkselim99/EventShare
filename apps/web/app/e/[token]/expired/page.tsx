import { publicApi } from "@/lib/api-client";
import Link from "next/link";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ExpiredPage({ params }: Props) {
  const { token } = await params;

  let eventName = "Bu Etkinlik";
  try {
    const event = await publicApi.getEvent(token);
    eventName = event.name;
  } catch {
    // ok
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">⌛</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{eventName}</h1>
        <p className="text-gray-500 text-sm">
          Bu etkinliğin süresi dolmuştur. Yeni fotoğraf veya video yüklenemez.
        </p>
        <p className="mt-6 text-xs text-gray-400">
          Etkinlik sahibiyle iletişime geçin.
        </p>
      </div>
    </div>
  );
}
