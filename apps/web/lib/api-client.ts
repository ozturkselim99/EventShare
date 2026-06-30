const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

type FetchOptions = RequestInit & { token?: string };

async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string; refreshToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: (token: string) =>
    apiFetch<{ id: string; email: string }>("/auth/me", { token }),

  logout: (token: string) =>
    apiFetch<void>("/auth/logout", { method: "POST", token }),
};

// ─── Admin Events ─────────────────────────────────────────────────────────────

export const adminEventsApi = {
  list: (token: string, params?: { search?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    return apiFetch<{
      data: EventRecord[];
      total: number;
      page: number;
      limit: number;
    }>(`/admin/events?${qs}`, { token });
  },

  get: (token: string, id: string) =>
    apiFetch<EventRecord>(`/admin/events/${id}`, { token }),

  create: (token: string, body: CreateEventBody) =>
    apiFetch<EventRecord>("/admin/events", {
      method: "POST",
      body: JSON.stringify(body),
      token,
    }),

  update: (token: string, id: string, body: Partial<CreateEventBody>) =>
    apiFetch<EventRecord>(`/admin/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
      token,
    }),

  remove: (token: string, id: string) =>
    apiFetch<void>(`/admin/events/${id}`, { method: "DELETE", token }),

  stats: (token: string) =>
    apiFetch<AdminStats>("/admin/events/stats", { token }),

  disableUploads: (token: string, id: string) =>
    apiFetch<EventRecord>(`/admin/events/${id}/disable-uploads`, {
      method: "POST",
      token,
    }),

  enableUploads: (token: string, id: string) =>
    apiFetch<EventRecord>(`/admin/events/${id}/enable-uploads`, {
      method: "POST",
      token,
    }),
};

// ─── Public Event ─────────────────────────────────────────────────────────────

export const publicApi = {
  getEvent: (token: string) =>
    apiFetch<EventRecord>(`/events/by-token/${token}`),

  getMedia: (eventToken: string, eventId: string, params?: { cursor?: string; limit?: number }) => {
    const qs = new URLSearchParams({ eventId });
    if (params?.cursor) qs.set("cursor", params.cursor);
    if (params?.limit) qs.set("limit", String(params.limit));
    return apiFetch<GalleryPage>(`/events/by-token/${eventToken}/media?${qs}`);
  },

  presign: (eventToken: string, body: PresignBody) =>
    apiFetch<PresignResponse>(`/events/by-token/${eventToken}/uploads/presign`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  completeUpload: (
    eventToken: string,
    body: { mediaId: string; uploadToken: string; checksumSha256?: string },
  ) =>
    apiFetch<{ mediaId: string; status: string }>(
      `/events/by-token/${eventToken}/uploads/complete`,
      { method: "POST", body: JSON.stringify(body) },
    ),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventRecord {
  id: string;
  name: string;
  description: string | null;
  token: string;
  status: string;
  expirationMode: string;
  eventDate: string | null;
  expiresAt: string;
  allowUploads: boolean;
  createdAt: string;
  _count?: { media: number };
}

export interface AdminStats {
  eventsCount: number;
  imagesCount: number;
  videosCount: number;
  storageBytes: string;
}

export interface MediaRecord {
  id: string;
  type: string;
  thumbnailUrl: string | null;
  originalUrl: string | null;
  uploadedBy: string | null;
  createdAt: string;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
}

export interface GalleryPage {
  data: MediaRecord[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CreateEventBody {
  name: string;
  description?: string;
  eventDate?: string;
  expiresAt: string;
  expirationMode?: string;
  maxUploads?: number;
  maxStorageGb?: number;
}

export interface PresignBody {
  filename: string;
  mimeType: string;
  size: number;
  uploadedBy?: string;
}

export interface PresignResponse {
  mediaId: string;
  uploadUrl: string;
  method: string;
  storageKey: string;
  expiresInSeconds: number;
  headers: Record<string, string>;
  uploadToken: string;
}
