# LATCH

LATCH is an identity, authorization, and confidential-policy layer for autonomous AI workers. It gives every worker an organization-controlled ENSv2 identity, verifies its authority from fresh onchain records, evaluates each proposed action inside a Chainlink CRE Confidential Workflow, and releases approved execution through Bazantic-connected services.

> Tool access is not authority. LATCH lets an AI worker use a capability only when its identity, organizational role, current status, assigned capability, and action-specific policy all agree.

## Security guarantees

- **Onchain identity is authoritative.** MongoDB snapshots support presentation and indexing; they never authorize an action.
- **Policies remain confidential.** Thresholds, allowlists, and private decision detail stay inside the CRE confidential handler.
- **Execution cannot bypass authorization.** Capability providers are reachable only through the task or authenticated Recipe orchestration services.
- **Every proposal is immutable and single-use.** Replays and modified execution receipts are rejected.
- **Failures deny authority.** Resolution, policy, provider, audit, and schema failures stop execution.
- **Revocation is immediate at the authorization boundary.** A revoked ENS identity is rejected before policy evaluation or tool invocation.

## Decision flow

```text
User request
    |
    v
Schema-validated intent planning
    |
    v
Allowlisted capability + provider-owned data
    |
    v
Fresh ENSv2 identity authorization
    |-- unresolved / wrong wallet / wrong role / revoked --> DENY
    v
Chainlink CRE confidential policy
    |-- policy violation / unavailable workflow ----------> DENY
    v
Bazantic-orchestrated capability execution
    |
    v
Persistent activity + LatchAudit events + execution output
```

The language model proposes structured intent. It cannot set a role, authorization result, provider price, policy verdict, or confidential policy value.

## Supported workers

| Worker      | ENS business role | Capability             | Execution output                                                          |
| ----------- | ----------------- | ---------------------- | ------------------------------------------------------------------------- |
| Procurement | `procurement`     | `procurement.purchase` | Product, quantity, provider price, total, vendor, product URL, receipt    |
| Research    | `research`        | `research.search`      | Ranked source links, excerpts, query metadata, provider request reference |

Both capabilities use the same ENS-first and policy-second authorization boundary.

## System components

| Component           | Responsibility                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| Next.js application | Wallet session, organization onboarding, worker administration, task execution, evidence views    |
| NestJS API          | Authentication, state transitions, authorization orchestration, provider adapters, persistence    |
| MongoDB             | Organizations, indexed worker snapshots, tasks, proposals, execution receipts, sanitized activity |
| ENSv2 on Sepolia    | Authoritative worker wallet, organization, role, status, capability, and policy version           |
| Chainlink CRE       | Confidential evaluation of action-specific organization policy                                    |
| Bazantic            | Multi-service Recipe orchestration and authorized procurement execution                           |
| Tavily              | Authorized research search                                                                        |
| `LatchAudit.sol`    | Minimal onchain lifecycle events using hashes and opaque references                               |

## Workspace

The authenticated workspace is mounted at `/app`:

| Route            | Purpose                                                                               |
| ---------------- | ------------------------------------------------------------------------------------- |
| `/app`           | Organization posture, worker identities, integration health, and recent decisions     |
| `/app/try`       | Execute a request through the complete LATCH pipeline                                 |
| `/app/agents`    | Create, inspect, verify, and revoke AI workers                                        |
| `/app/tasks`     | Browse task states and execution outcomes                                             |
| `/app/tasks/:id` | Inspect the proposal, purchased products or research results, and authorization trail |
| `/app/activity`  | Review public-safe authorization activity                                             |
| `/app/settings`  | Manage organization profile and policy configuration                                  |

Administrative actions require wallet challenge authentication. The API issues a one-time nonce, verifies the wallet signature, and returns a short-lived opaque session token. Private keys never enter the application.

## Prerequisites

- Node.js 22.x and npm 11.x
- MongoDB connection string
- Ethereum Sepolia RPC endpoint
- Organization-controlled ENSv2 namespace and worker names
- Google Cloud API key for Gemini through Vertex AI
- Chainlink CRE workflow endpoint and secret references
- Bazantic Gateway/Recipe credentials
- Tavily API key for research
- Deployed `LatchAudit` contract and authorized recorder

## Install and configure

```bash
npm install
cp .env.example .env.local
```

Populate `.env.local` using [the configuration reference](docs/CONFIGURATION.md). Only variables prefixed with `NEXT_PUBLIC_` may be exposed to the browser. Wallet signer material, MongoDB credentials, RPC credentials, CRE references, and provider keys must remain server-side.

Prepare ENS identities, synchronize the workspace index, and start both applications:

```bash
npm run ens:prepare
npm run ens:prepare -- --execute
npm run seed:workspace
npm run dev
```

Default workstation endpoints:

- Web application: `http://localhost:3000`
- API: `http://localhost:4000`
- OpenAPI UI: `http://localhost:4000/docs`
- OpenAPI JSON: `http://localhost:4000/docs-json`
- Health: `http://localhost:4000/health`

## Verification

Run the repository gates:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run contracts:test
```

Run integration verification after credentials and onchain identities are configured:

```bash
npm run verify:ens
npm run verify:chainlink
npm run verify:audit
npm run verify:e2e
```

Each verification command fails closed. A configured URL is not considered a successful integration call; connected status requires a valid live response.

## Repository map

```text
apps/web               Next.js operator application
apps/api               NestJS authorization and execution API
packages/shared        Domain types and strict runtime schemas
packages/contracts     Foundry project for LatchAudit
packages/cre-workflow  Chainlink CRE confidential workflow
scripts                ENS, indexing, deployment, and verification commands
docs                   Architecture and operator documentation
evidence               Sanitized integration artifacts and transaction references
```

## Documentation

- [Architecture and trust boundaries](docs/ARCHITECTURE.md)
- [Configuration reference](docs/CONFIGURATION.md)
- [HTTP API reference](docs/API.md)
- [ENSv2 identity and revocation](docs/ENSV2.md)
- [Chainlink confidential policy](docs/CHAINLINK.md)
- [Bazantic Recipe orchestration](docs/BAZANTIC.md)
- [Research capability](docs/RESEARCH.md)
- [Operations runbook](docs/OPERATIONS.md)
- [Testing and verification](docs/TESTING.md)

## Deployment boundary

Repository scripts prepare infrastructure and application artifacts but do not publish the web application, API, or database. Hosting is performed by the project owner. See [the operations runbook](docs/OPERATIONS.md) for build commands, readiness checks, secret handling, and post-deployment verification.
