# Testing

Run all repository gates with npm:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run contracts:test
npm audit --audit-level=high
```

Unit coverage includes ENS record parsing and denials, fresh authorization checks, protected ENS writes, revocation, confidential policy sanitization, real CRE-adapter validation, Bazantic response validation and price integrity, provider failure behavior, wallet signature replay resistance, structured planning, deterministic product pricing, task anti-probing, and the no-execution-on-denial invariant.

An opt-in Sepolia test is available with `RUN_LIVE_ENS_TESTS=true`; it is skipped by default because it requires user-owned ENS names and an RPC endpoint. Browser checks use KaneAI per the workspace testing tooling. The latest attempted browser run is documented under `evidence/demo/BROWSER_TESTING.md` and must not be called passing while external test credits are unavailable.

For a local runtime check, start a locally installed MongoDB service (or set
`MONGODB_URI` to an existing development database), seed the configured
organization and agents, then run the API:

```bash
npm run seed:demo
npm run dev:api
```

Open `http://localhost:4000/health` and `http://localhost:4000/docs`.

Official CRE CLI simulation has passed for the allowed, excessive-amount, and unapproved-vendor fixtures; sanitized results are recorded in `evidence/chainlink/SIMULATION.md`. Live end-to-end sponsor evidence still requires configured Sepolia ENS names and a verified Bazantic Gateway/Recipe. Local provider output is not sponsor evidence.

The web production build uses Next's supported `--webpack` option. In the managed local sandbox, Turbopack's CSS worker attempts to bind an internal port and receives `EPERM`; webpack produces the same optimized Next application without that sandbox-only worker-port dependency.
