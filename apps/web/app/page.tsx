const stages = [
  "ENS identity",
  "Private policy",
  "Approved capability",
  "Execute",
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-8 md:px-12 lg:px-20">
      <nav className="mx-auto flex max-w-7xl items-center justify-between border-b border-[var(--line)] pb-5">
        <div className="text-sm font-bold tracking-[0.28em]">LATCH</div>
        <a
          className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-white"
          href="/demo"
        >
          Launch Demo
        </a>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-14 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:py-28">
        <div>
          <p className="mb-6 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">
            Authority infrastructure for AI
          </p>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.03] tracking-[-0.045em] md:text-7xl">
            Give AI workers a job — without giving them the keys to everything.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            LATCH gives autonomous agents verifiable identities, limited
            authority, approved capabilities, and confidential policy
            enforcement.
          </p>
          <a
            className="mt-9 inline-flex rounded-md bg-[var(--accent)] px-6 py-3.5 text-sm font-bold text-white"
            href="/demo"
          >
            Launch Demo
          </a>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_20px_60px_rgba(20,32,29,0.08)]">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
            Authorization path
          </p>
          <div className="space-y-3">
            <div className="rounded-lg border border-[var(--line)] px-4 py-3 text-sm font-semibold">
              AI action proposed
            </div>
            {stages.map((stage) => (
              <div key={stage} className="flex items-center gap-3">
                <span
                  className="ml-5 h-4 border-l border-[var(--line)]"
                  aria-hidden="true"
                />
                <div className="flex flex-1 items-center justify-between rounded-lg bg-[#eef4f0] px-4 py-3 text-sm font-semibold">
                  <span>{stage}</span>
                  <span className="text-[var(--accent)]" aria-label="verified">
                    ✓
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-px overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--line)] md:grid-cols-3">
        {[
          [
            "Verifiable Identity",
            "Resolve who the agent is and what role the organization assigned on ENSv2.",
          ],
          [
            "Private Policy",
            "Evaluate each proposed action without exposing sensitive organizational rules.",
          ],
          [
            "Revocable Authority",
            "Withdraw future authority while preserving a stable identity and audit history.",
          ],
        ].map(([title, copy]) => (
          <article className="bg-white p-7" key={title}>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{copy}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
