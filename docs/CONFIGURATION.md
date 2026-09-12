# Configuration reference

LATCH reads root-level `.env` and `.env.local` files. Process-level environment variables take precedence. The API validates configuration at startup with Zod and refuses invalid chain IDs, addresses, URLs, provider combinations, or strict-mode integration gaps.

## Exposure classes

| Class                | Rule                                                                |
| -------------------- | ------------------------------------------------------------------- |
| Browser-safe         | Only `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SEPOLIA_RPC_URL`        |
| Server configuration | Runtime flags, public contract addresses, public ENS names          |
| Server secret        | MongoDB URI, API keys, signer key, CRE references and secret values |

Never add `NEXT_PUBLIC_` to a secret. Never place populated environment files in source control, screenshots, tickets, logs, or evidence artifacts.

## Runtime

| Variable                     | Required | Description                                        |
| ---------------------------- | -------- | -------------------------------------------------- |
| `NODE_ENV`                   | Yes      | `development`, `test`, or `production`             |
| `PORT`                       | Yes      | API listener port; defaults to `4000`              |
| `WEB_ORIGIN`                 | Yes      | Browser origin allowed by API CORS                 |
| `MONGODB_URI`                | Yes      | MongoDB connection string                          |
| `AUTH_CHALLENGE_TTL_SECONDS` | Yes      | One-time wallet challenge lifetime, 60–600 seconds |
| `AUTH_SESSION_TTL_SECONDS`   | Yes      | Opaque wallet session lifetime, 300–86,400 seconds |

`WEB_ORIGIN` controls browser CORS only. Server-to-server Bazantic requests are not subject to browser CORS; they are authenticated by bearer credential and validated by the API.

## Browser configuration

| Variable                      | Required | Description                                                        |
| ----------------------------- | -------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL`         | Yes      | Public HTTPS base URL of the NestJS API                            |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Yes      | Browser-readable Sepolia RPC used for wallet/onchain UI operations |

Use separate RPC credentials for browser and server environments when the provider supports scoped keys.

## ENSv2 and Sepolia

| Variable                           | Required | Description                                             |
| ---------------------------------- | -------- | ------------------------------------------------------- |
| `SEPOLIA_RPC_URL`                  | Yes      | Server-side Sepolia JSON-RPC endpoint                   |
| `SEPOLIA_CHAIN_ID`                 | Yes      | Must be `11155111`                                      |
| `ENSV2_UNIVERSAL_RESOLVER_ADDRESS` | Yes      | Universal Resolver for the target ENSv2 deployment      |
| `ADMIN_WALLET_ADDRESS`             | Yes      | Organization controller and authenticated administrator |
| `SEPOLIA_DEPLOYER_PRIVATE_KEY`     | Scripts  | Server/script signer; never expose to the browser       |

The namespace, worker-name, and worker-wallet variables under the chain section of `.env.example` are required by ENS preparation and verification scripts. Their values must reference real identities from the configured ENSv2 deployment.

Agent private-key variables are required only for permission-boundary verification. They must not be present in hosted web environments.

## Planning

| Variable               | Required | Description                                    |
| ---------------------- | -------- | ---------------------------------------------- |
| `PLANNER_PROVIDER`     | Yes      | Set to `gemini` for Vertex AI planning         |
| `GOOGLE_CLOUD_API_KEY` | Yes      | Server-only Vertex AI Express Mode credential  |
| `GEMINI_MODEL`         | Yes      | Model identifier, currently `gemini-3.7-flash` |

Planner responses are constrained by capability-specific JSON schemas and parsed again by shared runtime validation.

## Confidential policy

| Variable                       | Required   | Description                                            |
| ------------------------------ | ---------- | ------------------------------------------------------ |
| `POLICY_PROVIDER`              | Yes        | Set to `chainlink` for confidential policy enforcement |
| `CRE_ENVIRONMENT`              | Yes        | CRE environment/target identifier                      |
| `CRE_POLICY_SECRET_REFERENCE`  | Yes        | Reference to the confidential policy secret            |
| `CRE_WORKFLOW_URL`             | Yes        | HTTPS endpoint for the deployed confidential workflow  |
| `LATCH_PROCUREMENT_POLICY_ALL` | Simulation | Procurement policy secret injected into CRE simulation |
| `LATCH_RESEARCH_POLICY_ALL`    | Simulation | Research policy secret injected into CRE simulation    |

Secret JSON must never be sent to the API, stored in MongoDB, exposed to the browser, or written to audit events.

## Bazantic and capability execution

| Variable                      | Required    | Description                                                                 |
| ----------------------------- | ----------- | --------------------------------------------------------------------------- |
| `CAPABILITY_PROVIDER`         | Yes         | `recipe` for Bazantic-orchestrated proposals                                |
| `TRY_NOW_CAPABILITY_PROVIDER` | Conditional | `bazantic` when `/app/try` invokes the configured outbound Gateway contract |
| `BAZANTIC_GATEWAY_URL`        | Yes         | Gateway or Recipe endpoint/reference URL                                    |
| `BAZANTIC_RECIPE_ID`          | Yes         | Published Recipe identifier                                                 |
| `BAZANTIC_API_KEY`            | Yes         | Server-only bearer credential                                               |

The inbound Recipe path is `POST /bazantic/proposals` followed by one evaluation and one execution receipt. The outbound provider contract uses the operation envelope documented in [Bazantic](BAZANTIC.md). Do not point an outbound provider back to LATCH’s own inbound Gateway because that would create recursion.

## Research and audit

| Variable                 | Required | Description                           |
| ------------------------ | -------- | ------------------------------------- |
| `TAVILY_API_KEY`         | Research | Server-only Tavily credential         |
| `AUDIT_CONTRACT_ADDRESS` | Yes      | Deployed Sepolia `LatchAudit` address |

The configured API signer must be an authorized recorder on `LatchAudit`.

## Strict integration profile

With `HACKATHON_MODE=true`, startup requires:

- `PLANNER_PROVIDER=gemini` and a Google Cloud credential;
- `POLICY_PROVIDER=chainlink` and a CRE endpoint;
- `CAPABILITY_PROVIDER=recipe` and complete Bazantic configuration;
- a Tavily credential;
- a deployed audit contract;
- Sepolia chain ID `11155111`.

This validation prevents a partially configured runtime from presenting itself as integration-ready.

## Production example

```dotenv
NODE_ENV=production
PORT=4000
WEB_ORIGIN=https://app.example.com
MONGODB_URI=<server-secret>

NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://<browser-rpc>
SEPOLIA_RPC_URL=https://<server-rpc>
SEPOLIA_CHAIN_ID=11155111

PLANNER_PROVIDER=gemini
GOOGLE_CLOUD_API_KEY=<server-secret>
GEMINI_MODEL=gemini-3.7-flash

POLICY_PROVIDER=chainlink
CRE_ENVIRONMENT=<environment>
CRE_POLICY_SECRET_REFERENCE=<secret-reference>
CRE_WORKFLOW_URL=https://<workflow-endpoint>

CAPABILITY_PROVIDER=recipe
BAZANTIC_GATEWAY_URL=https://<gateway-reference>
BAZANTIC_RECIPE_ID=<recipe-id>
BAZANTIC_API_KEY=<server-secret>

TAVILY_API_KEY=<server-secret>
AUDIT_CONTRACT_ADDRESS=0x<40-hex-address>
HACKATHON_MODE=true
```
