import { PublicPage } from "../../components/site-chrome";
export default function ArchitecturePage() {
  return (
    <PublicPage
      eyebrow="Architecture"
      title="The agent proposes. LATCH authorizes."
      intro="Each integration owns one distinct responsibility, and every failure stops execution."
    >
      <section className="architecture-flow">
        {[
          [
            "01",
            "AI planner",
            "Transforms natural language into schema-validated intent.",
          ],
          [
            "02",
            "Bazantic Recipe",
            "Coordinates an external catalog or service and passes authoritative action data.",
          ],
          [
            "03",
            "ENSv2",
            "Proves identity, wallet, role, active status and capability.",
          ],
          [
            "04",
            "Chainlink CRE",
            "Evaluates the action against private organizational policy.",
          ],
          [
            "05",
            "Capability execution",
            "Runs only the immutable action that was authorized.",
          ],
          [
            "06",
            "Audit evidence",
            "Records public-safe outcomes without exposing confidential rules.",
          ],
        ].map(([n, t, c]) => (
          <article key={n}>
            <span>{n}</span>
            <div>
              <h2>{t}</h2>
              <p>{c}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="boundary-card">
        <p className="eyebrow">Confidential boundary</p>
        <h2>
          Policy enters the trusted execution environment. Only a minimal
          verdict leaves.
        </h2>
        <p>
          The agent and browser never receive private limits, vendor rules,
          credentials or confidential intermediate reasoning.
        </p>
      </section>
    </PublicPage>
  );
}
