# LATCH

LATCH is an authorization and confidential-policy layer for autonomous AI workers. It gives each agent a verifiable ENSv2 identity, checks organization-owned role and status records, evaluates action-specific policy through Chainlink CRE Confidential Workflows, and executes approved capabilities through Bazantic.

This repository is under active phased implementation. Local providers are development-only and are rejected when `HACKATHON_MODE=true`; they must never be presented as sponsor integration evidence.

## Problem

Tool access is not authority. Giving an autonomous worker a wallet or API key does not mean every use of that tool should be permitted.

## Solution

LATCH treats an AI agent as a digital employee: an organization assigns an identity, business role, status, and capability through ENS records; a confidential workflow decides whether the particular proposed action follows private policy; only then can an approved Bazantic capability execute.

## How it works

```text
Prompt -> validated plan -> provider price -> onchain request audit
       -> fresh ENSv2 authorization -> Chainlink confidential policy
       -> onchain authorization audit -> Bazantic execution -> onchain execution audit
```

The planner cannot set roles or verdicts, MongoDB snapshots cannot authorize, and public routes cannot invoke a capability directly. A task version and authorization ID are single-use.

## Architecture

The backend owns one non-bypassable sequence: validated planning, allowlisted capability selection, provider-sourced pricing, fresh ENS authorization, confidential policy evaluation, exact-action capability execution, and sanitized activity recording. See [the architecture and confidentiality boundary](docs/ARCHITECTURE.md).

## Sponsor integrations

### ENSv2

ENSv2 is the source of truth for the agent wallet and the organization-owned `latch.organization`, `latch.role`, `latch.status`, `latch.capabilities`, and `latch.policyVersion` records. The write path uses the current Permissioned Resolver interface to delegate only `latch.profile`. Revocation preserves the name, writes `revoked`, removes that delegation, confirms the transaction, and re-resolves the identity.

### Chainlink Confidential Workflows

`ConfidentialPolicyProvider` is called only after ENS succeeds and returns a minimal approved/denied verdict. The application never returns thresholds, vendor rules, or confidential reasoning. `packages/cre-workflow` contains a real TypeScript CRE workflow whose HTTP callback is registered with `handlerInTee` and loads policy with `TeeRuntime.getSecret`; see [Chainlink notes](docs/CHAINLINK.md).

### Bazantic

Bazantic is the top-level bounty orchestrator: its Recipe calls a real catalog service, submits the immutable result to authenticated LATCH Gateway routes, executes only after approval, and reports the receipt for audit. `CAPABILITY_PROVIDER=recipe` disables direct LATCH search/execution so the final path cannot recurse or fall back to fixtures; see [Bazantic setup](docs/BAZANTIC.md).

## Demo scenarios

- Procurement agent + standard monitors: authorized and executed with live integrations.
- Procurement agent + premium monitors: blocked by confidential policy.
- Travel agent + procurement request: blocked by ENS before policy.
- Revoked procurement agent: blocked by ENS before policy.

## Local setup

```bash
cp .env.example .env
npm install
npm run seed:demo
npm run build
npm run dev
```

The web app runs at `http://localhost:3000` and the API at `http://localhost:4000`; generated API documentation is at `http://localhost:4000/docs`. MongoDB defaults to `mongodb://127.0.0.1:27017/latch`. Start a locally installed MongoDB service before seeding or running the API, or set `MONGODB_URI` to an existing development database.

The demo workspace is at `/demo`, its sanitized audit feed at `/demo/activity`, and runtime integration readiness at `/demo/integrations`. The status page only labels ENS connected after a live resolution and MongoDB connected from the active database connection; configured endpoints alone are not reported as successful calls.

## Environment variables

Copy `.env.example` to the repository root as `.env.local` (preferred) or `.env`. Both the API and web workspace load root configuration, with `.env.local` taking precedence. Browser-exposed values are limited to `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SEPOLIA_RPC_URL`. MongoDB, signer material, the Vertex AI key, CRE secret reference, Bazantic API key, and audit recorder address remain server-only. The Gemini planner is called through Vertex AI Express Mode, not the Gemini Developer API. `HACKATHON_MODE=true` rejects startup unless Gemini through Vertex AI, Chainlink, and Bazantic providers are selected, a deployed audit recorder is configured, and the required live endpoint/credential configuration is complete; it never silently falls back to local providers.

## Running the apps

```bash
npm run dev
# or independently
npm run dev:api
npm run dev:web
```

## Environment and integration preparation

`.env.example` distinguishes browser-safe values from server-only RPC URLs, keys, signer material, CRE references, and Bazantic credentials. Never put secrets behind `NEXT_PUBLIC_`.

Prepare existing ENSv2 child identities with a dry run, then opt into writes:

```bash
npm run ens:prepare
npm run ens:prepare -- --execute
```

## Running CRE simulation

Configure the current official CRE toolchain and confidential secret reference, then follow [the Chainlink simulation and evidence procedure](docs/CHAINLINK.md). `npm run verify:chainlink` checks the sanitized allowed and denied responses exposed by the configured workflow endpoint; it does not substitute a local result for CRE evidence.

## Bazantic setup

Create the Gateway and Recipe in the currently available Bazantic dashboard, connect a real catalog service, and map the three authenticated proposal operations documented by LATCH. Exact schemas and anti-probing instructions are in [the Bazantic guide](docs/BAZANTIC.md).

Run evidence checks after configuring live integrations:

```bash
npm run verify:ens
npm run verify:chainlink
npm run verify:audit
npm run verify:demo
```

See the [demo runbook](docs/DEMO.md), [architecture](docs/ARCHITECTURE.md), and [testing guide](docs/TESTING.md).

## Smart contract

`packages/contracts` contains the small Foundry-based `LatchAudit` event recorder and deployment script. The backend records requested, authorized, blocked, and executed stages in transaction order and refuses to execute when a required audit write fails. Events contain hashes/opaque references, never private policy. `npm run verify:audit` verifies the deployment and recorder; add `-- --execute` to emit a sanitized requested/blocked smoke pair.

## Project structure

```text
apps/web               Next.js dashboard and wallet admin flow
apps/api               NestJS authorization and execution API
packages/shared        Runtime schemas and domain types
packages/contracts     Solidity audit recorder and Foundry tests
packages/cre-workflow  Real secret-backed CRE TEE handler and tests
scripts                ENS preparation, seed, and verification commands
evidence               User-captured sponsor evidence locations
```

## Security and privacy model

All external failures deny execution. Admin mutations require a one-time signed challenge and short-lived opaque session; only session hashes are stored. Prices come from the capability provider and totals are calculated server-side. Policy rules, keys, and confidential decision detail are excluded from MongoDB, browser state, public logs, and onchain events.

## Known MVP limitations

- Real ENS names, Sepolia funds, CRE access, and Bazantic dashboard configuration must be supplied by the project owner.
- Chainlink Confidential Workflows are currently private beta; local simulation is available, while deployment requires owner access and secure HTTP-trigger authentication configuration.
- The travel capability is modeled for authorization demonstrations but intentionally not executable in the procurement MVP.
- Final hosting and production deployment are outside this repository's scope.

## Hackathon scope

The MVP deliberately proves one procurement capability for one organization and two agents. It does not attempt general enterprise RBAC, cross-chain execution, human approvals, a marketplace, billing, or production deployment. The four acceptance paths are success, confidential-policy denial, wrong-role denial, and revoked-agent denial.

## Running tests

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run contracts:test
```

No production or hosted deployment is performed by repository scripts.
