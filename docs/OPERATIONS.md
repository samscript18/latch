# Operations runbook

This runbook covers installation, infrastructure preparation, service startup, deployment handoff, health checks, and end-to-end authorization verification.

## 1. Install

```bash
npm ci --include=dev
```

Use Node.js 22.x. The root npm workspace installs dependencies for the API, web application, shared package, and CRE workflow.

## 2. Configure secrets and endpoints

```bash
cp .env.example .env.local
```

Populate the required values described in [Configuration](CONFIGURATION.md). Before starting services, confirm:

- the MongoDB deployment accepts the API network;
- server and browser RPC endpoints target Sepolia;
- the organization wallet controls the configured ENSv2 namespace;
- the CRE endpoint and secret references belong to the intended environment;
- the Bazantic Recipe and Gateway are published;
- the Tavily credential is active;
- the API signer is an authorized `LatchAudit` recorder.

## 3. Prepare ENSv2

Inspect planned writes first:

```bash
npm run ens:setup
npm run ens:create-agents
npm run ens:prepare
```

Execute only after the preview matches the intended namespace, wallets, roles, capabilities, policy versions, resolver addresses, and signer:

```bash
npm run ens:setup -- --execute
npm run ens:create-agents -- --execute
npm run ens:prepare -- --execute
```

Then verify fresh resolution and the resolver permission boundary:

```bash
npm run verify:ens
npm run ens:verify-permissions
```

## 4. Synchronize the workspace index

```bash
npm run seed:workspace
```

This stores organization and worker records for navigation and presentation. ENS remains authoritative during every authorization attempt.

## 5. Start services

```bash
npm run dev
```

Or start workspaces independently:

```bash
npm run dev:api
npm run dev:web
```

Readiness checks:

```bash
curl --fail http://localhost:4000/health
curl --fail http://localhost:4000/integrations/status
curl --fail http://localhost:4000/docs-json
```

## 6. Validate the authorization matrix

Run:

```bash
npm run verify:chainlink
npm run verify:audit
npm run verify:e2e
```

Then validate these paths from `/app/try`:

| Scenario                                            | Expected terminal state | Required evidence                                         |
| --------------------------------------------------- | ----------------------- | --------------------------------------------------------- |
| Active procurement worker, policy-compliant product | `succeeded`             | ENS verified, policy approved, product output and receipt |
| Active procurement worker, policy-rejected action   | `blocked`               | `POLICY_DENIED`; no execution event                       |
| Research worker requesting procurement              | `blocked`               | `ROLE_MISMATCH`; CRE and execution not reached            |
| Revoked worker requesting an otherwise valid action | `blocked`               | `AGENT_REVOKED`; CRE and execution not reached            |
| Active research worker, policy-compliant query      | `succeeded`             | ENS verified, policy approved, linked research output     |

Revocation changes onchain authority. Perform it only when the active-worker scenarios have been captured or when revocation is operationally intended.

## 7. Build artifacts

Full build:

```bash
npm run build
```

API build command:

```bash
npm ci --include=dev && npm run build:api
```

API start command:

```bash
npm run start --workspace=@latch/api
```

Web build command:

```bash
npm ci --include=dev && npm run build --workspace=@latch/shared && npm run build --workspace=@latch/web
```

Web start command:

```bash
npm run start --workspace=@latch/web
```

Use the repository root as the service root for both deployments so npm workspaces and the shared package resolve correctly.

## 8. Hosting handoff

### API service

- Runtime: Node.js 22.x
- Root directory: repository root
- Build: `npm ci --include=dev && npm run build:api`
- Start: `npm run start --workspace=@latch/api`
- Health path: `/health`
- Required outbound access: MongoDB, Sepolia RPC, CRE, Bazantic, Tavily, Vertex AI
- Persistent filesystem: not required

### Web service

- Framework: Next.js
- Root directory: repository root
- Build: `npm ci --include=dev && npm run build --workspace=@latch/shared && npm run build --workspace=@latch/web`
- Start: `npm run start --workspace=@latch/web`
- Browser environment: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SEPOLIA_RPC_URL`

After assigning public origins, set the API `WEB_ORIGIN` to the exact web origin. Bazantic server requests do not require inclusion in CORS because CORS applies to browsers, not server-to-server HTTP.

## 9. Post-deployment checks

From a network outside the hosting environment:

```bash
curl --fail https://<api-host>/health
curl --fail https://<api-host>/docs-json
curl --fail https://<api-host>/integrations/status
```

Then:

1. connect the organization wallet;
2. complete or load the organization workspace;
3. confirm workers resolve from ENS;
4. run one procurement and one research action;
5. inspect task output and activity;
6. confirm the expected `LatchAudit` transaction references;
7. invoke the published Bazantic Recipe and record its receipt.

## 10. Rollback and incident response

If a required integration becomes unavailable:

1. stop new task intake or disable the affected capability;
2. do not bypass ENS, CRE, audit, or receipt verification;
3. inspect `/integrations/status` and provider-side request references;
4. preserve sanitized task/activity identifiers;
5. rotate affected API keys or signer credentials through the provider and host;
6. restart the API after configuration changes;
7. rerun the relevant verification command before restoring intake.

If a worker wallet or capability is compromised, revoke the worker through the authenticated UI. LATCH writes `latch.status=revoked`, removes delegated profile permission, waits for confirmation, and verifies the new status through fresh ENS resolution. Preserve the ENS name for historical audit continuity.

## Evidence hygiene

Safe artifacts include public ENS records, block numbers, resolver addresses, sanitized verdicts, OpenAPI schemas, task IDs, Recipe identifiers, transaction hashes, and opaque execution references.

Never capture environment files, bearer headers, private keys, wallet seed phrases, MongoDB credentials, CRE secret values, private thresholds, vendor/domain rules, signed raw transactions, or provider API keys.
