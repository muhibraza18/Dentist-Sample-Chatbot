import { api } from "@/lib/api";
import type { Appointment, Conversation, KnowledgeDocument, Lead } from "@/lib/types";

const clientId = 1;

export default async function DashboardPage() {
  const [appointments, leads, conversations, knowledge] = await Promise.all([
    api.get<Appointment[]>(`/appointments?client_id=${clientId}`),
    api.get<Lead[]>(`/leads?client_id=${clientId}`),
    api.get<Conversation[]>(`/conversations?client_id=${clientId}`),
    api.get<KnowledgeDocument[]>(`/knowledge?client_id=${clientId}`),
  ]);

  const cards = [
    { label: "Appointments", value: appointments.length },
    { label: "Leads", value: leads.length },
    { label: "Conversations", value: conversations.length },
    { label: "Knowledge Docs", value: knowledge.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Overview</h1>
        <p className="mt-1 text-slate-400">Tenant-scoped activity for clinic ID {clientId}.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="glass rounded-2xl p-5">
            <div className="text-sm text-slate-400">{card.label}</div>
            <div className="mt-2 text-3xl font-semibold">{card.value}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass rounded-2xl p-5">
          <h2 className="text-lg font-medium">Recent Appointments</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            {appointments.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 p-3">
                {item.name} - {item.service} - {item.appointment_date} {item.appointment_time}
              </div>
            ))}
          </div>
        </section>
        <section className="glass rounded-2xl p-5">
          <h2 className="text-lg font-medium">Recent Leads</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            {leads.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 p-3">
                {item.name} - {item.service_requested}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
