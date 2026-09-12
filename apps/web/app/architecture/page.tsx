import { PublicPage } from "../../components/site-chrome";

export default function ArchitecturePage() {
  return (
    <PublicPage
      eyebrow="Architecture & Pipeline"
      title="The agent proposes. LATCH authorizes."
      intro="Each integration owns one distinct responsibility, and every failure stops execution immediately."
    >
      <section className="architecture-flow">
        {[
          [
            "01",
            "AI Planner",
            "Transforms natural language task instructions into strict schema-validated intent.",
          ],
          [
            "02",
            "Bazantic Recipe",
            "Coordinates external services or vendor catalogs and binds authoritative pricing and product data to the action proposal.",
          ],
          [
            "03",
            "ENSv2 Identity & Authority",
            "Verifies agent wallet, active status, organization namespace, and authorized capability directly against onchain records.",
          ],
          [
            "04",
            "Chainlink CRE Confidential Policy",
            "Evaluates proposed parameters against private company policies inside a confidential TEE without leaking thresholds or allowed vendor lists.",
          ],
          [
            "05",
            "Capability Release & Execution",
            "Dispatches only the immutable, authorized action to external APIs, guaranteeing single-use replay protection.",
          ],
          [
            "06",
            "Public-Safe Audit Evidence",
            "Emits sanitized audit events tracking which pipeline stages succeeded, preserving enterprise confidentiality.",
          ],
        ].map(([num, title, desc]) => (
          <article key={num} className="transition-all hover:bg-white/[0.02] p-4 rounded-xl">
            <span>{num}</span>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              <p className="mt-2 text-sm text-muted leading-relaxed">{desc}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="boundary-card">
        <div className="inner-border-mask" />
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#4efa94]">
          Confidential TEE Boundary
        </span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Policy enters the trusted execution environment. Only a minimal verdict leaves.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted max-w-2xl">
          The autonomous agent, web browsers, and public loggers never receive private spend limits,
          vendor allowlists, credentials, or intermediate reasoning.
        </p>
      </section>
    </PublicPage>
  );
}
