import { api } from "@/lib/api";
import type { Conversation } from "@/lib/types";

const clientId = 1;

export default async function ConversationsPage() {
  const conversations = await api.get<Conversation[]>(`/conversations?client_id=${clientId}`);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Conversations</h1>
      <div className="grid gap-4">
        {conversations.map((item) => (
          <div key={item.id} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>{item.role}</span>
              <span>{item.session_id}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{item.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

