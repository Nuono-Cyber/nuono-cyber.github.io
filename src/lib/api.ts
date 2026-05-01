export type UserRole = "super_admin" | "admin" | "user";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string | null;
  isSuperAdmin?: boolean;
}

const TOKEN_KEY = "app_auth_token";
const GITHUB_PAGES_HOST = "nuono-cyber.github.io";
const GITHUB_PAGES_DEFAULT_API = "https://nuono-api.onrender.com";

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
  try {
    resp = await fetch(withBase(path), { ...init, headers });
  } catch {
    throw new Error(
      "Backend indisponível. A API não está acessível neste ambiente. Inicie o backend ou publique a API."
    );
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
      request<{ token: string; user: AppUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    signup: (payload: {
      email: string;
      password: string;
      fullName?: string;
      personalEmail?: string;
      inviteCode?: string;
    }) =>
      request<{ ok: boolean }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    session: () => request<{ user: AppUser }>("/api/auth/session"),
    requestReset: (payload: { corporateEmail: string; personalEmail: string }) =>
      request<{ ok: boolean; resetLink?: string }>("/api/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    confirmReset: (payload: { token: string; password: string }) =>
      request<{ ok: boolean }>("/api/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  invites: {
    validate: (code: string, email: string) =>
      request<{ valid: boolean }>("/api/invites/validate", {
        method: "POST",
        body: JSON.stringify({ code, email }),
      }),
    listAdmin: () => request<{ rows: any[] }>("/api/admin/invites"),
    createAdmin: (payload: { code: string; email?: string; personalEmail?: string }) =>
      request<{ row: any }>("/api/admin/invites", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    deleteAdmin: (id: string) =>
      request<{ ok: boolean }>(`/api/admin/invites/${id}`, { method: "DELETE" }),
  },
  users: {
    listAdmin: () => request<{ rows: any[] }>("/api/admin/users"),
  },
  posts: {
    list: () => request<{ rows: any[] }>("/api/posts"),
    upsert: (posts: any[]) =>
      request<{ ok: boolean; processed: number }>("/api/posts/upsert", {
        method: "POST",
        body: JSON.stringify({ posts }),
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
