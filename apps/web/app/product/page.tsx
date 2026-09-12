import Link from "next/link";
import { PublicPage } from "../../components/site-chrome";
export default function ProductPage() {
  return (
    <PublicPage
      eyebrow="Product"
      title="A control plane for AI workers."
      intro="LATCH turns agent intent into a bounded, verifiable action without giving the model authority over its own permissions."
    >
      <section className="public-content-grid">
        <article>
          <span>01</span>
          <h2>Register the organization</h2>
          <p>
            Connect the admin wallet, identify the company ENSv2 namespace and
            describe each AI worker. Database records support the workspace; ENS
            remains authoritative for action decisions.
          </p>
        </article>
        <article>
          <span>02</span>
          <h2>Assign verifiable authority</h2>
          <p>
            Role, status, capabilities, organization and policy version live in
            protected ENS records controlled by the organization.
          </p>
        </article>
        <article>
          <span>03</span>
          <h2>Propose real actions</h2>
          <p>
            An AI planner creates structured intent. A catalog or capability
            service supplies authoritative product and pricing data.
          </p>
        </article>
        <article>
          <span>04</span>
          <h2>Authorize, then execute</h2>
          <p>
            LATCH verifies ENS, evaluates confidential policy through CRE, and
            releases the exact approved action to a Bazantic-orchestrated
            service.
          </p>
        </article>
      </section>
      <section className="inline-cta">
        <h2>Ready to configure your first organization?</h2>
        <Link className="button button-primary" href="/app">
          Start workspace
        </Link>
      </section>
    </PublicPage>
  );
}
