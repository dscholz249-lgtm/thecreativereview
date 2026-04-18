import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Milestone 1 placeholder: proves RLS-scoped reads work end-to-end. Milestone
  // 2 replaces this with the wireframe-03 metrics + active projects table.
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Milestone 1 placeholder. The wireframe-03 dashboard ships in milestone 2.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Your clients
        </h2>
        {!clients || clients.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600">
            No clients yet. Seed data with <code>npm run db:seed</code> or create
            one once the admin UI ships.
          </p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {clients.map((c) => (
              <li key={c.id} className="rounded-md border border-neutral-200 px-3 py-2">
                {c.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
