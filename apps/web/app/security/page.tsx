import { PublicPage } from "../../components/site-chrome";

export default function SecurityPage() {
  return (
    <PublicPage
      eyebrow="Security Model"
      title="Authority is verified at action time."
      intro="LATCH fails closed across identity, confidential policy, and execution, keeping the autonomous model outside the trust boundary."
    >
      <section className="security-grid">
        {[
          [
            "Fresh ENS Authorization",
            "Role, status, wallet address, and capabilities are resolved from ENS records for every proposed action—never trusted from a stale database flag.",
          ],
          [
            "Wallet-Authenticated Admin",
            "Organization onboarding and identity revocation require cryptographic signatures from the admin wallet controlling the ENS namespace.",
          ],
          [
            "Private Policy Isolation",
            "Sensitive corporate rules are evaluated by Chainlink confidential computing workflows and are never stored in databases or sent to client browsers.",
          ],
          [
            "Immutable Action Proposals",
            "Product, vendor, quantity, and dollar amount are cryptographically bound to one authorization. Material modifications require a new verdict.",
          ],
          [
            "Replay Protection",
            "Each authorization token is single-use and consumed upon release, preventing duplicate executions or side-channel replays.",
          ],
          [
            "Honest Integration State",
            "Local test providers are visibly labeled and fail closed if sponsor integration requirements are missing in hackathon mode.",
          ],
        ].map(([title, copy]) => (
          <article className="vestra-card p-8" key={title}>
            <div className="inner-border-mask" />
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <p className="mt-3 text-sm text-muted leading-relaxed">{copy}</p>
          </article>
        ))}
      </section>
    </PublicPage>
  );
}
