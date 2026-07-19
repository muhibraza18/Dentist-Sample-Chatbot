import { api } from "@/lib/api";
import type { Lead } from "@/types";

const clientSlug = "default";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const leads = await api.get<Lead[]>(`/api/leads?clientSlug=${clientSlug}&q=${encodeURIComponent(q)}`);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Leads</h1>
      <form className="flex gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search leads..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
        />
        <button className="rounded-xl bg-cyan-500 px-4 py-3 font-medium text-white">Search</button>
      </form>
      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Service</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-white/10">
                <td className="px-4 py-3">{lead.name}</td>
                <td className="px-4 py-3">{lead.email}</td>
                <td className="px-4 py-3">{lead.phone}</td>
                <td className="px-4 py-3">{lead.serviceRequested}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
