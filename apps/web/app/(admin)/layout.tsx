import { requireAuth } from "@/lib/auth";
import { logoutAction } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link
          href="/admin"
          className="text-lg font-bold text-gray-900 hover:text-gray-600 transition"
        >
          EventShare
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/admin/events"
            className="text-sm text-gray-600 hover:text-gray-900 transition"
          >
            Etkinlikler
          </Link>
          <form
            action={async () => {
              "use server";
              await logoutAction();
            }}
          >
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-900 transition"
            >
              Çıkış Yap
            </button>
          </form>
        </nav>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
