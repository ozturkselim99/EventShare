"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminEventsApi, type CreateEventBody } from "./api-client";

const ACCESS_TOKEN_KEY = "es_access_token";
const REFRESH_TOKEN_KEY = "es_refresh_token";

export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_KEY)?.value ?? null;
}

export async function requireAuth(): Promise<string> {
  const token = await getAccessToken();
  if (!token) redirect("/login");
  return token;
}

export async function loginAction(email: string, password: string) {
  const { accessToken, refreshToken } = await authApi.login(email, password);
  const store = await cookies();

  store.set(ACCESS_TOKEN_KEY, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });

  store.set(REFRESH_TOKEN_KEY, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function logoutAction() {
  const token = await getAccessToken();
  if (token) {
    await authApi.logout(token).catch(() => null);
  }
  const store = await cookies();
  store.delete(ACCESS_TOKEN_KEY);
  store.delete(REFRESH_TOKEN_KEY);
  redirect("/login");
}

// ─── Admin Events Actions ─────────────────────────────────────────────────────

export async function createEventAction(data: CreateEventBody) {
  const token = await requireAuth();
  return adminEventsApi.create(token, data);
}

export async function getEventsAction(params?: { search?: string; page?: number }) {
  const token = await requireAuth();
  return adminEventsApi.list(token, params);
}

export async function getEventAction(id: string) {
  const token = await requireAuth();
  return adminEventsApi.get(token, id);
}

export async function updateEventAction(id: string, data: Partial<CreateEventBody>) {
  const token = await requireAuth();
  return adminEventsApi.update(token, id, data);
}

export async function deleteEventAction(id: string) {
  const token = await requireAuth();
  return adminEventsApi.remove(token, id);
}

export async function getStatsAction() {
  const token = await requireAuth();
  return adminEventsApi.stats(token);
}

export async function disableUploadsAction(id: string) {
  const token = await requireAuth();
  return adminEventsApi.disableUploads(token, id);
}

export async function enableUploadsAction(id: string) {
  const token = await requireAuth();
  return adminEventsApi.enableUploads(token, id);
}

// Import needed for typing
import { authApi } from "./api-client";
