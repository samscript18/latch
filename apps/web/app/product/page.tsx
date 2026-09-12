import Link from "next/link";
import { PublicPage } from "../../components/site-chrome";

export default function ProductPage() {
  return (
    <PublicPage
      eyebrow="Product Plane"
      title="A cryptographic control plane for AI workers."
      intro="LATCH turns agent intent into a bounded, verifiable action without granting the model authority over its own permissions."
    >
      <section className="public-content-grid">
        <article className="vestra-card p-8">
          <div className="inner-border-mask" />
          <span className="font-mono text-sm text-[#4efa94] font-semibold">
            01
          </span>
          <h2 className="mt-4 text-2xl font-semibold text-foreground">
            Register the Organization
          </h2>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            Connect the admin wallet, identify the company ENSv2 namespace, and
            register authorized AI workers. ENS records remain authoritative for
            every real-world decision.
          </p>
        </article>

        <article className="vestra-card p-8">
          <div className="inner-border-mask" />
          <span className="font-mono text-sm text-[#4efa94] font-semibold">
            02
          </span>
          <h2 className="mt-4 text-2xl font-semibold text-foreground">
            Assign Verifiable Authority
          </h2>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            Role, status, capabilities, organization, and policy version live in
            protected onchain records. The agent cannot modify its own scope.
          </p>
        </article>

        <article className="vestra-card p-8">
          <div className="inner-border-mask" />
          <span className="font-mono text-sm text-[#4efa94] font-semibold">
            03
          </span>
          <h2 className="mt-4 text-2xl font-semibold text-foreground">
            Propose Structured Actions
          </h2>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            An AI planner creates schema-validated intent. External catalogs supply
            authoritative vendor and pricing data bound to an immutable proposal.
          </p>
        </article>

        <article className="vestra-card p-8">
          <div className="inner-border-mask" />
          <span className="font-mono text-sm text-[#4efa94] font-semibold">
            04
          </span>
          <h2 className="mt-4 text-2xl font-semibold text-foreground">
            Authorize, Then Execute
          </h2>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            LATCH checks fresh ENS records, evaluates confidential policy inside a
            Chainlink CRE TEE, and releases execution to a Bazantic Recipe only if
            fully approved.
          </p>
        </article>
      </section>

      <section className="inline-cta">
        <div>
          <h2>Ready to configure your first organization?</h2>
          <p className="mt-2 text-sm text-muted">
            Launch the workspace console to connect your admin wallet and provision
            agents on Sepolia ENSv2.
          </p>
        </div>
        <Link className="brand-button" href="/app">
          <span>Start Workspace</span>
          <svg
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 17L17 7M17 7H7M17 7V17"
            />
          </svg>
        </Link>
      </section>
    </PublicPage>
  );
}
