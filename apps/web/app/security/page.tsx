import { PublicPage } from "../../components/site-chrome";
export default function SecurityPage() {
  return (
    <PublicPage
      eyebrow="Security"
      title="Authority is verified at action time."
      intro="LATCH fails closed across identity, confidential policy and execution, while keeping the AI model outside the trust boundary."
    >
      <section className="security-grid">
        {[
          [
            "Fresh ENS authorization",
            "Role, status, wallet and capabilities are resolved from ENS for authorization—not trusted from a database flag.",
          ],
          [
            "Wallet-authenticated administration",
            "Organization changes require a nonce, a wallet signature and a short-lived server session.",
          ],
          [
            "Private policy isolation",
            "Sensitive rules are evaluated by the Chainlink confidential workflow and are never stored in MongoDB.",
          ],
          [
            "Immutable proposals",
            "Product, vendor, quantity and price are bound to one authorization. Material changes require another decision.",
          ],
          [
            "Replay protection",
            "An authorization is consumed once and cannot be reused for another execution.",
          ],
          [
            "Honest integration state",
            "Local providers are visibly labeled and cannot start in hackathon mode as if they were sponsor integrations.",
          ],
        ].map(([t, c]) => (
          <article className="panel" key={t}>
            <h2>{t}</h2>
            <p>{c}</p>
          </article>
        ))}
      </section>
    </PublicPage>
  );
}
