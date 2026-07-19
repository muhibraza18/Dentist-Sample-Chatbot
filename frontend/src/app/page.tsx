export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
      <div className="grid gap-10 lg:grid-cols-2">
        <section className="space-y-6">
          <p className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm text-cyan-200">
            Next.js-only AI receptionist for dental clinics
          </p>
          <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            Answer calls, capture leads, and book appointments with one platform.
          </h1>
          <p className="max-w-xl text-lg text-slate-300">
            Built for dental SaaS teams: FAQ RAG, appointment intake, admin dashboards, and a drop-in widget for clinic websites.
          </p>
        </section>
        <section className="glass rounded-3xl p-8">
          <h2 className="text-2xl font-semibold">Included</h2>
          <ul className="mt-6 space-y-3 text-slate-300">
            <li>- Next.js 15 admin dashboard</li>
            <li>- Route Handlers, Server Actions, and React Server Components</li>
            <li>- PostgreSQL + Prisma schema</li>
            <li>- Resend email notifications</li>
            <li>- Embeddable widget entrypoint</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
