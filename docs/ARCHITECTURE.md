# Architecture

LATCH has one non-bypassable task path:

```text
validated user prompt
  -> schema-validated planner proposal
  -> provider-sourced product and price
  -> fresh ENSv2 wallet / organization / status / role / capability check
  -> confidential policy verdict
  -> exact authorized capability execution
  -> persistent public-safe activity
```

The planner is not an authority. MongoDB is not an identity authority. Capability providers cannot be reached from a public execution controller. `TaskExecutionService` claims a task version atomically and is the only service that invokes capability execution.

## Boundaries

- `EnsService` owns fresh Sepolia reads through the configured ENSv2 universal resolver.
- `EnsAuthorizationService` converts those records into a fail-closed authorization decision.
- `AuthorizationOrchestrator` sequences ENS and `ConfidentialPolicyProvider`.
- `TaskExecutionService` owns task state transitions, anti-replay, proposal construction, authorization, execution, and persistence.
- `CapabilityProvider` isolates Bazantic from local deterministic fixtures.
- `TaskPlanner` isolates Gemini structured output through Vertex AI Express Mode from the local development planner.
- `EnsAdminService` owns protected record writes and record-specific EAC delegation.

`HACKATHON_MODE=true` rejects startup unless the planner is Gemini through Vertex AI, policy provider is Chainlink, and capability provider is Bazantic.

## Data boundary

Public/onchain-safe data includes agent ENS names and wallets, assigned business roles and status, capability identifiers, policy-version identifiers, task hashes, sanitized verdicts, and transaction references.

Confidential data includes autonomous-spend thresholds, vendor-selection rules, internal company policy, API credentials, private keys, CRE secrets, and confidential intermediate reasoning. These values do not belong in ENS records, MongoDB activity, browser state, application logs, or `LatchAudit` events.
