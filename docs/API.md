# HTTP API

The NestJS API exposes JSON over HTTP and publishes generated OpenAPI documents at `/docs` and `/docs-json`. Unless noted otherwise, protected routes require a wallet-session bearer token.

## Conventions

- Request and response bodies use `application/json`.
- IDs are MongoDB ObjectId strings unless documented as opaque authorization IDs.
- ENS names are normalized to lowercase before lookup.
- Amounts use integer cents; floating-point currency values are not accepted.
- Transactions use `0x`-prefixed hashes.
- Unknown fields are rejected on security-sensitive request bodies.
- Policy failures return public-safe codes and never confidential reasoning.

## Authentication

### Request a challenge

```http
POST /auth/nonce
Content-Type: application/json

{ "address": "0x<organization-admin-address>" }
```

The response contains a one-time nonce and the exact message to sign.

### Verify the signature

```http
POST /auth/verify
Content-Type: application/json

{
  "address": "0x<organization-admin-address>",
  "nonce": "<challenge-nonce>",
  "signature": "0x<signature>"
}
```

The response contains an opaque short-lived token. Send it as:

```http
Authorization: Bearer <wallet-session-token>
```

The token is bound to the verified address. Nonces are single-use and expire.

## Health and readiness

### `GET /health`

Returns service and database health.

### `GET /integrations/status`

Returns public-safe readiness for ENSv2, confidential policy, Bazantic, Tavily, MongoDB, planner, and audit contract. “Configured” means required configuration exists; “connected” requires a successful live check or invocation.

## Organization

All organization routes require wallet-session authentication and are scoped to the verified wallet.

| Method | Route                      | Purpose                                                             |
| ------ | -------------------------- | ------------------------------------------------------------------- |
| `GET`  | `/organization/me`         | Return onboarding state, organization, workers, and policy metadata |
| `POST` | `/organization/me`         | Create the first workspace for a verified owner wallet              |
| `PUT`  | `/organization/me`         | Update an existing workspace and its indexed workers                |
| `PUT`  | `/organization/me/profile` | Update organization profile fields                                  |
| `PUT`  | `/organization/me/policy`  | Configure the organization policy provider and capability policies  |

Creating a second organization for the same owner wallet is rejected. Existing workers are updated by stable IDs; client-only fields are stripped before validation.

## Workers

| Method | Route                     | Purpose                                                      |
| ------ | ------------------------- | ------------------------------------------------------------ |
| `GET`  | `/agents/types`           | Return supported worker templates and required capabilities  |
| `POST` | `/agents`                 | Add a worker to the authenticated organization               |
| `GET`  | `/agents`                 | List workers with fresh ENS-derived status where available   |
| `GET`  | `/agents/:ensName`        | Resolve one worker and return its identity snapshot          |
| `POST` | `/agents/:ensName/revoke` | Write ENS revocation and remove delegated profile permission |

An indexed worker record does not grant authority. Task execution resolves ENS again.

## Tasks

### Create

```http
POST /tasks
Authorization: Bearer <wallet-session-token>
Content-Type: application/json

{
  "agentEnsName": "procurement.organization.eth",
  "prompt": "Buy 2 standard office monitors"
}
```

### Run

```http
POST /tasks/:id/run
Authorization: Bearer <wallet-session-token>
Content-Type: application/json

{}
```

Send `{}` when an HTTP client sets `Content-Type: application/json`; Fastify rejects an empty JSON body. A task version can run once.

### Read and remove

| Method   | Route                 | Purpose                                                       |
| -------- | --------------------- | ------------------------------------------------------------- |
| `GET`    | `/tasks`              | List organization tasks                                       |
| `GET`    | `/tasks/:id`          | Return task, sanitized action, decision, and execution output |
| `GET`    | `/tasks/:id/activity` | Return ordered public-safe authorization events               |
| `DELETE` | `/tasks/:id`          | Hide a terminal task while retaining security evidence        |

Successful procurement actions include a `results` array:

```json
{
  "results": [
    {
      "productId": "provider-product-id",
      "name": "Standard Office Monitor",
      "vendor": "provider-vendor-id",
      "productUrl": "https://merchant.example/products/provider-product-id",
      "quantity": 2,
      "unitPriceCents": 6200,
      "totalAmountCents": 12400,
      "currency": "USD",
      "source": "bazantic-outbound"
    }
  ]
}
```

Successful research actions include validated source results with title, URL, excerpt, score when supplied, and an opaque request reference.

## Authorization

### `POST /authorization/evaluate`

```json
{ "authorizationId": "<persisted-single-use-id>" }
```

The caller supplies only the opaque persisted ID. LATCH loads agent, organization, wallet, capability, vendor, amount, and version from server-owned records. It does not accept caller-supplied authority fields.

A denial response has this public shape:

```json
{
  "authorized": false,
  "stage": "policy",
  "code": "POLICY_DENIED",
  "message": "This action violates organizational policy."
}
```

## Bazantic Recipe API

These routes use a distinct server credential:

```http
Authorization: Bearer <BAZANTIC_API_KEY>
```

| Method | Route                                             | Purpose                                        |
| ------ | ------------------------------------------------- | ---------------------------------------------- |
| `POST` | `/bazantic/proposals`                             | Persist one immutable catalog-derived proposal |
| `POST` | `/bazantic/proposals/:authorizationId/evaluate`   | Evaluate that proposal exactly once            |
| `POST` | `/bazantic/proposals/:authorizationId/executions` | Record the exact approved execution receipt    |

The proposal digest binds invocation ID, agent, capability, product identity, provider URL, vendor, unit price, currency, quantity, and calculated total. See [Bazantic orchestration](BAZANTIC.md) for complete payloads and Recipe rules.

## Error behavior

| HTTP status | Meaning                                                                |
| ----------- | ---------------------------------------------------------------------- |
| `400`       | Invalid schema, malformed ID, or empty JSON body                       |
| `401`       | Missing, expired, or invalid wallet/Bazantic session                   |
| `404`       | Resource is absent or not owned by the authenticated wallet            |
| `409`       | Task/proposal replay, invalid state transition, or conflicting receipt |
| `503`       | Required external integration is unavailable                           |

Provider errors are sanitized. Responses never include API keys, private-policy values, signer material, raw provider bodies, or enclave-internal reasoning.
