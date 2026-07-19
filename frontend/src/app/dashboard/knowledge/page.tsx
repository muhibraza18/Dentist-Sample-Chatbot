"use client";

import { useEffect, useState } from "react";

const clientSlug = "default";

export default function KnowledgePage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function loadDocs() {
    const response = await fetch(`/api/knowledge?clientSlug=${clientSlug}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const data = await response.json();
    setDocs(data);
  }

  useEffect(() => {
    loadDocs().catch((err) => {
      console.error("[knowledge] load error", err);
      setError("Failed to load knowledge documents.");
    });
  }, []);

  async function onSubmit(formData: FormData) {
    setError("");
    setStatus("");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Please choose a PDF, DOCX, or TXT file.");
      return;
    }
    console.log("[knowledge] upload payload", {
      clientSlug,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    });
    setBusy(true);
    try {
      formData.set("clientSlug", clientSlug);
      const response = await fetch(`/api/knowledge/upload`, {
        method: "POST",
        body: formData,
      });
      console.log("[knowledge] proxy response", {
        status: response.status,
        ok: response.ok,
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "Upload failed");
      }
      const result = await response.json();
      console.log("[knowledge] upload response", result);
      setStatus("Upload complete.");
      await loadDocs();
    } catch (err) {
      console.error("[knowledge] upload error", err);
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Knowledge Base</h1>
      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
      {status ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{status}</div> : null}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await onSubmit(new FormData(event.currentTarget));
        }}
        className="glass space-y-4 rounded-2xl p-5"
      >
        <div className="text-sm text-slate-300">Upload PDF, DOCX, or TXT documents.</div>
        <input
          name="file"
          type="file"
          accept=".pdf,.docx,.txt"
          className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300"
        />
        <button
          disabled={busy}
          className="rounded-xl bg-cyan-500 px-4 py-3 font-medium text-white disabled:opacity-60"
        >
          {busy ? "Uploading..." : "Upload"}
        </button>
      </form>
      <div className="grid gap-4">
        {docs.map((doc) => (
          <div key={doc.id} className="glass rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wide text-slate-400">Document {doc.id}</div>
            <p className="mt-3 line-clamp-4 text-sm text-slate-200">{doc.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
