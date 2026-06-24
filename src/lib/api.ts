export type UserRole = "super_admin" | "admin" | "user";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string | null;
  isSuperAdmin?: boolean;
  must_change_password?: boolean;
}

export interface LoginSuccessResponse {
  ok: true;
  token: string;
  user: AppUser;
  requiresPasswordChange?: false;
}

export interface MetaConfigResponse {
  configured: boolean;
  instagramUserId: string;
  enabled: boolean;
  hasAccessToken: boolean;
  syncIntervalMinutes: number;
  lastSyncedAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  apiVersion: string;
}

export type LoginResponse = LoginSuccessResponse;

const TOKEN_KEY = "app_auth_token";
const GITHUB_PAGES_HOST = "nuono-cyber.github.io";
const GITHUB_PAGES_DEFAULT_API = "https://nuono-cyber-github-io.onrender.com";
const REQUEST_TIMEOUT_MS = 18000;

function getDefaultApiBase() {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname.toLowerCase();
  if (host === GITHUB_PAGES_HOST) return GITHUB_PAGES_DEFAULT_API;
  return "";
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || getDefaultApiBase()).replace(/\/+$/, "");

function withBase(path: string) {
  if (!API_BASE) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function withQuery(path: string, params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}${path.includes("?") ? "&" : "?"}${query}` : path;
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let resp: Response;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    resp = await fetch(withBase(path), { ...init, headers, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Tempo limite ao carregar dados. O backend pode estar iniciando ou o Supabase demorou para responder.");
    }
    throw new Error(
      "Backend indisponível. A API não está acessível neste ambiente. Inicie o backend ou publique a API."
    );
  } finally {
    window.clearTimeout(timeoutId);
  }
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.error || "Erro na requisição");
  }
  return data as T;
}

export const api = {
  getToken,
  clearToken,
  setToken,
  auth: {
    login: (email: string, password: string) =>
      request<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    session: () => request<{ user: AppUser }>("/api/auth/session"),
  },
  health: () => request<{ ok: boolean; api: string; db: string; stats?: Record<string, number>; timestamp: string }>("/api/health"),
  users: {
    listAdmin: () => request<{ rows: any[] }>("/api/admin/users"),
  },
  posts: {
    list: (options: { limit?: number } = {}) =>
      request<{ rows: any[]; meta: { count: number; limited: boolean; limit: number } }>(
        withQuery("/api/posts", { limit: options.limit || 1000 })
      ),
    upsert: (posts: any[], mode: "replace" | "increment" = "increment") =>
      request<{ ok: boolean; processed: number; mode: "replace" | "increment" }>("/api/posts/upsert", {
        method: "POST",
        body: JSON.stringify({ posts, mode }),
      }),
  },
  meta: {
    config: () => request<MetaConfigResponse>("/api/meta/config"),
    saveConfig: (payload: {
      instagramUserId: string;
      accessToken?: string;
      enabled: boolean;
      syncIntervalMinutes: number;
    }) =>
      request<MetaConfigResponse>("/api/meta/config", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    sync: () =>
      request<{ ok: boolean; processed: number; syncedAt: string }>("/api/meta/sync", {
        method: "POST",
      }),
  },
  activity: {
    create: (action: string, details?: Record<string, unknown>) =>
      request<{ ok: boolean }>("/api/activity", {
        method: "POST",
        body: JSON.stringify({ action, details }),
      }),
    list: () => request<{ rows: any[] }>("/api/activity"),
  },
  chat: {
    users: () => request<{ rows: any[] }>("/api/chat/users"),
    messages: (withUser: string | null) =>
      request<{ rows: any[] }>(`/api/chat/messages${withUser ? `?withUser=${encodeURIComponent(withUser)}` : ""}`),
    send: (content: string, recipientId: string | null) =>
      request<{ row: any }>("/api/chat/messages", {
        method: "POST",
        body: JSON.stringify({ content, recipientId }),
      }),
    markRead: (id: string) =>
      request<{ ok: boolean }>(`/api/chat/messages/${id}/read`, { method: "POST" }),
  },
  ai: {
    chat: (messages: Array<{ role: "user" | "assistant"; content: string }>) =>
      request<{ message: string }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ messages }),
      }),
  },
};
