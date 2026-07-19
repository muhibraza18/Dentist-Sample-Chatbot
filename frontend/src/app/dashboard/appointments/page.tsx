import { api } from "@/lib/api";
import type { Appointment } from "@/types";

const clientSlug = "default";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const appointments = await api.get<Appointment[]>(
    `/api/appointments?clientSlug=${clientSlug}&q=${encodeURIComponent(q)}`
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Appointments</h1>
      <form className="flex gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search appointments..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
        />
        <button className="rounded-xl bg-cyan-500 px-4 py-3 font-medium text-white">Search</button>
      </form>
      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created At</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((item) => (
              <tr key={item.id} className="border-t border-white/10">
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3">{item.phone}</td>
                <td className="px-4 py-3">{item.email}</td>
                <td className="px-4 py-3">{item.service}</td>
                <td className="px-4 py-3">{item.appointmentDate}</td>
                <td className="px-4 py-3">{item.appointmentTime}</td>
                <td className="px-4 py-3">{item.status}</td>
                <td className="px-4 py-3">{item.createdAt ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
