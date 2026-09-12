import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/site-chrome";

const layers = [
  [
    "01",
    "Identity",
    "ENSv2 resolves the agent wallet, organization, role, status and assigned capabilities from organization-controlled records.",
  ],
  [
    "02",
    "Authority",
    "LATCH verifies those live records for every proposed action. Revoked or incorrectly assigned agents stop here.",
  ],
  [
    "03",
    "Private policy",
    "Chainlink CRE evaluates company rules in a confidential workflow without revealing thresholds or vendor restrictions.",
  ],
  [
    "04",
    "Execution",
    "A Bazantic Recipe coordinates the external service and executes only the exact action that passed authorization.",
  ],
];

export default function HomePage() {
  return (
    <main className="public-shell">
      <SiteHeader />
      <section className="hero-section">
        <div>
          <p className="eyebrow">
            Authority infrastructure for autonomous agents
          </p>
          <h1>
            Give AI workers a job—without giving them the keys to everything.
          </h1>
          <p className="hero-copy">
            LATCH gives every autonomous agent a verifiable identity, bounded
            organizational authority, confidential policy enforcement and a
            controlled path to real services.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/app">
              Start your workspace
            </Link>
            <Link className="button" href="/architecture">
              Explore the architecture
            </Link>
          </div>
          <div className="trust-line">
            <span>Built on</span>
            <strong>ENSv2</strong>
            <strong>Chainlink CRE</strong>
            <strong>Bazantic</strong>
          </div>
        </div>
        <div className="pipeline-visual">
          <div className="pipeline-request">
            <small>Proposed action</small>
            <strong>Purchase 20 office monitors</strong>
            <span>Agent proposes. It does not approve.</span>
          </div>
          {[
            "ENS identity verified",
            "Organizational authority confirmed",
            "Private policy approved",
            "Capability execution released",
          ].map((stage, index) => (
            <div className="pipeline-stage" key={stage}>
              <span>{index + 1}</span>
              <strong>{stage}</strong>
              <i>✓</i>
            </div>
          ))}
        </div>
      </section>
      <section className="problem-section">
        <p className="eyebrow">The missing control layer</p>
        <div>
          <h2>Tool access is not authority.</h2>
          <p>
            AI agents can hold wallets, call APIs and initiate transactions.
            Traditional access controls answer whether an agent can reach a
            tool. They do not determine whether this agent, acting for this
            organization, may perform this specific action right now.
          </p>
        </div>
      </section>
      <section className="layers-section">
        <header>
          <p className="eyebrow">How LATCH decides</p>
          <h2>Four independent layers. One fail-closed decision.</h2>
        </header>
        <div className="layer-grid">
          {layers.map(([number, title, copy]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="outcomes-section">
        <div>
          <p className="eyebrow">Accountable autonomy</p>
          <h2>
            An identity that can be trusted. Authority that can be withdrawn.
          </h2>
          <p>
            Organizations retain control of authorization-critical ENS records.
            Agents cannot promote themselves, change protected capabilities or
            reverse revocation.
          </p>
          <Link className="text-link" href="/security">
            Read the security model →
          </Link>
        </div>
        <div className="outcome-list">
          <div>
            <span className="outcome-good">Allowed</span>
            <strong>Correct agent + compliant action</strong>
            <small>Authorized, executed and recorded</small>
          </div>
          <div>
            <span className="outcome-bad">Blocked</span>
            <strong>Correct agent + forbidden action</strong>
            <small>Stopped by confidential policy</small>
          </div>
          <div>
            <span className="outcome-bad">Blocked</span>
            <strong>Wrong or revoked agent</strong>
            <small>Stopped before policy or execution</small>
          </div>
        </div>
      </section>
      <section className="cta-section">
        <p className="eyebrow">Create your authority boundary</p>
        <h2>Put every agent action through a verifiable decision.</h2>
        <p>
          Connect the organization wallet, configure its ENS namespace and
          register the AI workers LATCH should protect.
        </p>
        <Link className="button button-primary" href="/app">
          Launch LATCH
        </Link>
      </section>
      <SiteFooter />
    </main>
  );
}
