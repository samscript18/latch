# Architecture and trust boundaries

LATCH is a policy-enforcement point between an AI worker’s proposed intent and a real capability. The API owns the complete decision sequence; clients and external orchestrators may submit proposals, but they cannot assert identity, approval, price integrity, or execution success.

## System topology

```text
Operator / Bazantic Recipe
          |
          v
   NestJS application API
          |
          +---- Gemini on Vertex AI ---- structured intent only
          |
          +---- Catalog service -------- product identity and price
          |
          +---- ENSv2 / Sepolia -------- authoritative worker identity
          |
          +---- Chainlink CRE ---------- confidential policy verdict
          |
          +---- Capability provider ---- exact authorized execution
          |
          +---- LatchAudit / Sepolia --- public-safe lifecycle evidence
          |
          +---- MongoDB ---------------- tasks, proposals, receipts, index
```

The Next.js application is an operator interface. It never receives provider secrets, signer keys, CRE secrets, policy thresholds, or database credentials.

## Non-bypassable request path

```text
1. Authenticate organization wallet
2. Create immutable task version
3. Produce schema-valid structured intent
4. Resolve an allowlisted capability
5. Obtain provider-owned product/search input
6. Record ActionRequested
7. Resolve fresh ENSv2 identity records
8. Verify wallet, organization, status, role, capability, and policy version
9. Evaluate private policy through Chainlink CRE
10. Record ActionAuthorized or ActionBlocked
11. Execute the exact approved action
12. Record ActionExecuted
13. Persist sanitized activity and execution output
```

`TaskExecutionService` is the only application service that invokes direct capability execution. `BazanticRecipeService` implements the equivalent three-stage Recipe contract: immutable proposal, one-time authorization, and idempotent execution receipt. No public controller accepts an arbitrary `approved` flag.

## Core services

| Service                      | Ownership                                                                  |
| ---------------------------- | -------------------------------------------------------------------------- |
| `TaskPlanner`                | Converts natural language to a strict capability-specific proposal         |
| `CapabilityProvider`         | Supplies provider-owned catalog data and executes authorized procurement   |
| `TavilyResearchProvider`     | Executes authorized research queries and returns source results            |
| `EnsService`                 | Resolves address, resolver, LATCH records, and block context from ENSv2    |
| `EnsAuthorizationService`    | Evaluates identity requirements and produces public-safe denial codes      |
| `AuthorizationOrchestrator`  | Enforces ENS before confidential policy and emits sanitized stage activity |
| `ConfidentialPolicyProvider` | Sends the authorized public proposal to Chainlink CRE                      |
| `TaskExecutionService`       | Owns state transitions, anti-replay, execution, and task serialization     |
| `BazanticRecipeService`      | Owns immutable Recipe proposal digests and execution receipts              |
| `AuditService`               | Verifies and writes public-safe `LatchAudit` events                        |
| `OrganizationsService`       | Owns wallet-scoped organization profile and policy administration          |

## Task state machine

```text
created
  -> planning
  -> capability_resolved
  -> ens_checking
  -> ens_authorized
  -> policy_checking
  -> policy_authorized
  -> executing
  -> succeeded
```

Terminal alternatives are `blocked` and `failed`. State changes are validated centrally; controllers cannot assign states. A task version is claimed atomically from `created` to `planning`, so concurrent or repeated runs conflict instead of executing twice.

`blocked` means an authorization rule produced a safe denial. `failed` means required infrastructure, validation, persistence, audit, or execution could not complete. Both prevent further execution.

## Authority matrix

| Data                                     | Authority                | Cached/persisted copy  | May authorize?             |
| ---------------------------------------- | ------------------------ | ---------------------- | -------------------------- |
| Worker wallet and resolver               | ENSv2                    | Agent snapshot         | ENSv2 only                 |
| Organization, role, status, capabilities | ENSv2 text records       | Agent snapshot         | ENSv2 only                 |
| Policy version                           | ENSv2                    | Proposal/action record | ENSv2 value selects policy |
| Policy rules                             | CRE secret store         | Never stored by LATCH  | CRE only                   |
| Product identity and price               | Catalog/provider         | Immutable proposal     | Provider value only        |
| Natural-language request                 | Operator                 | Task                   | No                         |
| Planned capability                       | Validated planner output | Task                   | Registry must accept it    |
| Execution success                        | Capability receipt       | Action request         | Receipt plus state checks  |

## Confidentiality boundary

Public-safe data includes ENS names, resolved wallets, business-role labels, status, capability identifiers, policy-version identifiers, product data, task identifiers, sanitized verdict codes, transaction hashes, and opaque execution references.

Confidential data includes policy thresholds, allowlists, internal decision logic, API credentials, private keys, CRE secret values, database credentials, and confidential intermediate reasoning. Confidential values must not appear in:

- ENS records;
- MongoDB activities;
- API responses;
- browser state;
- application logs;
- `LatchAudit` events;
- screenshots or evidence artifacts.

## Failure semantics

| Failure                         | Public outcome           | Downstream behavior                         |
| ------------------------------- | ------------------------ | ------------------------------------------- |
| ENS name unresolved             | `ENS_NAME_UNRESOLVED`    | Stop before CRE                             |
| Resolved wallet mismatch        | `ENS_WALLET_MISMATCH`    | Stop before CRE                             |
| Worker status revoked           | `AGENT_REVOKED`          | Stop before CRE                             |
| Role mismatch                   | `ROLE_MISMATCH`          | Stop before CRE                             |
| Capability missing              | `CAPABILITY_MISSING`     | Stop before CRE                             |
| Confidential policy denial      | `POLICY_DENIED`          | Stop before execution                       |
| Capability unavailable          | `CAPABILITY_UNAVAILABLE` | Preserve authorization; report no execution |
| Required infrastructure failure | `EXECUTION_FAILED`       | Fail closed                                 |

Policy denials never expose whether amount, vendor, domain, result count, version, or another private rule caused the decision.

## Replay and probing resistance

- One task action version maps to one authorization identifier.
- Bazantic `recipeInvocationId` values bind idempotently to one proposal digest.
- The digest covers agent, capability, provider product fields, quantity, price, URL, and total.
- One proposal receives one authorization decision.
- A receipt must match the authorized digest.
- An identical receipt is idempotent; a conflicting receipt is rejected.
- A changed amount, vendor, product, query, or quantity requires a new operator-created task.

These constraints prevent an orchestrator from repeatedly modifying a proposal to infer confidential policy boundaries.

## Onchain audit model

`LatchAudit.sol` records four event families:

- `ActionRequested`
- `ActionAuthorized`
- `ActionBlocked`
- `ActionExecuted`

Identifiers and execution references are hashed where appropriate. Events never contain private policy or credentials. When audit recording is required, failure to write the lifecycle event prevents the next sensitive stage.

## Deployment model

The web and API are independently deployable npm workspaces. The API requires persistent MongoDB access and outbound HTTPS/RPC connectivity. The browser needs only the public API URL and Sepolia RPC URL. All signer material and third-party credentials remain in the API environment.

See [Configuration](CONFIGURATION.md), [API](API.md), and [Operations](OPERATIONS.md) for concrete contracts and procedures.
