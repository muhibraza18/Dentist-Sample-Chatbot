const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  console.log("[api] request", {
    url,
    method: init?.method ?? "GET",
    body: init?.body ?? null,
  });
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.headers ?? {}),
    },
  });
  console.log("[api] response", {
    url,
    status: response.status,
    ok: response.ok,
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("[api] error response", { url, status: response.status, detail });
    throw new Error(detail || `Request failed: ${path}`);
  }
  const data = await response.json();
  console.log("[api] response body", { url, data });
  return data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, {
      method: "POST",
      body: formData,
    }),
};
